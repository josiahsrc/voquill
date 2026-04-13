use anyhow::{Context, Result, bail};
use portable_pty::{MasterPty, PtySize, native_pty_system};
use std::io::{Read, Write};
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

use crate::Env;
use crate::auth::{self, CredsHandle};
use crate::credentials;
use crate::platform;
use crate::random_name;
use crate::rtdb;
use crate::server::SessionServer;

type Master = Arc<Mutex<Box<dyn MasterPty + Send>>>;
type SharedWriter = Arc<Mutex<Box<dyn Write + Send>>>;

pub fn run(env: Env, slug: Option<String>, command: Vec<String>) -> Result<()> {
    if command.is_empty() {
        bail!("Missing command. Usage: voquill session <command> [args...]");
    }

    let loaded = credentials::load(env)?
        .ok_or_else(|| anyhow::anyhow!("Not signed in. Run `login` first."))?;
    let handle = auth::handle(loaded);

    let creds = auth::ensure_fresh(env, &handle).context("Failed to refresh credentials")?;

    let name = match slug {
        Some(raw) => {
            let k = random_name::kebab(&raw);
            if k.is_empty() {
                bail!("--slug must contain at least one alphanumeric character");
            }
            k
        }
        None => random_name::name(),
    };
    let session_id = random_name::id();

    rtdb::create_session(env, &creds, &session_id, &name).context("Failed to create session")?;

    let server = SessionServer::start(env, handle.clone(), session_id.clone())
        .context("Failed to start session server")?;

    eprintln!("\x1b[2mSession \"{name}\" started.\x1b[0m");

    let cleanup = SessionCleanup::new(env, handle.clone(), session_id.clone());

    let exit_code = run_pty(&command, env, &handle, &session_id, server)?;

    drop(cleanup);
    eprintln!("\x1b[2mSession \"{name}\" ended.\x1b[0m");
    std::process::exit(exit_code);
}

struct SessionCleanup {
    env: Env,
    creds: CredsHandle,
    session_id: String,
    done: bool,
}

impl SessionCleanup {
    fn new(env: Env, creds: CredsHandle, session_id: String) -> Self {
        Self {
            env,
            creds,
            session_id,
            done: false,
        }
    }
}

impl Drop for SessionCleanup {
    fn drop(&mut self) {
        if self.done {
            return;
        }
        self.done = true;
        match auth::ensure_fresh(self.env, &self.creds) {
            Ok(creds) => {
                if let Err(err) = rtdb::delete_session(self.env, &creds, &self.session_id) {
                    eprintln!("Warning: failed to clean up session: {err}");
                }
            }
            Err(err) => {
                eprintln!("Warning: failed to refresh credentials for cleanup: {err}");
            }
        }
    }
}

fn run_pty(
    command: &[String],
    env: Env,
    creds: &CredsHandle,
    session_id: &str,
    server: Arc<SessionServer>,
) -> Result<i32> {
    let size = platform::terminal_size().unwrap_or(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    });

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(size)
        .map_err(|e| anyhow::anyhow!("failed to open pty: {e}"))?;

    let cmd = platform::build_command(command);
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| anyhow::anyhow!("failed to spawn shell: {e}"))?;
    drop(pair.slave);

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| anyhow::anyhow!("failed to clone pty reader: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| anyhow::anyhow!("failed to take pty writer: {e}"))?;

    let master: Master = Arc::new(Mutex::new(pair.master));
    let writer: SharedWriter = Arc::new(Mutex::new(writer));

    let _raw_mode = platform::RawModeGuard::enable();

    let stop = Arc::new(AtomicBool::new(false));

    {
        let master = master.clone();
        let stop = stop.clone();
        thread::spawn(move || resize_watcher(master, stop, size));
    }

    {
        let writer = writer.clone();
        let creds = creds.clone();
        let session_id = session_id.to_string();
        let server = server.clone();
        let stop = stop.clone();
        thread::spawn(move || {
            paste_listener(env, creds, session_id, server, writer, stop);
        });
    }

    {
        let creds = creds.clone();
        let session_id = session_id.to_string();
        let stop = stop.clone();
        thread::spawn(move || {
            heartbeat(env, creds, session_id, stop);
        });
    }

    let stop_reader = stop.clone();
    let reader_handle = thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        let mut stdout = std::io::stdout();
        loop {
            if stop_reader.load(Ordering::Relaxed) {
                break;
            }
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if stdout.write_all(&buf[..n]).is_err() {
                        break;
                    }
                    let _ = stdout.flush();
                }
                Err(err) if err.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    });

    let stop_writer = stop.clone();
    let writer_for_stdin = writer.clone();
    thread::spawn(move || {
        let mut stdin = std::io::stdin();
        let mut buf = [0u8; 4096];
        loop {
            if stop_writer.load(Ordering::Relaxed) {
                break;
            }
            match stdin.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let mut w = writer_for_stdin.lock().unwrap();
                    if w.write_all(&buf[..n]).is_err() {
                        break;
                    }
                    let _ = w.flush();
                }
                Err(err) if err.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    });

    let exit_code = match child.wait() {
        Ok(status) => status.exit_code() as i32,
        Err(_) => 1,
    };

    stop.store(true, Ordering::Relaxed);
    drop(master);
    let _ = reader_handle.join();

    Ok(exit_code)
}

