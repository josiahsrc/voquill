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

pub fn instruction_prefix(session_name: &str) -> String {
    format!(
        "This session is relayed to a remote UI. Handle the user's prompt below however you normally would.\n\n\
         To send content back to the UI, write plain text files into .voquill/{name}/ . Each file's contents become one message surfaced in the UI. Use whichever of the following file types fit what you want to communicate this turn — any combination, or none:\n\n\
         - summary.txt — a recap of what you did, found, or are proposing.\n\
         - review-0.txt, review-1.txt, ... — items for the user to approve or reject, one per file, numbered from 0 with no gaps.\n\
         - question-0.txt, question-1.txt, ... — questions for the user, one per file, numbered from 0 with no gaps.\n\n\
         Decide what (if anything) to write based on what's actually useful for this turn. When you're done writing files, create an empty file named `complete` in the same folder to signal the turn is over. Do not delete files in this folder — the CLI manages cleanup.\n\n\
         ---\n\n\
         User prompt:\n\n",
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
