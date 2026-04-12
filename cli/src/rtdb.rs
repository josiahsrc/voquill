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
