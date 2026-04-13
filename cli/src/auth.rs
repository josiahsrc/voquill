use anyhow::{Context, Result, bail};
use serde::Deserialize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::Env;
use crate::credentials::{self, Credentials};

const REFRESH_LEEWAY_SECS: i64 = 5 * 60;
const HTTP_TIMEOUT: Duration = Duration::from_secs(15);

pub type CredsHandle = Arc<Mutex<Credentials>>;

pub fn handle(creds: Credentials) -> CredsHandle {
    Arc::new(Mutex::new(creds))
}

pub fn ensure_fresh(env: Env, handle: &CredsHandle) -> Result<Credentials> {
    let mut guard = handle.lock().unwrap();
    if needs_refresh(&guard) {
        refresh(env, &mut guard)?;
    }
    Ok(guard.clone())
}

pub fn force_refresh(env: Env, handle: &CredsHandle) -> Result<Credentials> {
    let mut guard = handle.lock().unwrap();
    refresh(env, &mut guard)?;
    Ok(guard.clone())
}

#[derive(Debug, Deserialize)]
struct RefreshResponse {
    id_token: String,
    refresh_token: String,
    expires_in: String,
}

pub fn needs_refresh(creds: &Credentials) -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    creds.expires_at - now < REFRESH_LEEWAY_SECS
}

pub fn refresh(env: Env, creds: &mut Credentials) -> Result<()> {
    let client = reqwest::blocking::Client::builder()
        .timeout(HTTP_TIMEOUT)
        .build()
        .context("Failed to build HTTP client")?;

    let response = client
        .post(env.secure_token_url())
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", creds.refresh_token.as_str()),
        ])
        .send()
        .context("Failed to call securetoken endpoint")?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        bail!("Token refresh failed ({status}): {text}");
    }

    let refreshed: RefreshResponse = response.json().context("Malformed refresh response")?;

    let expires_in: i64 = refreshed.expires_in.parse().unwrap_or(3600);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    creds.id_token = refreshed.id_token;
    creds.refresh_token = refreshed.refresh_token;
    creds.expires_at = now + expires_in;

    credentials::save(env, creds)?;
    Ok(())
}
