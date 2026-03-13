import type {
  SidecarReadyEvent,
  SidecarRequest,
  SidecarResponse,
} from "@repo/types";
import { handleSidecarRequest } from "../actions/sidecar-handler.actions";
import { produceAppState } from "../store";
import { getLogger } from "../utils/log.utils";
import type { ShellChildProcess } from "../utils/tauri-shell.utils";
import { BaseSidecar, type SidecarRuntime } from "./base.sidecar";
import { toErrorMessage } from "./sidecar.utils";

const AI_SIDECAR_HOST = "127.0.0.1";
const AI_SIDECAR_BINARY_NAME = "binaries/voquill-ai-sidecar";
const AI_SIDECAR_STARTUP_TIMEOUT_MS = 15_000;
const AI_SIDECAR_HEALTH_TIMEOUT_MS = 2_000;
const AI_SIDECAR_HEALTH_POLL_INTERVAL_MS = 150;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isReadyEvent = (value: unknown): value is SidecarReadyEvent =>
  isObject(value) && value.type === "ready" && typeof value.port === "number";

const isSidecarRequest = (value: unknown): value is SidecarRequest =>
  isObject(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  value.type !== "ready" &&
  !("status" in value);

export class AiSidecar extends BaseSidecar {
  private apiKey: string | null = null;

  constructor() {
    super({
      binaryName: AI_SIDECAR_BINARY_NAME,
      host: AI_SIDECAR_HOST,
      startupTimeoutMs: AI_SIDECAR_STARTUP_TIMEOUT_MS,
      healthTimeoutMs: AI_SIDECAR_HEALTH_TIMEOUT_MS,
      healthPollIntervalMs: AI_SIDECAR_HEALTH_POLL_INTERVAL_MS,
      logPrefix: "ai-sidecar",
    });
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  protected async buildSpawnEnv(): Promise<Record<string, string>> {
    this.apiKey = crypto.randomUUID();
    return {
      MASTRA_PORT: "0",
      SIDECAR_API_KEY: this.apiKey,
    };
  }

  protected parsePortFromLine(line: string): number | null {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return null;
    }

    if (isReadyEvent(message)) {
      return message.port;
    }

    return null;
  }

  protected handleStdoutLine(line: string, child: ShellChildProcess): void {
    getLogger().verbose("[ai-sidecar] handleStdoutLine:", line.slice(0, 120));

    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      getLogger().verbose(`[ai-sidecar] stdout: ${line}`);
      return;
    }

    if (isSidecarRequest(message)) {
      getLogger().verbose(
        "[ai-sidecar] Received request:",
        (message as SidecarRequest).type,
      );
      const respond = async (response: SidecarResponse): Promise<void> => {
        try {
          await child.write(`${JSON.stringify(response)}\n`);
        } catch (error) {
          getLogger().warning(
            `[ai-sidecar] Failed to write stdin response: ${toErrorMessage(error)}`,
          );
        }
      };

      void handleSidecarRequest(message, respond);
      return;
    }

    getLogger().verbose(`[ai-sidecar] stdout: ${line}`);
  }

  protected override onStarting(): void {
    this.setAiSidecarState({
      status: "starting",
      port: null,
      apiKey: null,
      errorMessage: null,
    });
  }

  protected onStarted(runtime: SidecarRuntime): void {
    this.setAiSidecarState({
      status: "running",
      port: runtime.port,
      apiKey: this.apiKey,
      errorMessage: null,
    });
  }

  protected onStopped(): void {
    this.apiKey = null;
    this.setAiSidecarState({
      status: "idle",
      port: null,
      apiKey: null,
      errorMessage: null,
    });
  }

  protected onError(message: string): void {
    this.setAiSidecarState({
      status: "error",
      port: null,
      apiKey: null,
      errorMessage: message,
    });
  }

  protected async checkHealthResponse(response: Response): Promise<boolean> {
    const payload = (await response.json()) as { ok?: boolean };
    return payload.ok === true;
  }

  private setAiSidecarState({
    status,
    port,
    apiKey,
    errorMessage,
  }: {
    status: "idle" | "starting" | "running" | "error";
    port: number | null;
    apiKey: string | null;
    errorMessage: string | null;
  }) {
    produceAppState((draft) => {
      draft.aiSidecar.status = status;
      draft.aiSidecar.port = port;
      draft.aiSidecar.apiKey = apiKey;
      draft.aiSidecar.errorMessage = errorMessage;
    });
  }
}
