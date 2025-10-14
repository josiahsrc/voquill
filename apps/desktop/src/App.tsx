import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { createHelloRight } from "@repo/types";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
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

    let unlisten: (() => void) | undefined;
    let canceled = false;

    const attachListener = async () => {
      try {
        const stop = await listen<{ count: number } | number | string>(
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

        if (!canceled) {
          unlisten = stop;
        } else {
          stop();
        }
      } catch (err) {
        console.error("Failed to attach Alt key listener", err);
      }
    };

    attachListener();

    return () => {
      canceled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

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
    </main>
  );
}

export default App;
