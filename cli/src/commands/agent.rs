use anyhow::{Context, Result, bail};
use std::ffi::CString;
use std::io::{Read, Write};
use std::os::unix::io::{AsRawFd, RawFd};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};
use std::thread;

use crate::Env;
use crate::auth;
use crate::credentials::{self, Credentials};
use crate::random_name;
use crate::rtdb;
use crate::workspace;
use std::sync::Mutex;

pub fn run(env: Env, command: Vec<String>) -> Result<()> {
    if command.is_empty() {
        bail!("Missing command. Usage: voquill session <command> [args...]");
    }

    let mut creds = credentials::load(env)?
        .ok_or_else(|| anyhow::anyhow!("Not signed in. Run `login` first."))?;

    if auth::needs_refresh(&creds) {
        auth::refresh(env, &mut creds).context("Failed to refresh credentials")?;
    }

    let name = random_name::name();
    let session_id = random_name::id();

    rtdb::create_session(env, &creds, &session_id, &name).context("Failed to create session")?;

    workspace::prepare_workspace(&name).context("Failed to prepare workspace")?;

    eprintln!("\x1b[2mSession \"{name}\" started.\x1b[0m");

    let cleanup = SessionCleanup::new(env, creds.clone(), session_id.clone(), name.clone());

    let exit_code = run_pty(&command, env, &creds, &session_id, &name)?;

    drop(cleanup);
    eprintln!("\x1b[2mSession \"{name}\" ended.\x1b[0m");
    std::process::exit(exit_code);
}

struct SessionCleanup {
    env: Env,
    creds: Credentials,
    session_id: String,
    session_name: String,
    done: bool,
}

impl SessionCleanup {
    fn new(env: Env, creds: Credentials, session_id: String, session_name: String) -> Self {
        Self {
            env,
            creds,
            session_id,
            session_name,
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
        if let Err(err) = rtdb::delete_session(self.env, &self.creds, &self.session_id) {
            eprintln!("Warning: failed to clean up session: {err}");
        }
        let dir = workspace::workspace_dir(&self.session_name);
        if dir.exists()
            && let Err(err) = std::fs::remove_dir_all(&dir)
        {
            eprintln!("Warning: failed to remove {}: {err}", dir.display());
        }
    }
}

fn run_pty(
    command: &[String],
    env: Env,
    creds: &Credentials,
    session_id: &str,
    session_name: &str,
) -> Result<i32> {
    let stdin_fd = std::io::stdin().as_raw_fd();
    let stdout_fd = std::io::stdout().as_raw_fd();

    let termios = get_termios(stdin_fd);
    let winsize = get_winsize(stdout_fd);

    let mut master_fd: libc::c_int = -1;
    let pid = unsafe { fork_pty(&mut master_fd, termios.as_ref(), winsize.as_ref()) };

    if pid < 0 {
        let err = std::io::Error::last_os_error();
        bail!("forkpty failed: {err}");
    }

    if pid == 0 {
        exec_child(command);
    }

    parent_loop(
        master_fd,
        stdin_fd,
        stdout_fd,
        pid,
        env,
        creds,
        session_id,
        session_name,
    )
}

unsafe fn fork_pty(
    amaster: *mut libc::c_int,
    termp: Option<&libc::termios>,
    winp: Option<&libc::winsize>,
) -> libc::pid_t {
    let termp_ptr = termp
        .map(|t| t as *const libc::termios)
        .unwrap_or(std::ptr::null());
    let winp_ptr = winp
        .map(|w| w as *const libc::winsize)
        .unwrap_or(std::ptr::null());

    #[cfg(any(target_os = "macos", target_os = "ios"))]
    unsafe {
        libc::forkpty(
            amaster,
            std::ptr::null_mut(),
            termp_ptr as *mut libc::termios,
            winp_ptr as *mut libc::winsize,
        )
    }

    #[cfg(not(any(target_os = "macos", target_os = "ios")))]
    unsafe {
        libc::forkpty(amaster, std::ptr::null_mut(), termp_ptr, winp_ptr)
    }
}

fn get_winsize(fd: RawFd) -> Option<libc::winsize> {
    unsafe {
        let mut ws: libc::winsize = std::mem::zeroed();
        if libc::ioctl(fd, libc::TIOCGWINSZ, &mut ws) == 0 {
            Some(ws)
        } else {
            None
        }
    }
}

fn get_termios(fd: RawFd) -> Option<libc::termios> {
    unsafe {
        let mut t: libc::termios = std::mem::zeroed();
        if libc::tcgetattr(fd, &mut t) == 0 {
            Some(t)
        } else {
            None
        }
    }
}

fn exec_child(command: &[String]) -> ! {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let joined = command
        .iter()
        .map(|arg| shell_quote(arg))
        .collect::<Vec<_>>()
        .join(" ");

    let program = CString::new(shell.clone()).expect("SHELL contains interior null byte");
    let flag = CString::new("-ic").unwrap();
    let cmd = CString::new(joined).expect("command contains interior null byte");
    let argv: [*const libc::c_char; 4] = [
        program.as_ptr(),
        flag.as_ptr(),
        cmd.as_ptr(),
        std::ptr::null(),
    ];

    unsafe {
        libc::execvp(program.as_ptr(), argv.as_ptr());
    }

    let err = std::io::Error::last_os_error();
    eprintln!("Failed to exec {shell}: {err}");
    std::process::exit(127);
}

fn shell_quote(arg: &str) -> String {
    if !arg.is_empty()
        && arg
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.' | b'/' | b':' | b'=' | b',' | b'@' | b'+'))
    {
        return arg.to_string();
    }
    let escaped = arg.replace('\'', "'\\''");
    format!("'{escaped}'")
}

#[allow(clippy::too_many_arguments)]
fn parent_loop(
    master_fd: RawFd,
    stdin_fd: RawFd,
    stdout_fd: RawFd,
    pid: libc::pid_t,
    env: Env,
    creds: &Credentials,
    session_id: &str,
    session_name: &str,
) -> Result<i32> {
    install_sigwinch_handler(stdout_fd, master_fd);

    let orig_termios = enable_raw_mode(stdin_fd);

    let stop = Arc::new(AtomicBool::new(false));

    let listener_creds = creds.clone();
    let listener_session_id = session_id.to_string();
    let listener_session_name = session_name.to_string();
    let listener_stop = stop.clone();
    thread::spawn(move || {
        paste_listener(
            env,
            listener_creds,
            listener_session_id,
            listener_session_name,
            master_fd,
            listener_stop,
        );
    });

    let heartbeat_session_id = session_id.to_string();
    let heartbeat_stop = stop.clone();
    thread::spawn(move || {
        heartbeat(env, heartbeat_session_id, heartbeat_stop);
    });

    let stop_reader = stop.clone();
    let reader = thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut stdout = std::io::stdout();
        loop {
            if stop_reader.load(Ordering::Relaxed) {
                break;
            }
            let n = unsafe {
                libc::read(
                    master_fd,
                    buf.as_mut_ptr() as *mut libc::c_void,
                    buf.len(),
                )
            };
            if n > 0 {
                let slice = &buf[..n as usize];
                if stdout.write_all(slice).is_err() {
                    break;
                }
                let _ = stdout.flush();
            } else if n == 0 {
                break;
            } else {
                let err = std::io::Error::last_os_error();
                if err.kind() == std::io::ErrorKind::Interrupted {
                    continue;
                }
                break;
            }
        }
    });

    let stop_writer = stop.clone();
    let writer = thread::spawn(move || {
        let mut stdin = std::io::stdin();
        let mut buf = [0u8; 4096];
        loop {
            if stop_writer.load(Ordering::Relaxed) {
                break;
            }
            match stdin.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let mut written = 0;
                    while written < n {
                        let r = unsafe {
                            libc::write(
                                master_fd,
                                buf[written..n].as_ptr() as *const libc::c_void,
                                n - written,
                            )
                        };
                        if r <= 0 {
                            return;
                        }
                        written += r as usize;
                    }
                }
                Err(err) if err.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    });

    let exit_code = wait_for_child(pid);

    stop.store(true, Ordering::Relaxed);
    unsafe {
        libc::close(master_fd);
    }

    let _ = reader.join();
    drop(writer);

    if let Some(orig) = orig_termios {
        restore_termios(stdin_fd, &orig);
    }

    Ok(exit_code)
}

