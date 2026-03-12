use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::net::UdpSocket;
use tauri::async_runtime;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;

use crate::platform::input::paste_text_into_focused_field;
use crate::state::{RemoteReceiverState, RemoteReceiverStatus};

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum IncomingEnvelope {
    SessionHello {
        session_id: String,
        sender_device_id: String,
        auth_token: String,
    },
    FinalText {
        session_id: String,
        event_id: String,
        sequence: u64,
        text: String,
        mode: String,
        created_at: String,
    },
    Heartbeat {
        session_id: String,
        sent_at: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum OutgoingEnvelope {
    SessionAck {
        session_id: String,
        receiver_device_id: String,
    },
    DeliveryAck {
        session_id: String,
        event_id: String,
        sequence: u64,
        delivered_at: String,
    },
    DeliveryError {
        session_id: String,
        event_id: String,
        sequence: u64,
        code: String,
        message: String,
    },
}

pub async fn start(
    state: RemoteReceiverState,
    pool: SqlitePool,
    port: Option<u16>,
) -> Result<RemoteReceiverStatus, String> {
    if state.is_enabled() {
        return Ok(state.status());
    }

    let bind_port = port.unwrap_or(0);
    let listener = TcpListener::bind(("0.0.0.0", bind_port))
        .await
        .map_err(|err| format!("Failed to bind receiver listener: {err}"))?;
    let local_addr = listener
        .local_addr()
        .map_err(|err| format!("Failed to get receiver listener address: {err}"))?;
    let connect_address = detect_connect_address().unwrap_or_else(|| "127.0.0.1".to_string());

    let (shutdown_tx, mut shutdown_rx) = watch::channel(false);
    state.start(connect_address, local_addr.port(), shutdown_tx);

    let state_for_task = state.clone();
    async_runtime::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_rx.changed() => {
                    break;
                }
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, _)) => {
                            let state = state_for_task.clone();
                            let pool = pool.clone();
                            async_runtime::spawn(async move {
                                if let Err(err) = handle_connection(stream, pool, state).await {
                                    log::error!("Remote receiver connection failed: {err}");
                                }
                            });
                        }
                        Err(err) => {
                            log::error!("Remote receiver accept failed: {err}");
                            break;
                        }
                    }
                }
            }
        }
    });

    Ok(state.status())
}

fn detect_connect_address() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:80").ok()?;
    let local_addr = socket.local_addr().ok()?;
    let ip = local_addr.ip();
    if ip.is_loopback() || ip.is_unspecified() {
        return None;
    }
    Some(ip.to_string())
}

pub fn stop(state: RemoteReceiverState) {
    state.stop();
}

