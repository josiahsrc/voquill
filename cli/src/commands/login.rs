use anyhow::{Context, Result, anyhow, bail};
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use rand::{RngCore, rngs::OsRng};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};
use url::Url;

use crate::Env;
use crate::credentials::{self, Credentials};

const LISTENER_TIMEOUT: Duration = Duration::from_secs(300);
const CALLBACK_PATH: &str = "/callback";

pub fn run(env: Env, site_override: Option<String>) -> Result<()> {
    let state = random_state();
    let listener =
        TcpListener::bind(("127.0.0.1", 0)).context("Failed to bind local HTTP server")?;
    let port = listener.local_addr()?.port();

    let site = site_override.unwrap_or_else(|| env.default_site().to_string());
    let authorize_url = build_authorize_url(&site, port, &state, env)?;

    println!("Opening browser to sign in…");
    println!("If it doesn't open, visit:\n  {authorize_url}");

    if let Err(err) = webbrowser::open(&authorize_url) {
        eprintln!("Could not open browser automatically: {err}");
    }

    let params = wait_for_callback(listener, &state, LISTENER_TIMEOUT)?;

    let credentials = Credentials {
        id_token: take_required(&params, "idToken")?,
        refresh_token: take_required(&params, "refreshToken")?,
        expires_at: take_required(&params, "expiresAt")?
            .parse()
            .context("Invalid expiresAt value")?,
        uid: take_required(&params, "uid")?,
        email: params.get("email").cloned(),
    };

    let path = credentials::save(env, &credentials)?;

    match &credentials.email {
        Some(email) => println!("Signed in as {email}."),
        None => println!("Signed in."),
    }
    println!("Credentials saved to {}", path.display());
    Ok(())
}

fn random_state() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn build_authorize_url(site: &str, port: u16, state: &str, env: Env) -> Result<String> {
    let mut url = Url::parse(site).with_context(|| format!("Invalid site URL: {site}"))?;
    url.set_path("/authorize");
    {
        let mut pairs = url.query_pairs_mut();
        pairs
            .append_pair("port", &port.to_string())
            .append_pair("state", state);
        if !matches!(env, Env::Prod) {
            pairs.append_pair("env", env.as_str());
        }
    }
    Ok(url.to_string())
}

fn wait_for_callback(
    listener: TcpListener,
    expected_state: &str,
    timeout: Duration,
) -> Result<HashMap<String, String>> {
    listener.set_nonblocking(true)?;
    let start = Instant::now();

    loop {
        if Instant::now().duration_since(start) >= timeout {
            bail!("Timed out waiting for sign-in");
        }

        match listener.accept() {
            Ok((mut stream, _)) => match handle_request(&mut stream, expected_state)? {
                Some(params) => return Ok(params),
                None => continue,
            },
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(err) => bail!("Local HTTP server error: {err}"),
        }
    }
}

fn handle_request(
    stream: &mut TcpStream,
    expected_state: &str,
) -> Result<Option<HashMap<String, String>>> {
    let mut buffer = [0u8; 8192];
    let bytes_read = stream.read(&mut buffer)?;
    if bytes_read == 0 {
        return Ok(None);
    }

    let request = std::str::from_utf8(&buffer[..bytes_read]).context("Invalid request encoding")?;

    let request_line = request
        .split("\r\n")
        .next()
        .ok_or_else(|| anyhow!("Malformed request"))?;
    let raw_path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| anyhow!("Malformed request line"))?;

    let parsed = Url::parse(&format!("http://localhost{raw_path}"))
        .context("Failed to parse request URL")?;

    if parsed.path() != CALLBACK_PATH {
        respond(stream, 404, "Not Found", "Not found")?;
        return Ok(None);
    }

    let params: HashMap<String, String> = parsed.query_pairs().into_owned().collect();

    match params.get("state") {
        Some(value) if value == expected_state => {}
        _ => {
            respond(stream, 400, "Bad Request", SIGNIN_FAILED_HTML)?;
            bail!("State mismatch in sign-in callback");
        }
    }

    if !params.contains_key("idToken") || !params.contains_key("refreshToken") {
        respond(stream, 400, "Bad Request", SIGNIN_FAILED_HTML)?;
        bail!("Sign-in callback missing required fields");
    }

    respond(stream, 200, "OK", SIGNIN_SUCCESS_HTML)?;
    Ok(Some(params))
}

fn respond(stream: &mut TcpStream, status: u16, reason: &str, body: &str) -> Result<()> {
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes())?;
    Ok(())
}

fn take_required(params: &HashMap<String, String>, key: &str) -> Result<String> {
    params
        .get(key)
        .cloned()
        .ok_or_else(|| anyhow!("Sign-in callback missing `{key}`"))
}

const SIGNIN_SUCCESS_HTML: &str = r#"<!doctype html>
<html><head><meta charset="utf-8"><title>Voquill CLI</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}main{text-align:center;padding:32px}</style>
</head><body><main><h1>You're signed in.</h1><p>You can close this tab and return to the CLI.</p></main></body></html>"#;

const SIGNIN_FAILED_HTML: &str = r#"<!doctype html>
<html><head><meta charset="utf-8"><title>Voquill CLI</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}main{text-align:center;padding:32px}</style>
</head><body><main><h1>Sign-in failed.</h1><p>Please return to the CLI and try again.</p></main></body></html>"#;
