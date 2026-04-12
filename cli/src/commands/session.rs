use anyhow::{Context, Result, bail};
use std::ffi::CString;
use std::io::{Read, Write};
use std::os::unix::io::{AsRawFd, RawFd};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

use pty::fork::Fork;

use crate::Env;
use crate::credentials::{self, Credentials};
use crate::random_name;
use crate::rtdb;

pub fn run(env: Env, command: Vec<String>) -> Result<()> {
    if command.is_empty() {
        bail!("Missing command. Usage: voquill session <command> [args...]");
    }

    let creds = credentials::load(env)?
        .ok_or_else(|| anyhow::anyhow!("Not signed in. Run `login` first."))?;

    let name = random_name::name();
    let session_id = random_name::id();

    rtdb::create_session(env, &creds, &session_id, &name).context("Failed to create session")?;

    eprintln!("\x1b[2mSession \"{name}\" started.\x1b[0m");

    let cleanup = SessionCleanup::new(env, creds.clone(), session_id.clone());

    let exit_code = run_pty(&command, env, &creds, &session_id)?;

    drop(cleanup);
    eprintln!("\x1b[2mSession \"{name}\" ended.\x1b[0m");
    std::process::exit(exit_code);
}

struct SessionCleanup {
    env: Env,
    creds: Credentials,
    session_id: String,
    done: bool,
}

impl SessionCleanup {
    fn new(env: Env, creds: Credentials, session_id: String) -> Self {
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
        if let Err(err) = rtdb::delete_session(self.env, &self.creds, &self.session_id) {
            eprintln!("Warning: failed to clean up session: {err}");
        }
    }
}

fn run_pty(command: &[String], env: Env, creds: &Credentials, session_id: &str) -> Result<i32> {
    let fork = Fork::from_ptmx().map_err(|err| anyhow::anyhow!("Failed to open pty: {err:?}"))?;

    match fork {
        Fork::Child(_) => exec_child(command),
        Fork::Parent(pid, master) => parent_loop(master, pid, env, creds, session_id),
    }
}

fn exec_child(command: &[String]) -> ! {
    let program = CString::new(command[0].clone()).expect("command contains interior null byte");
    let args: Vec<CString> = command
        .iter()
        .map(|arg| CString::new(arg.clone()).expect("argument contains interior null byte"))
        .collect();
    let mut argv: Vec<*const libc::c_char> = args.iter().map(|a| a.as_ptr()).collect();
    argv.push(std::ptr::null());

    unsafe {
        libc::execvp(program.as_ptr(), argv.as_ptr());
    }

    let err = std::io::Error::last_os_error();
    eprintln!("Failed to exec {}: {err}", command[0]);
    std::process::exit(127);
}

fn parent_loop(
    master: pty::fork::Master,
    pid: libc::pid_t,
    env: Env,
    creds: &Credentials,
    session_id: &str,
) -> Result<i32> {
    let stdin_fd = std::io::stdin().as_raw_fd();
    let stdout_fd = std::io::stdout().as_raw_fd();

    propagate_winsize(stdout_fd, master.as_raw_fd());

    let orig_termios = enable_raw_mode(stdin_fd);

    let stop = Arc::new(AtomicBool::new(false));
    let master_fd = master.as_raw_fd();

    let listener_creds = creds.clone();
    let listener_session_id = session_id.to_string();
    let listener_stop = stop.clone();
    thread::spawn(move || {
        if let Err(err) = paste_listener(
            env,
            &listener_creds,
            &listener_session_id,
            master_fd,
            &listener_stop,
        ) {
            eprintln!("\r\nPaste listener stopped: {err}\r");
        }
    });

    let stop_reader = stop.clone();
    let reader = thread::spawn(move || {
        let mut m = master;
        let mut buf = [0u8; 4096];
        let mut stdout = std::io::stdout();
        loop {
            if stop_reader.load(Ordering::Relaxed) {
                break;
            }
            match m.read(&mut buf) {
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

fn propagate_winsize(src_fd: RawFd, dst_fd: RawFd) {
    unsafe {
        let mut ws: libc::winsize = std::mem::zeroed();
        if libc::ioctl(src_fd, libc::TIOCGWINSZ, &mut ws) == 0 {
            libc::ioctl(dst_fd, libc::TIOCSWINSZ, &ws);
        }
    }
}

fn paste_listener(
    env: Env,
    creds: &Credentials,
    session_id: &str,
    master_fd: RawFd,
    stop: &AtomicBool,
) -> Result<()> {
    use std::io::BufRead;

    let response = rtdb::stream_session(env, creds, session_id)?;
    let reader = std::io::BufReader::new(response);

    let mut event: Option<String> = None;
    let mut last_ts: i64 = 0;
    let mut current_text: Option<String> = None;
    let mut current_ts: Option<i64> = None;

    for line in reader.lines() {
        if stop.load(Ordering::Relaxed) {
            break;
        }
        let line = line.context("Failed to read RTDB stream")?;

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
            && ts > last_ts
        {
            last_ts = ts;
            if let Err(err) = write_all_fd(master_fd, text.as_bytes())
                .and_then(|()| write_all_fd(master_fd, b"\r"))
            {
                eprintln!("\r\nFailed to write paste to pty: {err}\r");
            }
            current_text = None;
            current_ts = None;
            if let Err(err) = rtdb::clear_paste(env, creds, session_id) {
                eprintln!("\r\nFailed to clear paste in RTDB: {err}\r");
            }
        }
    }

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
