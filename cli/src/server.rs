use anyhow::{Context, Result};
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::Env;
use crate::auth::{self, CredsHandle};
use crate::rtdb;

#[derive(Default)]
struct TurnState {
    summary: Option<String>,
    reviews: Vec<String>,
    questions: Vec<String>,
}

struct Shared {
    turn: Mutex<TurnState>,
    env: Env,
    creds: CredsHandle,
    session_id: String,
}

pub struct SessionServer {
    shared: Arc<Shared>,
    pub base_url: String,
}

impl SessionServer {
    pub fn start(env: Env, creds: CredsHandle, session_id: String) -> Result<Arc<Self>> {
        let server = tiny_http::Server::http("127.0.0.1:0")
            .map_err(|e| anyhow::anyhow!("bind session server: {e}"))?;
        let port = server
            .server_addr()
            .to_ip()
            .context("server addr missing port")?
            .port();
        let base_url = format!("http://127.0.0.1:{port}");
        let shared = Arc::new(Shared {
            turn: Mutex::new(TurnState::default()),
            env,
            creds,
            session_id,
        });
        let shared_thread = shared.clone();
        thread::spawn(move || {
            for req in server.incoming_requests() {
                let shared_req = shared_thread.clone();
                thread::spawn(move || handle_request(&shared_req, req));
            }
        });
        Ok(Arc::new(Self { shared, base_url }))
    }

    pub fn begin_turn(&self) {
        *self.shared.turn.lock().unwrap() = TurnState::default();
        set_status(&self.shared, Some("loading"));
    }

    pub fn build_instructions(&self, prompt: &str) -> String {
        let url = &self.base_url;
        format!(
            "Here is my request:\n\n\
             <request>\n{prompt}\n</request>\n\n\
             ---\n\n\
             This session is relayed to a remote UI. Handle my request as you normally would.\n\n\
             To communicate with me, POST JSON to the local session API. The responses are rendered as a single agent turn on a mobile device — be extremely brief and direct, no padding or hedging. Use any combination of the following, or none:\n\n\
             - curl -X POST -H 'Content-Type: application/json' {url}/summary  -d '{{\"text\":\"...\"}}'  — a recap of what you did or propose. One or two short sentences.\n\
             - curl -X POST -H 'Content-Type: application/json' {url}/review   -d '{{\"text\":\"...\"}}'  — an item for me to approve or reject. Call once per item.\n\
             - curl -X POST -H 'Content-Type: application/json' {url}/question -d '{{\"text\":\"...\"}}'  — a question for me. Call once per question.\n\
             - curl -X POST {url}/complete — signals the turn is over. Always call this exactly once at the end of your turn.\n\n\
             The UI walks me through the reviews then the questions in order, then compiles my reply.",
        )
    }
}

fn handle_request(shared: &Shared, mut req: tiny_http::Request) {
    if req.method() != &tiny_http::Method::Post {
        let _ = req.respond(
            tiny_http::Response::from_string("method not allowed").with_status_code(405),
        );
        return;
    }

    let path = req.url().split('?').next().unwrap_or("/").to_string();

    match path.as_str() {
        "/summary" => match read_text(&mut req) {
            Ok(text) => {
                shared.turn.lock().unwrap().summary = Some(text);
                let _ = req.respond(tiny_http::Response::from_string("ok"));
            }
            Err(err) => {
                let _ = req.respond(
                    tiny_http::Response::from_string(err.to_string()).with_status_code(400),
                );
            }
        },
        "/review" => match read_text(&mut req) {
            Ok(text) => {
                shared.turn.lock().unwrap().reviews.push(text);
                let _ = req.respond(tiny_http::Response::from_string("ok"));
            }
            Err(err) => {
                let _ = req.respond(
                    tiny_http::Response::from_string(err.to_string()).with_status_code(400),
                );
            }
        },
        "/question" => match read_text(&mut req) {
            Ok(text) => {
                shared.turn.lock().unwrap().questions.push(text);
                let _ = req.respond(tiny_http::Response::from_string("ok"));
            }
            Err(err) => {
                let _ = req.respond(
                    tiny_http::Response::from_string(err.to_string()).with_status_code(400),
                );
            }
        },
        "/complete" => {
            let _ = req.respond(tiny_http::Response::from_string("ok"));
            complete_turn(shared);
        }
        _ => {
            let _ =
                req.respond(tiny_http::Response::from_string("not found").with_status_code(404));
        }
    }
}

fn read_text(req: &mut tiny_http::Request) -> Result<String> {
    let mut body = String::new();
    req.as_reader()
        .read_to_string(&mut body)
        .context("read body")?;
    let trimmed = body.trim();
    if trimmed.is_empty() {
        anyhow::bail!("empty body");
    }
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed)
        && let Some(t) = v.get("text").and_then(|x| x.as_str())
    {
        let t = t.trim();
        if t.is_empty() {
            anyhow::bail!("empty text");
        }
        return Ok(t.to_string());
    }
    Ok(trimmed.to_string())
}

fn complete_turn(shared: &Shared) {
    let state = std::mem::take(&mut *shared.turn.lock().unwrap());
    let has_content =
        state.summary.is_some() || !state.reviews.is_empty() || !state.questions.is_empty();

    if has_content {
        let mut entry = json!({
            "type": "assistant",
            "time": now_millis(),
        });
        if let Some(s) = state.summary {
            entry["summary"] = json!(s);
        }
        if !state.reviews.is_empty() {
            entry["reviews"] = serde_json::Value::Array(
                state
                    .reviews
                    .into_iter()
                    .map(|m| json!({"message": m}))
                    .collect(),
            );
        }
        if !state.questions.is_empty() {
            entry["questions"] = serde_json::Value::Array(
                state
                    .questions
                    .into_iter()
                    .map(|m| json!({"message": m}))
                    .collect(),
            );
        }
        match auth::ensure_fresh(shared.env, &shared.creds) {
            Ok(fresh) => {
                if let Err(err) =
                    rtdb::append_history_entry(shared.env, &fresh, &shared.session_id, &entry)
                {
                    eprintln!("\r\nFailed to upload assistant turn: {err}\r");
                }
            }
            Err(err) => eprintln!("\r\nFailed to refresh credentials: {err}\r"),
        }
    }

    set_status(shared, None);
}

fn set_status(shared: &Shared, status: Option<&str>) {
    match auth::ensure_fresh(shared.env, &shared.creds) {
        Ok(fresh) => {
            if let Err(err) = rtdb::set_status(shared.env, &fresh, &shared.session_id, status) {
                eprintln!("\r\nFailed to set status: {err}\r");
            }
        }
        Err(err) => eprintln!("\r\nFailed to refresh credentials: {err}\r"),
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