fn wait_for_child(pid: libc::pid_t) -> i32 {
    let mut status: libc::c_int = 0;
    unsafe {
        loop {
            let r = libc::waitpid(pid, &mut status, 0);
            if r == -1 {
                let err = std::io::Error::last_os_error();
                if err.kind() == std::io::ErrorKind::Interrupted {
                    continue;
                }
                return 1;
            }
            break;
        }
    }

    if libc::WIFEXITED(status) {
        libc::WEXITSTATUS(status)
    } else if libc::WIFSIGNALED(status) {
        128 + libc::WTERMSIG(status)
    } else {
        1
    }
}

fn enable_raw_mode(fd: RawFd) -> Option<libc::termios> {
    unsafe {
        let mut orig: libc::termios = std::mem::zeroed();
        if libc::tcgetattr(fd, &mut orig) != 0 {
            return None;
        }
        let mut raw = orig;
        libc::cfmakeraw(&mut raw);
        if libc::tcsetattr(fd, libc::TCSANOW, &raw) != 0 {
            return None;
        }
        Some(orig)
    }
}

fn restore_termios(fd: RawFd, orig: &libc::termios) {
    unsafe {
        libc::tcsetattr(fd, libc::TCSANOW, orig);
    }
}

static WINCH_SRC_FD: AtomicI32 = AtomicI32::new(-1);
static WINCH_DST_FD: AtomicI32 = AtomicI32::new(-1);

extern "C" fn handle_sigwinch(_: libc::c_int) {
    let src = WINCH_SRC_FD.load(Ordering::Relaxed);
    let dst = WINCH_DST_FD.load(Ordering::Relaxed);
    if src < 0 || dst < 0 {
        return;
    }
    unsafe {
        let mut ws: libc::winsize = std::mem::zeroed();
        if libc::ioctl(src, libc::TIOCGWINSZ, &mut ws) == 0 {
            libc::ioctl(dst, libc::TIOCSWINSZ, &ws);
        }
    }
}