fn resize_watcher(master: Master, stop: Arc<AtomicBool>, initial: PtySize) {
    let mut last = initial;
    loop {
        if stop.load(Ordering::Relaxed) {
            return;
        }
        thread::sleep(std::time::Duration::from_millis(250));
        if let Some(size) = platform::terminal_size()
            && (size.rows != last.rows || size.cols != last.cols)
        {
            let _ = master.lock().unwrap().resize(size);
            last = size;
        }
    }
}

fn heartbeat(env: Env, creds: CredsHandle, session_id: String, stop: Arc<AtomicBool>) {
    const INTERVAL: std::time::Duration = std::time::Duration::from_secs(60);
    loop {
        if sleep_with_stop(&stop, INTERVAL) {
            return;
        }
        let fresh = match auth::ensure_fresh(env, &creds) {
            Ok(c) => c,
            Err(err) => {
                eprintln!("\r\nHeartbeat: token refresh failed: {err}\r");
                continue;
            }
        };
        if let Err(err) = rtdb::touch_session(env, &fresh, &session_id) {
            eprintln!("\r\nHeartbeat failed: {err}\r");
        }
    }
}

fn paste_listener(
    env: Env,
    creds: CredsHandle,
    session_id: String,
    server: Arc<SessionServer>,
    writer: SharedWriter,
    stop: Arc<AtomicBool>,
) {
    let mut last_ts: i64 = 0;
    let mut backoff_secs: u64 = 1;

    while !stop.load(Ordering::Relaxed) {
        let fresh = match auth::ensure_fresh(env, &creds) {
            Ok(c) => c,
            Err(err) => {
                eprintln!("\r\nPaste listener: token refresh failed: {err}\r");
                if sleep_with_stop(&stop, std::time::Duration::from_secs(backoff_secs)) {
                    return;
                }
                backoff_secs = (backoff_secs * 2).min(30);
                continue;
            }
        };

        match run_stream_once(
            env,
            &creds,
            &fresh,
            &session_id,
            &server,
            &writer,
            &stop,
            &mut last_ts,
        ) {
            StreamOutcome::Stopped => return,
            StreamOutcome::AuthFailed => {
                if let Err(err) = auth::force_refresh(env, &creds) {
                    eprintln!("\r\nPaste listener: token refresh failed: {err}\r");
                    if sleep_with_stop(&stop, std::time::Duration::from_secs(backoff_secs)) {
                        return;
                    }
                    backoff_secs = (backoff_secs * 2).min(30);
                    continue;
                }
                backoff_secs = 1;
            }
            StreamOutcome::Reconnect => {
                if sleep_with_stop(&stop, std::time::Duration::from_secs(backoff_secs)) {
                    return;
                }
                backoff_secs = (backoff_secs * 2).min(30);
            }
            StreamOutcome::Healthy => {
                backoff_secs = 1;
            }
        }
    }
}

enum StreamOutcome {
    Stopped,
    AuthFailed,
    Reconnect,
    Healthy,
}

fn sleep_with_stop(stop: &AtomicBool, total: std::time::Duration) -> bool {
    let start = std::time::Instant::now();
    while start.elapsed() < total {
        if stop.load(Ordering::Relaxed) {
            return true;
        }
        thread::sleep(std::time::Duration::from_millis(100));
    }
    false
}

