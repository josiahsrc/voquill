use rand::{rngs::OsRng, RngCore};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use serde::Serialize;
use std::{
    collections::HashMap,
    io::{self, Read, Write},
    net::{TcpListener, TcpStream},
    thread::sleep,
    time::{Duration, Instant},
};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::{form_urlencoded, Url};

pub const ENTERPRISE_OIDC_EVENT: &str = "voquill:enterprise-oidc-auth";

const CALLBACK_PATH: &str = "/callback";
const HTTP_SERVER_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOidcPayload {
    pub token: String,
    pub refresh_token: String,
    pub state: String,
    pub auth_id: String,
    pub email: String,
}

pub async fn start_enterprise_oidc_flow(
    app_handle: &AppHandle,
    gateway_url: &str,
    provider_id: &str,
) -> Result<EnterpriseOidcPayload, String> {
    let state = random_string(32);
    let server_state = state.clone();

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|err| format!("Failed to bind OIDC callback listener: {err}"))?;

    let port = listener
        .local_addr()
        .map_err(|err| format!("Unable to read OIDC listener port: {err}"))?
        .port();

    let server_handle = tauri::async_runtime::spawn_blocking(move || {
        run_local_http_server(listener, server_state, HTTP_SERVER_TIMEOUT)
    });

    let auth_url = build_authorize_url(gateway_url, provider_id, port, &state);

    if let Err(err) = app_handle
        .opener()
        .open_url(auth_url, Option::<String>::None)
    {
        eprintln!("Failed to open browser for enterprise OIDC flow: {err}");
    }

    let payload = server_handle
        .await
        .map_err(|err| format!("OIDC listener panicked: {err}"))?
        .map_err(|err| format!("OIDC listener failed: {err}"))?;

    Ok(payload)
}

fn random_string(length: usize) -> String {
    let mut bytes = vec![0u8; length];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn build_authorize_url(gateway_url: &str, provider_id: &str, port: u16, state: &str) -> String {
    let query = form_urlencoded::Serializer::new(String::new())
        .append_pair("provider_id", provider_id)
        .append_pair("local_port", &port.to_string())
        .append_pair("state", state)
        .finish();

    format!("{gateway_url}/auth/oidc/authorize?{query}")
}

fn run_local_http_server(
    listener: TcpListener,
    expected_state: String,
    timeout: Duration,
) -> Result<EnterpriseOidcPayload, String> {
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("OIDC listener configuration failure: {err}"))?;

    let start = Instant::now();
    while Instant::now().duration_since(start) < timeout {
        match listener.accept() {
            Ok((mut stream, _)) => match handle_request(&mut stream, &expected_state) {
                Ok(Some(payload)) => return Ok(payload),
                Ok(None) => continue,
                Err(err) => return Err(err),
            },
            Err(err) if err.kind() == io::ErrorKind::WouldBlock => {
                sleep(Duration::from_millis(50));
                continue;
            }
            Err(err) => return Err(format!("OIDC listener failed: {err}")),
        }
    }

    Err("Timed out waiting for OIDC authentication".to_string())
}

fn handle_request(
    stream: &mut TcpStream,
    expected_state: &str,
) -> Result<Option<EnterpriseOidcPayload>, String> {
    let mut buffer = [0u8; 8192];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|err| format!("Failed to read OIDC callback request: {err}"))?;

    if bytes_read == 0 {
        return Err("Received empty OIDC callback request".to_string());
    }

    let request = std::str::from_utf8(&buffer[..bytes_read])
        .map_err(|err| format!("Invalid OIDC callback payload: {err}"))?;

    let mut lines = request.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Malformed OIDC callback request".to_string())?;

    let mut parts = request_line.split_whitespace();
    let _method = parts
        .next()
        .ok_or_else(|| "Malformed OIDC request line".to_string())?;
    let raw_path = parts
        .next()
        .ok_or_else(|| "Malformed OIDC request line".to_string())?;

    let full_url = format!("http://localhost{raw_path}");
    let parsed = Url::parse(&full_url)
        .map_err(|err| format!("Failed to parse OIDC callback URL: {err}"))?;

    if parsed.path() != CALLBACK_PATH {
        respond(stream, 404, "Not found")?;
        return Ok(None);
    }

    let query: HashMap<_, _> = parsed.query_pairs().into_owned().collect();
    let state = query.get("state").map(|s| s.as_str()).unwrap_or("");
    let token = query.get("token");
    let refresh_token = query.get("refreshToken");
    let auth_id = query.get("authId");
    let email = query.get("email");

    if state != expected_state || token.is_none() || refresh_token.is_none() {
        respond(stream, 400, "Invalid sign-in request")?;
        return Ok(None);
    }

    respond(
        stream,
        200,
        "<html><body><h1>You can close this window.</h1></body></html>",
    )?;

    Ok(Some(EnterpriseOidcPayload {
        token: token.unwrap().clone(),
        refresh_token: refresh_token.unwrap().clone(),
        state: state.to_string(),
        auth_id: auth_id.cloned().unwrap_or_default(),
        email: email.cloned().unwrap_or_default(),
    }))
}

fn respond(stream: &mut TcpStream, status: u16, body: &str) -> Result<(), String> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "OK",
    };

    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Length: {}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{body}",
        body.len(),
    );

    stream
        .write_all(response.as_bytes())
        .map_err(|err| format!("Failed to send OIDC response: {err}"))
}
