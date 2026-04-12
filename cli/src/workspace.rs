use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant};

use crate::Env;
use crate::credentials::Credentials;
use crate::rtdb;

const WATCH_DEADLINE: Duration = Duration::from_secs(60 * 60);
const POLL_INTERVAL: Duration = Duration::from_millis(500);

pub fn voquill_root() -> PathBuf {
    PathBuf::from(".voquill")
}

pub fn workspace_dir(session_name: &str) -> PathBuf {
    voquill_root().join(session_name)
}

pub fn prepare_workspace(session_name: &str) -> Result<PathBuf> {
    let root = voquill_root();
    fs::create_dir_all(&root).with_context(|| format!("create {}", root.display()))?;

    let gi = root.join(".gitignore");
    if !gi.exists() {
        fs::write(&gi, "*\n").with_context(|| format!("write {}", gi.display()))?;
    }

    let dir = root.join(session_name);
    fs::create_dir_all(&dir).with_context(|| format!("create {}", dir.display()))?;
    Ok(dir)
}

pub fn clear_workspace(dir: &Path) -> Result<()> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            let _ = fs::remove_file(entry.path());
        }
    }
    Ok(())
}

pub fn instruction_suffix(session_name: &str) -> String {
    format!(
        "\n\n---\nRules for every turn:\n\
         - Never propose multiple-choice options. Keep everything conversational and open-ended.\n\
         - Do not enter plan mode.\n\
         - Reply naturally, as if we're chatting.\n\n\
         At the end of this turn, write output files into the folder .voquill/{name}/ :\n\n\
         - summary.txt  (REQUIRED) One-line, high-level overview of what you just did. Always write this.\n\
         - review-0.txt, review-1.txt, review-2.txt, ...  (optional) Each file is one thing you want the user to approve or reject. The user will swipe through them one at a time. Only write these when you have something for the user to review.\n\
         - question-0.txt, question-1.txt, question-2.txt, ...  (optional) Each file is ONE open-ended question for the user. No multiple choice. No bundled questions. Only write these when you actually need clarification.\n\n\
         Write only the files you need. summary.txt is the only one that is always required. Number the review and question files starting at 0 with no gaps.\n\n\
         As your very last action, create an empty file named complete in that same folder. The complete file must be written AFTER every other file. This signals the turn is over.\n\n\
         Do not delete anything from .voquill/{name}/ — the CLI manages cleanup. Just write the files and move on.\n\n\
         Do this on every turn.",
        name = session_name,
    )
}

pub fn spawn_watcher(
    env: Env,
    creds: Credentials,
    session_id: String,
    dir: PathBuf,
) -> Arc<AtomicBool> {
    let cancel = Arc::new(AtomicBool::new(false));
    let cancel_clone = cancel.clone();
    thread::spawn(move || {
        if let Err(err) = watch_and_upload(env, creds, session_id, dir, cancel_clone) {
            eprintln!("\r\nAgent watcher error: {err}\r");
        }
    });
    cancel
}

fn watch_and_upload(
    env: Env,
    creds: Credentials,
    session_id: String,
    dir: PathBuf,
    cancel: Arc<AtomicBool>,
) -> Result<()> {
    let complete = dir.join("complete");
    let deadline = Instant::now() + WATCH_DEADLINE;

    loop {
        if cancel.load(Ordering::Relaxed) {
            return Ok(());
        }
        if complete.exists() {
            break;
        }
        if Instant::now() >= deadline {
            return Ok(());
        }
        thread::sleep(POLL_INTERVAL);
    }

    let base_time = now_millis();
    let mut offset: i64 = 0;
    let mut upload = |role: &str, path: &Path| {
        let Ok(raw) = fs::read_to_string(path) else {
            return;
        };
        let message = raw.trim();
        if message.is_empty() {
            return;
        }
        let time = base_time + offset;
        offset += 1;
        if let Err(err) = rtdb::append_history_entry(env, &creds, &session_id, role, time, message)
        {
            eprintln!("\r\nFailed to upload {role}: {err}\r");
        }
    };

    let summary = dir.join("summary.txt");
    if summary.exists() {
        upload("summary", &summary);
    }
    for path in indexed_files(&dir, "review-")? {
        upload("review", &path);
    }
    for path in indexed_files(&dir, "question-")? {
        upload("question", &path);
    }

    Ok(())
}

fn indexed_files(dir: &Path, prefix: &str) -> Result<Vec<PathBuf>> {
    let mut entries: Vec<(u32, PathBuf)> = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if let Some(rest) = name_str.strip_prefix(prefix)
            && let Some(stem) = rest.strip_suffix(".txt")
            && let Ok(n) = stem.parse::<u32>()
        {
            entries.push((n, entry.path()));
        }
    }
    entries.sort_by_key(|(n, _)| *n);
    Ok(entries.into_iter().map(|(_, p)| p).collect())
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