async fn handle_connection(
    stream: TcpStream,
    pool: SqlitePool,
    state: RemoteReceiverState,
) -> Result<(), String> {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();
    let mut authenticated_sender: Option<String> = None;

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|err| format!("Failed to read receiver message: {err}"))?
    {
        let envelope: IncomingEnvelope = serde_json::from_str(&line)
            .map_err(|err| format!("Failed to parse receiver message: {err}"))?;

        match envelope {
            IncomingEnvelope::SessionHello {
                session_id,
                sender_device_id,
                auth_token,
            } => {
                let device =
                    crate::db::paired_remote_device_queries::fetch_paired_remote_device_by_id(
                        pool.clone(),
                        &sender_device_id,
                    )
                    .await
                    .map_err(|err| format!("Failed to validate sender device: {err}"))?;

                let Some(device) = device else {
                    state.record_error(
                        Some(sender_device_id.clone()),
                        None,
                        "Sender is not paired.".to_string(),
                        None,
                        None,
                        None,
                    );
                    write_message(
                        &mut writer,
                        &OutgoingEnvelope::DeliveryError {
                            session_id,
                            event_id: String::new(),
                            sequence: 0,
                            code: "unknown_sender".to_string(),
                            message: "Sender is not paired.".to_string(),
                        },
                    )
                    .await?;
                    continue;
                };

                if !device.trusted || device.shared_secret != auth_token {
                    state.record_error(
                        Some(sender_device_id.clone()),
                        None,
                        "Sender authentication failed.".to_string(),
                        None,
                        None,
                        None,
                    );
                    write_message(
                        &mut writer,
                        &OutgoingEnvelope::DeliveryError {
                            session_id,
                            event_id: String::new(),
                            sequence: 0,
                            code: "unauthorized".to_string(),
                            message: "Sender authentication failed.".to_string(),
                        },
                    )
                    .await?;
                    continue;
                }

                authenticated_sender = Some(sender_device_id);
                write_message(
                    &mut writer,
                    &OutgoingEnvelope::SessionAck {
                        session_id,
                        receiver_device_id: state.status().device_id,
                    },
                )
                .await?;
            }
            IncomingEnvelope::FinalText {
                session_id,
                event_id,
                sequence,
                text,
                mode: _mode,
                created_at: _created_at,
            } => {
                let Some(sender_device_id) = authenticated_sender.clone() else {
                    state.record_error(
                        None,
                        Some(event_id.clone()),
                        "No authenticated sender session.".to_string(),
                        None,
                        None,
                        None,
                    );
                    write_message(
                        &mut writer,
                        &OutgoingEnvelope::DeliveryError {
                            session_id,
                            event_id,
                            sequence,
                            code: "unauthorized".to_string(),
                            message: "No authenticated sender session.".to_string(),
                        },
                    )
                    .await?;
                    continue;
                };

                let target_info = current_target_info();
                let target_editable = current_target_editable_status();
                if matches!(target_editable, Some(false)) {
                    let message =
                        "Target window is focused, but no editable text field is active."
                            .to_string();
                    state.record_error(
                        Some(sender_device_id),
                        Some(event_id.clone()),
                        message.clone(),
                        target_info.class_name.clone(),
                        target_info.title.clone(),
                        target_editable,
                    );
                    write_message(
                        &mut writer,
                        &OutgoingEnvelope::DeliveryError {
                            session_id,
                            event_id,
                            sequence,
                            code: "no_focused_text_field".to_string(),
                            message,
                        },
                    )
                    .await?;
                    continue;
                }

                match paste_text_into_focused_field(&text, None) {
                    Ok(()) => {
                        let delivered_at = chrono::Utc::now().to_rfc3339();
                        state.record_delivery(
                            Some(sender_device_id),
                            Some(event_id.clone()),
                            Some(delivered_at.clone()),
                            target_info.class_name.clone(),
                            target_info.title.clone(),
                            target_editable,
                        );
                        write_message(
                            &mut writer,
                            &OutgoingEnvelope::DeliveryAck {
                                session_id,
                                event_id,
                                sequence,
                                delivered_at,
                            },
                        )
                        .await?;
                    }
                    Err(err) => {
                        state.record_error(
                            Some(sender_device_id),
                            Some(event_id.clone()),
                            err.clone(),
                            target_info.class_name.clone(),
                            target_info.title.clone(),
                            target_editable,
                        );
                        write_message(
                            &mut writer,
                            &OutgoingEnvelope::DeliveryError {
                                session_id,
                                event_id,
                                sequence,
                                code: "insert_failed".to_string(),
                                message: err,
                            },
                        )
                        .await?;
                    }
                }
            }
            IncomingEnvelope::Heartbeat { session_id, sent_at: _sent_at } => {
                write_message(
                    &mut writer,
                    &OutgoingEnvelope::SessionAck {
                        session_id,
                        receiver_device_id: state.status().device_id,
                    },
                )
                .await?;
            }
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn current_target_info() -> crate::platform::windows::input::WindowTargetInfo {
    crate::platform::windows::input::get_foreground_window_target_info()
}

#[cfg(target_os = "windows")]
fn current_target_editable_status() -> Option<bool> {
    Some(crate::platform::accessibility::is_text_input_focused())
}

#[cfg(not(target_os = "windows"))]
fn current_target_info() -> FallbackWindowTargetInfo {
    FallbackWindowTargetInfo {
        class_name: None,
        title: None,
    }
}

#[cfg(not(target_os = "windows"))]
fn current_target_editable_status() -> Option<bool> {
    None
}

#[cfg(not(target_os = "windows"))]
struct FallbackWindowTargetInfo {
    class_name: Option<String>,
    title: Option<String>,
}

async fn write_message(
    writer: &mut tokio::net::tcp::OwnedWriteHalf,
    message: &OutgoingEnvelope,
) -> Result<(), String> {
    let json = serde_json::to_string(message)
        .map_err(|err| format!("Failed to serialize receiver message: {err}"))?;
    writer
        .write_all(json.as_bytes())
        .await
        .map_err(|err| format!("Failed to write receiver message: {err}"))?;
    writer
        .write_all(b"\n")
        .await
        .map_err(|err| format!("Failed to finalize receiver message: {err}"))?;
    Ok(())
}