fn install_sigwinch_handler(src_fd: RawFd, dst_fd: RawFd) {
    WINCH_SRC_FD.store(src_fd, Ordering::Relaxed);
    WINCH_DST_FD.store(dst_fd, Ordering::Relaxed);
    unsafe {
        let mut sa: libc::sigaction = std::mem::zeroed();
        sa.sa_sigaction = handle_sigwinch as usize;
        libc::sigemptyset(&mut sa.sa_mask);
        sa.sa_flags = libc::SA_RESTART;
        libc::sigaction(libc::SIGWINCH, &sa, std::ptr::null_mut());
    }
}

fn heartbeat(env: Env, session_id: String, stop: Arc<AtomicBool>) {
    const INTERVAL: std::time::Duration = std::time::Duration::from_secs(60);
    loop {
        if sleep_with_stop(&stop, INTERVAL) {
            return;
        }
        let Ok(Some(creds)) = credentials::load(env) else {
            continue;
        };
        if let Err(err) = rtdb::touch_session(env, &creds, &session_id) {
            eprintln!("\r\nHeartbeat failed: {err}\r");
        }
    }
}

fn paste_listener(
    env: Env,
    mut creds: Credentials,
    session_id: String,
    session_name: String,
    master_fd: RawFd,
    stop: Arc<AtomicBool>,
) {
    let mut last_ts: i64 = 0;
    let mut backoff_secs: u64 = 1;
    let active_watcher: Mutex<Option<Arc<AtomicBool>>> = Mutex::new(None);

    while !stop.load(Ordering::Relaxed) {
        if auth::needs_refresh(&creds)
            && let Err(err) = auth::refresh(env, &mut creds)
        {
            eprintln!("\r\nPaste listener: token refresh failed: {err}\r");
            if sleep_with_stop(&stop, std::time::Duration::from_secs(backoff_secs)) {
                return;
            }
            backoff_secs = (backoff_secs * 2).min(30);
            continue;
        }

        match run_stream_once(
            env,
            &creds,
            &session_id,
            &session_name,
            master_fd,
            &stop,
            &mut last_ts,
            &active_watcher,
        ) {
            StreamOutcome::Stopped => return,
            StreamOutcome::AuthFailed => {
                if let Err(err) = auth::refresh(env, &mut creds) {
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
    creds: &Credentials,
    session_id: &str,
    session_name: &str,
    master_fd: RawFd,
    stop: &AtomicBool,
    last_ts: &mut i64,
    active_watcher: &Mutex<Option<Arc<AtomicBool>>>,
) -> StreamOutcome {
    use std::io::BufRead;

    let response = match rtdb::stream_session(env, creds, session_id) {
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
            handle_paste(
                env,
                creds,
                session_id,
                session_name,
                master_fd,
                text,
                active_watcher,
            );
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
    creds: &Credentials,
    session_id: &str,
    session_name: &str,
    master_fd: RawFd,
    text: &str,
    active_watcher: &Mutex<Option<Arc<AtomicBool>>>,
) {
    if let Some(prev) = active_watcher.lock().unwrap().take() {
        prev.store(true, Ordering::Relaxed);
    }

    let dir = workspace::workspace_dir(session_name);
    if let Err(err) = workspace::prepare_workspace(session_name) {
        eprintln!("\r\nFailed to prepare workspace: {err}\r");
    }
    if let Err(err) = workspace::clear_workspace(&dir) {
        eprintln!("\r\nFailed to clear workspace: {err}\r");
    }

    let augmented = workspace::build_instructions(session_name, text);
    if let Err(err) = write_paste_sequence(master_fd, &augmented) {
        eprintln!("\r\nFailed to write paste to pty: {err}\r");
    }

    if let Err(err) = rtdb::clear_paste(env, creds, session_id) {
        eprintln!("\r\nFailed to clear paste in RTDB: {err}\r");
    }

    let cancel = workspace::spawn_watcher(env, creds.clone(), session_id.to_string(), dir);
    *active_watcher.lock().unwrap() = Some(cancel);
}

fn write_paste_sequence(master_fd: RawFd, text: &str) -> std::io::Result<()> {
    write_all_fd(master_fd, b"\x1b[200~")?;
    write_all_fd(master_fd, text.as_bytes())?;
    write_all_fd(master_fd, b"\x1b[201~")?;
    thread::sleep(std::time::Duration::from_millis(150));
    write_all_fd(master_fd, b"\r")?;
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

fn write_all_fd(fd: RawFd, mut buf: &[u8]) -> std::io::Result<()> {
    while !buf.is_empty() {
        let n = unsafe { libc::write(fd, buf.as_ptr() as *const libc::c_void, buf.len()) };
        if n < 0 {
            let err = std::io::Error::last_os_error();
            if err.kind() == std::io::ErrorKind::Interrupted {
                continue;
            }
            return Err(err);
        }
        if n == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::WriteZero,
                "pty write returned 0",
            ));
        }
        buf = &buf[n as usize..];
    }
    Ok(())
}
