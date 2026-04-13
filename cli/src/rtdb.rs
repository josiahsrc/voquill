use anyhow::{Context, Result, bail};
use serde_json::json;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::Env;
use crate::credentials::Credentials;

const TIMEOUT: Duration = Duration::from_secs(10);

fn client() -> Result<reqwest::blocking::Client> {
    reqwest::blocking::Client::builder()
        .timeout(TIMEOUT)
        .build()
        .context("Failed to build HTTP client")
}

fn stream_client() -> Result<reqwest::blocking::Client> {
    reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .tcp_keepalive(Duration::from_secs(30))
        .build()
        .context("Failed to build HTTP client")
}

fn session_url(env: Env, creds: &Credentials, session_id: &str) -> String {
    let path = format!("session/{}/{}", creds.uid, session_id);
    match env {
        Env::Prod => format!(
            "https://voquill-prod-default-rtdb.firebaseio.com/{path}.json?auth={}",
            creds.id_token
        ),
        Env::Dev => format!(
            "https://voquill-dev-default-rtdb.firebaseio.com/{path}.json?auth={}",
            creds.id_token
        ),
        Env::Emulator => format!(
            "http://127.0.0.1:9000/{path}.json?ns=voquill-dev-default-rtdb&auth={}",
            creds.id_token
        ),
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn create_session(env: Env, creds: &Credentials, session_id: &str, name: &str) -> Result<()> {
    let body = json!({
        "name": name,
        "type": "cli",
        "lastActive": now_millis(),
    });

    let response = client()?
        .put(session_url(env, creds, session_id))
        .json(&body)
        .send()
        .context("Failed to create session")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB create failed ({status}): {text}");
    }

    Ok(())
}

pub fn touch_session(env: Env, creds: &Credentials, session_id: &str) -> Result<()> {
    let body = json!({ "lastActive": now_millis() });
    let response = client()?
        .patch(session_url(env, creds, session_id))
        .json(&body)
        .send()
        .context("Failed to touch session")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB touch failed ({status}): {text}");
    }

    Ok(())
}

fn history_url(env: Env, creds: &Credentials, session_id: &str) -> String {
    let path = format!("session/{}/{}/history", creds.uid, session_id);
    match env {
        Env::Prod => format!(
            "https://voquill-prod-default-rtdb.firebaseio.com/{path}.json?auth={}",
            creds.id_token
        ),
        Env::Dev => format!(
            "https://voquill-dev-default-rtdb.firebaseio.com/{path}.json?auth={}",
            creds.id_token
        ),
        Env::Emulator => format!(
            "http://127.0.0.1:9000/{path}.json?ns=voquill-dev-default-rtdb&auth={}",
            creds.id_token
        ),
    }
}

pub fn append_history_entry(
    env: Env,
    creds: &Credentials,
    session_id: &str,
    entry: &serde_json::Value,
) -> Result<()> {
    let response = client()?
        .post(history_url(env, creds, session_id))
        .json(entry)
        .send()
        .context("Failed to append history entry")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB history append failed ({status}): {text}");
    }

    Ok(())
}

pub fn set_status(
    env: Env,
    creds: &Credentials,
    session_id: &str,
    status: Option<&str>,
) -> Result<()> {
    let body = json!({ "status": status });
    let response = client()?
        .patch(session_url(env, creds, session_id))
        .json(&body)
        .send()
        .context("Failed to set status")?;

    if !response.status().is_success() {
        let status_code = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB status patch failed ({status_code}): {text}");
    }

    Ok(())
}

pub fn clear_paste(env: Env, creds: &Credentials, session_id: &str) -> Result<()> {
    let body = json!({ "pasteText": null, "pasteTimestamp": null });
    let response = client()?
        .patch(session_url(env, creds, session_id))
        .json(&body)
        .send()
        .context("Failed to clear paste")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB patch failed ({status}): {text}");
    }

    Ok(())
}

pub fn stream_session(
    env: Env,
    creds: &Credentials,
    session_id: &str,
) -> Result<reqwest::blocking::Response> {
    let response = stream_client()?
        .get(session_url(env, creds, session_id))
        .header("Accept", "text/event-stream")
        .send()
        .context("Failed to open RTDB stream")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB stream failed ({status}): {text}");
    }

    Ok(response)
}

pub fn delete_session(env: Env, creds: &Credentials, session_id: &str) -> Result<()> {
    let response = client()?
        .delete(session_url(env, creds, session_id))
        .send()
        .context("Failed to delete session")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("RTDB delete failed ({status}): {text}");
    }

    Ok(())
}
