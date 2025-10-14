import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { createHelloRight } from "@repo/types";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type RecordingStartedPayload = {
  started_at_ms?: number;
};

type RecordingFinishedPayload = {
  duration_ms?: number;
  size_bytes?: number;
  transcription?: string;
};

type RecordingErrorPayload = {
  message?: string;
};

type RecordingState = {
  isRecording: boolean;
  startedAtMs?: number;
  lastDurationMs?: number;
  lastSizeBytes?: number;
  lastTranscription?: string;
  error?: string;
};

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms)) {
    return "0 ms";
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(0)}s`;
  }
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

const formatSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) {
    return `${megabytes.toFixed(2)} MB`;
  }
  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(2)} GB`;
};

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
  });
  const [altPressCount, setAltPressCount] = useState(0);

  const a = createHelloRight();
  console.log(a);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      (!Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__") &&
        !Object.prototype.hasOwnProperty.call(window, "__TAURI_IPC__"))
    ) {
      return;
    }

    let canceled = false;

    const loadPersistedCount = async () => {
      try {
        const count = await invoke<number>("get_option_key_count");
        if (!canceled && typeof count === "number") {
          setAltPressCount(count);
        }
      } catch (err) {
        console.error("Failed to load option key count", err);
      }
    };

    const runAutoUpdate = async () => {
      try {
        const update = await check();
        if (!canceled && update?.available) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (err) {
        console.error("Auto-update check failed", err);
      }
    };

    runAutoUpdate();
    loadPersistedCount();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      (!Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__") &&
        !Object.prototype.hasOwnProperty.call(window, "__TAURI_IPC__"))
    ) {
      return;
    }

    let canceled = false;
    const unlistenFns: Array<() => void> = [];

    const parsePayload = (payload: unknown): Record<string, unknown> | null => {
      if (typeof payload === "object" && payload !== null) {
        return payload as Record<string, unknown>;
      }
      if (typeof payload === "string") {
        try {
          const parsed = JSON.parse(payload);
          if (typeof parsed === "object" && parsed !== null) {
            return parsed as Record<string, unknown>;
          }
        } catch (err) {
          console.error("Failed to parse recording event payload", err);
        }
      }
      return null;
    };

    const attachListeners = async () => {
      try {
        const startedListener = await listen<RecordingStartedPayload>(
          "recording-started",
          (event) => {
            const data = parsePayload(event.payload);
            const startedAt =
              data && typeof data.started_at_ms === "number"
                ? data.started_at_ms
                : Date.now();
            setRecordingState((prev) => ({
              ...prev,
              isRecording: true,
              startedAtMs: startedAt,
              error: undefined,
            }));
          }
        );
        const finishedListener = await listen<RecordingFinishedPayload>(
          "recording-finished",
          (event) => {
            const data = parsePayload(event.payload);
            const duration =
              data && typeof data.duration_ms === "number"
                ? data.duration_ms
                : undefined;
            const size =
              data && typeof data.size_bytes === "number"
                ? data.size_bytes
                : undefined;
            const transcription =
              data && typeof data.transcription === "string"
                ? data.transcription
                : undefined;

            setRecordingState((prev) => {
              const fallbackDuration =
                typeof duration === "number"
                  ? duration
                  : prev.startedAtMs
                    ? Math.max(0, Date.now() - prev.startedAtMs)
                    : undefined;
              return {
                ...prev,
                isRecording: false,
                startedAtMs: undefined,
                lastDurationMs: fallbackDuration,
                lastSizeBytes: size,
                lastTranscription: transcription,
                error: undefined,
              };
            });
          }
        );
        const errorListener = await listen<RecordingErrorPayload>(
          "recording-error",
          (event) => {
            const data = parsePayload(event.payload);
            const message =
              data && typeof data.message === "string"
                ? data.message
                : "Recording error";
            setRecordingState((prev) => ({
              ...prev,
              isRecording: false,
              startedAtMs: undefined,
              error: message,
            }));
          }
        );
        const altListener = await listen<{ count: number } | number | string>(
          "alt-pressed",
          (event) => {
            const payload = event.payload;
            let nextCount: number | undefined;
            if (typeof payload === "number") {
              nextCount = payload;
            } else if (typeof payload === "string") {
              try {
                const parsed = JSON.parse(payload);
                if (typeof parsed?.count === "number") {
                  nextCount = parsed.count;
                }
              } catch (err) {
                console.error("Failed to parse alt-pressed payload", err);
              }
            } else if (typeof payload === "object" && payload) {
              if (typeof (payload as { count?: unknown }).count === "number") {
                nextCount = (payload as { count: number }).count;
              }
            }

            if (typeof nextCount === "number") {
              setAltPressCount(nextCount);
            }
          }
        );

        if (canceled) {
          startedListener();
          finishedListener();
          errorListener();
          altListener();
        } else {
          unlistenFns.push(
            startedListener,
            finishedListener,
            errorListener,
            altListener
          );
        }
      } catch (err) {
        console.error("Failed to attach recording listeners", err);
      }
    };

    attachListeners();

    return () => {
      canceled = true;
      while (unlistenFns.length > 0) {
        const stop = unlistenFns.pop();
        if (typeof stop === "function") {
          stop();
        }
      }
    };
  }, []);

  const lastRecordingParts: string[] = [];
  if (recordingState.lastDurationMs !== undefined) {
    lastRecordingParts.push(
      `lasted ${formatDuration(recordingState.lastDurationMs)}`
    );
  }
  if (recordingState.lastSizeBytes !== undefined) {
    lastRecordingParts.push(`used ${formatSize(recordingState.lastSizeBytes)}`);
  }
  const lastRecordingSummary =
    lastRecordingParts.length > 0
      ? `Last recording ${lastRecordingParts.join(" and ")}.`
      : null;

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
      <p>{`Alt key pressed ${altPressCount} time${altPressCount === 1 ? "" : "s"}`}</p>
      {recordingState.isRecording ? (
        <p>Recording in progress... release the Option key to stop.</p>
      ) : lastRecordingSummary ? (
        <p>{lastRecordingSummary}</p>
      ) : (
        <p>Hold the Option key to start a new recording.</p>
      )}
      {recordingState.lastTranscription ? (
        <p>
          <strong>Transcription:</strong> {recordingState.lastTranscription}
        </p>
      ) : null}
      {recordingState.error ? (
        <p style={{ color: "#d14343" }}>
          Recording error: {recordingState.error}
        </p>
      ) : null}
    </main>
  );
}

export default App;
