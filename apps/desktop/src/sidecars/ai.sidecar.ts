import type {
  SidecarReadyEvent,
  SidecarRequest,
  SidecarResponse,
} from "@repo/types";
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

  protected async buildSpawnEnv(): Promise<Record<string, string>> {
    return {
      MASTRA_PORT: "0",
      SIDECAR_API_KEY: crypto.randomUUID(),
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
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      getLogger().verbose(`[ai-sidecar] stdout: ${line}`);
      return;
    }

    if (isSidecarRequest(message)) {
      void this.respondToRequest(child, message);
      return;
    }

    getLogger().verbose(`[ai-sidecar] stdout: ${line}`);
  }

  protected override onStarting(): void {
    this.setAiSidecarState({ status: "starting", port: null, errorMessage: null });
  }

  protected onStarted(runtime: SidecarRuntime): void {
    this.setAiSidecarState({
      status: "running",
      port: runtime.port,
      errorMessage: null,
    });
  }

  protected onStopped(): void {
    this.setAiSidecarState({ status: "idle", port: null, errorMessage: null });
  }

  protected onError(message: string): void {
    this.setAiSidecarState({ status: "error", port: null, errorMessage: message });
  }

  protected async checkHealthResponse(response: Response): Promise<boolean> {
    const payload = (await response.json()) as { ok?: boolean };
    return payload.ok === true;
  }

  private setAiSidecarState({
    status,
    port,
    errorMessage,
  }: {
    status: "idle" | "starting" | "running" | "error";
    port: number | null;
    errorMessage: string | null;
  }) {
    produceAppState((draft) => {
      draft.aiSidecar.status = status;
      draft.aiSidecar.port = port;
      draft.aiSidecar.errorMessage = errorMessage;
    });
  }

  private async respondToRequest(
    child: ShellChildProcess,
    request: SidecarRequest,
  ): Promise<void> {
    const response: SidecarResponse =
      request.type === "tools/list"
        ? {
            id: request.id,
            status: "ok",
            result: { tools: [] },
          }
        : {
            id: request.id,
            status: "error",
            error:
              request.type === "llm/chat"
                ? "Desktop LLM bridge is not implemented yet."
                : `Unsupported AI sidecar request: ${request.type}`,
          };

    try {
      await child.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      getLogger().warning(
        `[ai-sidecar] Failed to write stdin response for ${request.type}: ${toErrorMessage(error)}`,
      );
    }
  }
}
