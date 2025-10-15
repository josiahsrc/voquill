import { useState } from "react";
import reactLogo from "../../assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { createHelloRight } from "@repo/types";
import { useRecordingTelemetry } from "../../hooks/useRecordingTelemetry";
import { formatDuration, formatSize } from "../../utils/format.utils";
import "./LegacyPage.css";

export function LegacyPage() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const { recordingState, altPressCount } = useRecordingTelemetry();

  const a = createHelloRight();
  console.log(a);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="container">
      <h1>Welcome to Voquill Desktop</h1>
      <div className="card">
        <div className="status-row">
          <span className={`status ${recordingState.isRecording ? "recording" : ""}`}>
            {recordingState.isRecording ? "Recording in progress" : "Idle"}
          </span>
          {recordingState.startedAtMs && (
            <span className="status-details">
              Started at: {new Date(recordingState.startedAtMs).toLocaleTimeString()}
            </span>
          )}
          {recordingState.lastDurationMs && (
            <span className="status-details">
              Last duration: {formatDuration(recordingState.lastDurationMs)}
            </span>
          )}
        </div>

        <div className="logo-section">
          <img src={reactLogo} className="logo react" alt="Voquill app icon" />
          <button type="button" onClick={() => invoke("toggle_recording")}>
            Toggle Recording
          </button>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h3>Recording Status</h3>
            <p>{recordingState.isRecording ? "Recording..." : "Not recording"}</p>
            {recordingState.error && (
              <p className="error">Error: {recordingState.error}</p>
            )}
          </div>
          <div className="info-card">
            <h3>Last Recording</h3>
            <p>{recordingState.lastDurationMs ? formatDuration(recordingState.lastDurationMs) : "N/A"}</p>
            <p>
              Size:{" "}
              {recordingState.lastSizeBytes
                ? formatSize(recordingState.lastSizeBytes)
                : "N/A"}
            </p>
          </div>
          <div className="info-card">
            <h3>Alt Key Triggers</h3>
            <p>{altPressCount}</p>
          </div>
        </div>

        {recordingState.lastTranscription && (
          <div className="transcription">
            <h3>Last Transcription</h3>
            <p>{recordingState.lastTranscription}</p>
          </div>
        )}

        <div className="greet-section">
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
            value={name}
          />
          <button type="button" onClick={greet}>
            Submit
          </button>
        </div>

        <p>{greetMsg}</p>
      </div>
    </div>
  );
}

export default LegacyPage;
