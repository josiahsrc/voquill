use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::{rngs::OsRng, RngCore};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
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

use crate::state::microsoft_oauth::MicrosoftOAuthConfig;

pub const MICROSOFT_AUTH_EVENT: &str = "voquill:microsoft-auth";

const AUTHORIZATION_URL: &str = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL: &str = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const CALLBACK_PATH: &str = "/callback";
const HTTP_SERVER_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MicrosoftAuthEventPayload {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
}

pub struct MicrosoftAuthFlowResult {
    pub payload: MicrosoftAuthEventPayload,
}

pub async fn start_microsoft_oauth(
    app_handle: &AppHandle,
    config: &MicrosoftOAuthConfig,
    scopes: &str,
) -> Result<MicrosoftAuthFlowResult, String> {
    let code_verifier = generate_code_verifier();
    let code_challenge = compute_code_challenge(&code_verifier);
    let state = random_string(32);
    let server_state = state.clone();

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|err| format!("Failed to bind OAuth callback listener: {err}"))?;

    let port = listener
        .local_addr()
        .map_err(|err| format!("Unable to read OAuth listener port: {err}"))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{port}{CALLBACK_PATH}");

    let server_handle = tauri::async_runtime::spawn_blocking(move || {
        run_local_http_server(listener, server_state, HTTP_SERVER_TIMEOUT)
    });

    let auth_url = build_authorization_url(
        &config.client_id,
        &redirect_uri,
        &code_challenge,
        &state,
        scopes,
    );

    if let Err(err) = app_handle
        .opener()
        .open_url(auth_url, Option::<String>::None)
    {
        eprintln!("Failed to open browser for Microsoft OAuth flow: {err}");
    }

    let authorization_code = server_handle
        .await
        .map_err(|err| format!("OAuth listener panicked: {err}"))?
        .map_err(|err| format!("OAuth listener failed: {err}"))?;

    let client = Client::builder()
        .user_agent("voquill-desktop")
        .build()
        .map_err(|err| format!("Failed to build HTTP client: {err}"))?;

    let token_response = exchange_code_for_tokens(
        &client,
        config,
        &authorization_code,
        &code_verifier,
        &redirect_uri,
        scopes,
    )
    .await?;

    let payload = MicrosoftAuthEventPayload {
        access_token: token_response.access_token.clone(),
        refresh_token: token_response.refresh_token.clone(),
        expires_in: token_response.expires_in,
        token_type: token_response.token_type.clone(),
    };

    Ok(MicrosoftAuthFlowResult { payload })
}

pub async fn refresh_microsoft_token(
    config: &MicrosoftOAuthConfig,
    refresh_token: &str,
    scopes: &str,
) -> Result<MicrosoftAuthEventPayload, String> {
    let client = Client::builder()
        .user_agent("voquill-desktop")
        .build()
        .map_err(|err| format!("Failed to build HTTP client: {err}"))?;

    let response = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", config.client_id.as_str()),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("scope", scopes),
        ])
        .send()
        .await
        .map_err(|err| format!("Failed to refresh Microsoft token: {err}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Microsoft token refresh failed with status {}: {}",
            status, body
        ));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .map_err(|err| format!("Failed to decode Microsoft token response: {err}"))?;

    Ok(MicrosoftAuthEventPayload {
        access_token: token_response.access_token,
        refresh_token: token_response.refresh_token,
        expires_in: token_response.expires_in,
        token_type: token_response.token_type,
    })
}

fn generate_code_verifier() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn compute_code_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn random_string(length: usize) -> String {
    let mut bytes = vec![0u8; length];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn build_authorization_url(
    client_id: &str,
    redirect_uri: &str,
    code_challenge: &str,
    state: &str,
    scopes: &str,
) -> String {
    let query = form_urlencoded::Serializer::new(String::new())
        .append_pair("response_type", "code")
        .append_pair("client_id", client_id)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("scope", scopes)
        .append_pair("code_challenge", code_challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", state)
        .append_pair("response_mode", "query")
        .finish();

    format!("{AUTHORIZATION_URL}?{query}")
}

fn run_local_http_server(
    listener: TcpListener,
    expected_state: String,
    timeout: Duration,
) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("OAuth listener configuration failure: {err}"))?;

    let start = Instant::now();
    while Instant::now().duration_since(start) < timeout {
        match listener.accept() {
            Ok((mut stream, _)) => match handle_request(&mut stream, &expected_state) {
                Ok(Some(code)) => return Ok(code),
                Ok(None) => continue,
                Err(err) => return Err(err),
            },
            Err(err) if err.kind() == io::ErrorKind::WouldBlock => {
                sleep(Duration::from_millis(50));
                continue;
            }
            Err(err) => return Err(format!("OAuth listener failed: {err}")),
        }
    }

    Err("Timed out waiting for Microsoft authentication".to_string())
}

fn handle_request(stream: &mut TcpStream, expected_state: &str) -> Result<Option<String>, String> {
    let mut buffer = [0u8; 4096];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|err| format!("Failed to read OAuth callback request: {err}"))?;

    if bytes_read == 0 {
        return Err("Received empty OAuth callback request".to_string());
    }

    let request = std::str::from_utf8(&buffer[..bytes_read])
        .map_err(|err| format!("Invalid OAuth callback payload: {err}"))?;

    let mut lines = request.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Malformed OAuth callback request".to_string())?;

    let mut parts = request_line.split_whitespace();
    let _method = parts
        .next()
        .ok_or_else(|| "Malformed OAuth request line".to_string())?;
    let raw_path = parts
        .next()
        .ok_or_else(|| "Malformed OAuth request line".to_string())?;

    let full_url = format!("http://localhost{raw_path}");
    let parsed = Url::parse(&full_url)
        .map_err(|err| format!("Failed to parse OAuth callback URL: {err}"))?;

    if parsed.path() != CALLBACK_PATH {
        respond(stream, 404, "Not found")?;
        return Ok(None);
    }

    let query: HashMap<_, _> = parsed.query_pairs().into_owned().collect();
    let state = query.get("state");
    let code = query.get("code");
    let error = query.get("error");
    let error_description = query.get("error_description");

    if let Some(err) = error {
        let desc = error_description.map(|d| d.as_str()).unwrap_or("Unknown error");
        respond(stream, 400, &format!("<html><body><h1>Authentication failed</h1><p>{}: {}</p></body></html>", err, desc))?;
        return Err(format!("Microsoft OAuth error: {}: {}", err, desc));
    }

    if state.map(|value| value.as_str()) != Some(expected_state) || code.is_none() {
        respond(stream, 400, "Invalid sign-in request")?;
        return Ok(None);
    }

    respond(
        stream,
        200,
        "<html><body><h1>Authentication successful!</h1><p>You can close this window and return to Voquill.</p></body></html>",
    )?;
    Ok(Some(code.unwrap().clone()))
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
        .map_err(|err| format!("Failed to send OAuth response: {err}"))
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: i64,
    refresh_token: Option<String>,
    token_type: String,
}

async fn exchange_code_for_tokens(
    client: &Client,
    config: &MicrosoftOAuthConfig,
    code: &str,
    code_verifier: &str,
    redirect_uri: &str,
    scopes: &str,
) -> Result<TokenResponse, String> {
    let response = client
        .post(TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", &config.client_id),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier),
            ("scope", scopes),
        ])
        .send()
        .await
        .map_err(|err| format!("Failed to request Microsoft tokens: {err}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Microsoft token endpoint responded with status {}: {}",
            status, body
        ));
    }

    response
        .json::<TokenResponse>()
        .await
        .map_err(|err| format!("Failed to decode Microsoft token response: {err}"))
}
