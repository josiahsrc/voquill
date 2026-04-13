use anyhow::{Context, Result};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant};

use crate::Env;
use crate::auth::{self, CredsHandle};
use crate::rtdb;

const WATCH_DEADLINE: Duration = Duration::from_secs(60 * 60);
const POLL_INTERVAL: Duration = Duration::from_millis(500);

pub fn voquill_root() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".voquill")
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
            let path = entry.path();
            fs::remove_file(&path).with_context(|| format!("remove {}", path.display()))?;
        }
    }
    Ok(())
}

pub fn build_instructions(session_name: &str, prompt: &str) -> String {
    let dir = workspace_dir(session_name);
    format!(
        "Here is my request:\n\n\
         <request>\n{prompt}\n</request>\n\n\
         ---\n\n\
         This session is relayed to a remote UI. Handle my request as you normally would.\n\n\
         To communicate with me, write plain text files into {dir}/\n\nThe contents become a single agent turn rendered on a mobile device — be extremely brief and direct, no padding or hedging. Use any combination of the following, or none:\n\n\
         - summary.txt — recap of what you did or are proposing. One or two short sentences.\n\
         - review-0.txt, review-1.txt, ... — items for the user to approve or reject, numbered from 0 with no gaps. One short sentence each.\n\
         - question-0.txt, question-1.txt, ... — questions for the user, numbered from 0 with no gaps. One short sentence each.\n\n\
         The UI walks the user through the reviews then the questions in order, then compiles their reply. When you're done writing files, create an empty file named `complete` in the same folder to signal the turn is over. Do not delete files in this folder — the CLI manages cleanup.",
        dir = dir.display(),
        prompt = prompt,
    )
}

pub fn spawn_watcher(
    env: Env,
    creds: CredsHandle,
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
    creds: CredsHandle,
    session_id: String,
    dir: PathBuf,
    cancel: Arc<AtomicBool>,
) -> Result<()> {
    let complete = dir.join("complete");
    let deadline = Instant::now() + WATCH_DEADLINE;

    let set_status = |status: Option<&str>| match auth::ensure_fresh(env, &creds) {
        Ok(fresh) => {
            if let Err(err) = rtdb::set_status(env, &fresh, &session_id, status) {
                eprintln!("\r\nFailed to set status: {err}\r");
            }
        }
        Err(err) => {
            eprintln!("\r\nFailed to refresh credentials: {err}\r");
        }
    };

    set_status(Some("loading"));

    let clear_status = || set_status(None);

    loop {
        if cancel.load(Ordering::Relaxed) {
            clear_status();
            return Ok(());
        }
        if complete.exists() {
            break;
        }
        if Instant::now() >= deadline {
            clear_status();
            return Ok(());
        }
        thread::sleep(POLL_INTERVAL);
    }

    if cancel.load(Ordering::Relaxed) {
        clear_status();
        return Ok(());
    }

    let read_nonempty = |path: &Path| -> Option<String> {
        let raw = fs::read_to_string(path).ok()?;
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    };

    let summary = read_nonempty(&dir.join("summary.txt"));
    let reviews: Vec<String> = indexed_files(&dir, "review-")?
        .iter()
        .filter_map(|p| read_nonempty(p))
        .collect();
    let questions: Vec<String> = indexed_files(&dir, "question-")?
        .iter()
        .filter_map(|p| read_nonempty(p))
        .collect();

    if summary.is_some() || !reviews.is_empty() || !questions.is_empty() {
        let mut entry = json!({
            "type": "assistant",
            "time": now_millis(),
        });
        if let Some(s) = summary {
            entry["summary"] = json!(s);
        }
        if !reviews.is_empty() {
            entry["reviews"] =
                serde_json::Value::Array(reviews.into_iter().map(|m| json!({"message": m})).collect());
        }
        if !questions.is_empty() {
            entry["questions"] =
                serde_json::Value::Array(questions.into_iter().map(|m| json!({"message": m})).collect());
        }
        match auth::ensure_fresh(env, &creds) {
            Ok(fresh) => {
                if let Err(err) = rtdb::append_history_entry(env, &fresh, &session_id, &entry) {
                    eprintln!("\r\nFailed to upload assistant turn: {err}\r");
                }
            }
            Err(err) => {
                eprintln!("\r\nFailed to refresh credentials: {err}\r");
            }
        }
    }

    clear_status();

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
