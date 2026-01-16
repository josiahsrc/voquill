import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface InstallProgress {
  stage: string;
  progress: number;
  message: string;
}

type InstallerState = "idle" | "installing" | "complete" | "error";

const LOGO_SVG = `
<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M75.3206 52.5707L19.8206 108.071" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
  <path d="M32.1525 94.8831L27.4937 59.8648C27.2023 57.6748 27.8296 55.4619 29.2267 53.7505L53.5296 23.9816C55.622 21.4186 59.0762 20.4081 62.2201 21.4393L94.883 32.1527" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path d="M32.7586 95.4893L67.7769 100.148C69.9669 100.44 72.1798 99.8123 73.8912 98.4151L103.66 74.1122C106.223 72.0198 107.234 68.5656 106.202 65.4218L95.489 32.7588" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
</svg>
`;

const CLOSE_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

class Installer {
  private state: InstallerState = "idle";
  private progress = 0;
  private message = "Ready to install";
  private errorMessage = "";

  constructor() {
    this.render();
    this.setupEventListeners();
    this.autoStart();
  }

  private async autoStart() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.startInstall();
  }

  private setupEventListeners() {
    listen<InstallProgress>("install-progress", (event) => {
      const { stage, progress, message } = event.payload;
      this.progress = progress;
      this.message = message;

      if (stage === "complete") {
        this.state = "complete";
      } else if (stage === "error") {
        this.state = "error";
        this.errorMessage = message;
      } else {
        this.state = "installing";
      }

      this.render();
    });
  }

  private async startInstall() {
    if (this.state === "installing") return;

    this.state = "installing";
    this.progress = 0;
    this.message = "Starting installation...";
    this.render();

    try {
      await invoke("start_installation");
    } catch (error) {
      this.state = "error";
      this.errorMessage = String(error);
      this.render();
    }
  }

  private async launchApp() {
    try {
      await invoke("launch_app");
      await invoke("close_installer");
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  }

  private async closeInstaller() {
    await invoke("close_installer");
  }

  private getLogoClass(): string {
    switch (this.state) {
      case "installing":
        return "logo installing";
      case "complete":
        return "logo complete";
      case "error":
        return "logo error";
      default:
        return "logo";
    }
  }

  private getProgressClass(): string {
    switch (this.state) {
      case "complete":
        return "progress-bar complete";
      case "error":
        return "progress-bar error";
      default:
        return "progress-bar";
    }
  }

  private render() {
    const app = document.getElementById("app")!;

    const showProgress = this.state === "installing" || this.state === "complete";
    const showLaunchButton = this.state === "complete";
    const showRetryButton = this.state === "error";
    const showCloseButton = this.state === "error" || this.state === "complete";

    app.innerHTML = `
      <div class="installer-container">
        <div class="drag-region"></div>
        <button class="close-button" id="closeBtn">
          ${CLOSE_SVG}
        </button>

        <div class="content">
          <div class="logo-container">
            <div class="${this.getLogoClass()}">
              ${LOGO_SVG}
            </div>
          </div>

          <h1 class="title">Voquill</h1>

          <p class="status">${this.state === "error" ? this.errorMessage : this.message}</p>

          <div class="progress-container ${showProgress ? "" : "hidden"}">
            <div class="${this.getProgressClass()}" style="width: ${this.progress}%"></div>
          </div>

          <div class="actions">
            <button class="btn btn-primary ${showLaunchButton ? "" : "hidden"}" id="launchBtn">
              Launch Voquill
            </button>
            <button class="btn btn-secondary ${showRetryButton ? "" : "hidden"}" id="retryBtn">
              Retry
            </button>
            <button class="btn btn-secondary ${showCloseButton ? "" : "hidden"}" id="exitBtn">
              ${this.state === "complete" ? "Close" : "Exit"}
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("closeBtn")?.addEventListener("click", () => {
      this.closeInstaller();
    });

    document.getElementById("launchBtn")?.addEventListener("click", () => {
      this.launchApp();
    });

    document.getElementById("retryBtn")?.addEventListener("click", () => {
      this.startInstall();
    });

    document.getElementById("exitBtn")?.addEventListener("click", () => {
      this.closeInstaller();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Installer();
});
