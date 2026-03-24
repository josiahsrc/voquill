use std::io::{self, BufRead, Write};
use std::sync::mpsc::Sender;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Visibility {
    Hidden,
    WhileActive,
    Persistent,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InMessage {
    Phase { phase: Phase },
    Levels { levels: Vec<f32> },
    StyleInfo { count: u32, name: String },
    Visibility { visibility: Visibility },
    Quit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Idle,
    Recording,
    Loading,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OutMessage {
    Ready,
    Hover { hovered: bool },
    Click,
    StyleSwitch { direction: String },
}

pub fn send(msg: &OutMessage) {
    let mut stdout = io::stdout().lock();
    let _ = serde_json::to_writer(&mut stdout, msg);
    let _ = stdout.write_all(b"\n");
    let _ = stdout.flush();
}

pub fn start_stdin_reader(sender: Sender<InMessage>) {
    std::thread::spawn(move || {
        let stdin = io::stdin();
        let reader = stdin.lock();
        for line in reader.lines() {
            let Ok(line) = line else { break };
            if line.is_empty() {
                continue;
            }
            match serde_json::from_str::<InMessage>(&line) {
                Ok(msg) => {
                    if sender.send(msg).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("[pill] bad message: {e}");
                }
            }
        }
        let _ = sender.send(InMessage::Quit);
    });
}
