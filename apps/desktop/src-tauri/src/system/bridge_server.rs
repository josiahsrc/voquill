use serde::Serialize;
use std::fs;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;

pub const EVT_BRIDGE_HOTKEY_TRIGGER: &str = "bridge_hotkey_trigger";

#[derive(Debug, Clone, Serialize)]
pub struct BridgeHotkeyTriggerPayload {
    pub hotkey: String,
}

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        match start_inner(&app).await {
            Ok(port) => log::info!("Bridge server started on port {port}"),
            Err(err) => log::error!("Failed to start bridge server: {err}"),
        }
    });
}

async fn start_inner(app: &AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|err| format!("Failed to bind bridge server: {err}"))?;

    let port = listener
        .local_addr()
        .map_err(|err| format!("Failed to get bridge server address: {err}"))?
        .port();

    write_port_file(app, port)?;

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let app = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(err) = handle_connection(stream, app).await {
                            log::error!("Bridge server connection error: {err}");
                        }
                    });
                }
                Err(err) => {
                    log::error!("Bridge server accept failed: {err}");
                    break;
                }
            }
        }
    });

    Ok(port)
}

fn write_port_file(app: &AppHandle, port: u16) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|err| format!("Failed to get config dir: {err}"))?;

    fs::create_dir_all(&config_dir).map_err(|err| format!("Failed to create config dir: {err}"))?;

    let file_path = config_dir.join("bridge-server.json");
    let content = serde_json::json!({ "port": port }).to_string();
    fs::write(&file_path, &content)
        .map_err(|err| format!("Failed to write bridge-server.json: {err}"))?;

    log::info!("Wrote bridge server port to {}", file_path.display());
    Ok(())
}

async fn handle_connection(stream: tokio::net::TcpStream, app: AppHandle) -> Result<(), String> {
    let (reader, mut writer) = stream.into_split();
    let mut buf_reader = BufReader::new(reader);

    let mut request_line = String::new();
    buf_reader
        .read_line(&mut request_line)
        .await
        .map_err(|err| format!("Failed to read request line: {err}"))?;

    // Consume remaining headers until blank line
    let mut header = String::new();
    loop {
        header.clear();
        let n = buf_reader
            .read_line(&mut header)
            .await
            .map_err(|err| format!("Failed to read header: {err}"))?;
        if n == 0 || header.trim().is_empty() {
            break;
        }
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return write_response(&mut writer, 400, "Bad Request").await;
    }

    let method = parts[0];
    let path = parts[1];

    if method != "POST" {
        return write_response(&mut writer, 405, "Method Not Allowed").await;
    }

    let hotkey = match path.strip_prefix("/hotkey/") {
        Some(name) if !name.is_empty() && !name.contains('/') => name,
        _ => return write_response(&mut writer, 404, "Not Found").await,
    };

    let payload = BridgeHotkeyTriggerPayload {
        hotkey: hotkey.to_string(),
    };

    match app.emit(EVT_BRIDGE_HOTKEY_TRIGGER, &payload) {
        Ok(()) => {
            log::info!("Bridge hotkey triggered: {hotkey}");
            write_response(&mut writer, 200, "OK").await
        }
        Err(err) => {
            log::error!("Failed to emit bridge hotkey event: {err}");
            write_response(&mut writer, 500, "Internal Server Error").await
        }
    }
}

async fn write_response(
    writer: &mut tokio::net::tcp::OwnedWriteHalf,
    status: u16,
    reason: &str,
) -> Result<(), String> {
    let body = format!("{status} {reason}");
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    writer
        .write_all(response.as_bytes())
        .await
        .map_err(|err| format!("Failed to write response: {err}"))?;
    Ok(())
}
