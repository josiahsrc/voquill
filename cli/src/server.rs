use anyhow::{Context, Result};
use serde_json::json;
use std::sync::Arc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::Env;
use crate::auth::{self, CredsHandle};
use crate::platform;
use crate::rtdb;

struct Shared {
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
        set_status(&self.shared, Some("loading"));
    }

    pub fn build_instructions(&self, prompt: &str) -> String {
        let url = &self.base_url;
        let host = platform::host_description();
        format!(
            "Here is my request:\n\n\
             <request>\n{prompt}\n</request>\n\n\
             ---\n\n\
             This session is relayed to a remote UI. Handle my request as you normally would.\n\n\
             When your turn is done, make exactly ONE POST to {url}/reply with a JSON body containing any combination of these optional fields (or none). The response is rendered as a single agent turn on a mobile device — be extremely brief and direct, no padding or hedging.\n\n\
             Fields:\n\
             - summary (string): a recap of what you did or propose. One or two short sentences.\n\
             - reviews (array of strings): items for me to approve or reject, in order.\n\
             - questions (array of strings): questions for me, in order.\n\n\
             Host shell: {host}\n\n\
             Example (be sure to adapt your network invocation to your host shell):\n\
             curl -X POST -H 'Content-Type: application/json' {url}/reply -d '{{\"summary\":\"Renamed the handler.\",\"reviews\":[\"Remove the deprecated alias?\"],\"questions\":[\"Should I update the changelog?\"]}}'\n\n\
             The UI walks me through the reviews then the questions in order, then compiles my reply. Posting /reply ends the turn — do not call it more than once.",
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

    if path != "/reply" {
        let _ = req.respond(tiny_http::Response::from_string("not found").with_status_code(404));
        return;
    }

    match read_reply(&mut req) {
        Ok(reply) => {
            let _ = req.respond(tiny_http::Response::from_string("ok"));
            complete_turn(shared, reply);
        }
        Err(err) => {
            let _ = req.respond(
                tiny_http::Response::from_string(err.to_string()).with_status_code(400),
            );
        }
    }
}

struct Reply {
    summary: Option<String>,
    reviews: Vec<String>,
    questions: Vec<String>,
}

fn read_reply(req: &mut tiny_http::Request) -> Result<Reply> {
    let mut body = String::new();
    req.as_reader()
        .read_to_string(&mut body)
        .context("read body")?;
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Ok(Reply {
            summary: None,
            reviews: Vec::new(),
            questions: Vec::new(),
        });
    }
    let value: serde_json::Value =
        serde_json::from_str(trimmed).context("body must be valid JSON")?;

    let summary = value
        .get("summary")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let reviews = string_array(&value, "reviews")?;
    let questions = string_array(&value, "questions")?;

    Ok(Reply {
        summary,
        reviews,
        questions,
    })
}

fn string_array(value: &serde_json::Value, key: &str) -> Result<Vec<String>> {
    let Some(raw) = value.get(key) else {
        return Ok(Vec::new());
    };
    if raw.is_null() {
        return Ok(Vec::new());
    }
    let arr = raw
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("`{key}` must be an array of strings"))?;
    let mut out = Vec::with_capacity(arr.len());
    for item in arr {
        let s = item
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("`{key}` must contain only strings"))?
            .trim();
        if !s.is_empty() {
            out.push(s.to_string());
        }
    }
    Ok(out)
}

fn complete_turn(shared: &Shared, reply: Reply) {
    let has_content =
        reply.summary.is_some() || !reply.reviews.is_empty() || !reply.questions.is_empty();

    if has_content {
        let mut entry = json!({
            "type": "assistant",
            "time": now_millis(),
        });
        if let Some(s) = reply.summary {
            entry["summary"] = json!(s);
        }
        if !reply.reviews.is_empty() {
            entry["reviews"] = serde_json::Value::Array(
                reply
                    .reviews
                    .into_iter()
                    .map(|m| json!({"message": m}))
                    .collect(),
            );
        }
        if !reply.questions.is_empty() {
            entry["questions"] = serde_json::Value::Array(
                reply
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