#[allow(clippy::too_many_arguments)]
fn run_stream_once(
    env: Env,
    creds: &CredsHandle,
    stream_creds: &crate::credentials::Credentials,
    session_id: &str,
    server: &Arc<SessionServer>,
    writer: &SharedWriter,
    stop: &AtomicBool,
    last_ts: &mut i64,
) -> StreamOutcome {
    use std::io::BufRead;

    let response = match rtdb::stream_session(env, stream_creds, session_id) {
        Ok(r) => r,
        Err(err) => {
            let msg = format!("{err:?}");
            if msg.contains("401") || msg.contains("unauthorized") || msg.contains("Auth") {
                return StreamOutcome::AuthFailed;
            }
            return StreamOutcome::Reconnect;
        }
    };

    let reader = std::io::BufReader::new(response);
    let mut event: Option<String> = None;
    let mut current_text: Option<String> = None;
    let mut current_ts: Option<i64> = None;
    let mut saw_data = false;

    for line in reader.lines() {
        if stop.load(Ordering::Relaxed) {
            return StreamOutcome::Stopped;
        }
        let line = match line {
            Ok(l) => l,
            Err(_) => {
                return if saw_data {
                    StreamOutcome::Healthy
                } else {
                    StreamOutcome::Reconnect
                };
            }
        };

        saw_data = true;

        if line == "event: auth_revoked" {
            return StreamOutcome::AuthFailed;
        }
        if let Some(rest) = line.strip_prefix("event: ") {
            event = Some(rest.to_string());
            continue;
        }

        let Some(data) = line.strip_prefix("data: ") else {
            continue;
        };
        let Some(event_name) = event.take() else {
            continue;
        };

        if event_name != "put" && event_name != "patch" {
            continue;
        }

        let parsed: serde_json::Value = match serde_json::from_str(data) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let path = parsed.get("path").and_then(|v| v.as_str()).unwrap_or("/");
        let payload = parsed
            .get("data")
            .cloned()
            .unwrap_or(serde_json::Value::Null);

        apply_update(path, &payload, &mut current_text, &mut current_ts);

        if let (Some(text), Some(ts)) = (current_text.as_deref(), current_ts)
            && ts > *last_ts
        {
            *last_ts = ts;
            handle_paste(env, creds, session_id, server, writer, text);
            current_text = None;
            current_ts = None;
        }
    }

    if saw_data {
        StreamOutcome::Healthy
    } else {
        StreamOutcome::Reconnect
    }
}

fn handle_paste(
    env: Env,
    creds: &CredsHandle,
    session_id: &str,
    server: &SessionServer,
    writer: &SharedWriter,
    text: &str,
) {
    server.begin_turn();

    let augmented = server.build_instructions(text);
    if let Err(err) = write_paste_sequence(writer, &augmented) {
        eprintln!("\r\nFailed to write paste to pty: {err}\r");
    }

    match auth::ensure_fresh(env, creds) {
        Ok(fresh) => {
            if let Err(err) = rtdb::clear_paste(env, &fresh, session_id) {
                eprintln!("\r\nFailed to clear paste in RTDB: {err}\r");
            }
        }
        Err(err) => {
            eprintln!("\r\nFailed to refresh credentials: {err}\r");
        }
    }
}

fn write_paste_sequence(writer: &SharedWriter, text: &str) -> std::io::Result<()> {
    {
        let mut w = writer.lock().unwrap();
        w.write_all(b"\x1b[200~")?;
        w.write_all(text.as_bytes())?;
        w.write_all(b"\x1b[201~")?;
        w.flush()?;
    }
    thread::sleep(std::time::Duration::from_millis(150));
    let mut w = writer.lock().unwrap();
    w.write_all(b"\r")?;
    w.flush()?;
    Ok(())
}

fn apply_update(
    path: &str,
    payload: &serde_json::Value,
    text: &mut Option<String>,
    ts: &mut Option<i64>,
) {
    match path {
        "/" => {
            if payload.is_null() {
                *text = None;
                *ts = None;
            } else {
                *text = payload
                    .get("pasteText")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                *ts = payload.get("pasteTimestamp").and_then(|v| v.as_i64());
            }
        }
        "/pasteText" => {
            *text = payload.as_str().map(str::to_string);
        }
        "/pasteTimestamp" => {
            *ts = payload.as_i64();
        }
        _ => {}
    }
}
