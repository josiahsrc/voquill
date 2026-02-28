import { appDataDir, join } from "@tauri-apps/api/path";
import { fetch } from "@tauri-apps/plugin-http";
import { getLogger } from "./log.utils";
import {
  LOCAL_WHISPER_MODELS,
  LocalWhisperModel,
} from "./local-transcription.utils";
import { ShellChildProcess, spawnShellSidecar } from "./tauri-shell.utils";

type SidecarMode = "cpu" | "gpu";
type DownloadJobStatus = "pending" | "running" | "completed" | "failed";

type SidecarHealthResponse = {
  status: string;
  mode: string;
};

type SidecarModelStatusResponse = {
  model: LocalWhisperModel;
  downloaded: boolean;
  valid: boolean;
  fileBytes: number | null;
  validationError: string | null;
};

type SidecarDownloadSnapshot = {
  jobId: string;
  model: LocalWhisperModel;
  status: DownloadJobStatus;
  bytesDownloaded: number;
  totalBytes: number | null;
  progress: number | null;
  error: string | null;
};

type SidecarTranscriptionResponse = {
  text: string;
  model: LocalWhisperModel;
  inferenceDevice: string;
  durationMs: number;
};

type SidecarRuntime = {
  mode: SidecarMode;
  baseUrl: string;
  child: ShellChildProcess;
};

export type LocalSidecarModelStatus = SidecarModelStatusResponse;
export type LocalSidecarDownloadSnapshot = SidecarDownloadSnapshot;

export type LocalSidecarTranscribeInput = {
  model: LocalWhisperModel;
  samples: number[];
  sampleRate: number;
  language?: string;
  initialPrompt?: string;
  preferGpu: boolean;
};

export type LocalSidecarTranscribeOutput = {
  text: string;
  model: LocalWhisperModel;
  inferenceDevice: string;
  durationMs: number;
  mode: SidecarMode;
};

const SIDECAR_HOST = "127.0.0.1";
const SIDECAR_PORT_BY_MODE: Record<SidecarMode, number> = {
  cpu: 7771,
  gpu: 7772,
};
const SIDECAR_HEALTH_TIMEOUT_MS = 2_000;
const SIDECAR_STARTUP_TIMEOUT_MS = 15_000;
const SIDECAR_STARTUP_POLL_INTERVAL_MS = 150;
const SIDECAR_REQUEST_TIMEOUT_MS = 25_000;
const SIDECAR_REQUEST_RETRIES = 2;
const SIDECAR_REQUEST_RETRY_DELAY_MS = 250;
const MODEL_DOWNLOAD_TIMEOUT_MS = 45 * 60 * 1_000;
const MODEL_DOWNLOAD_POLL_INTERVAL_MS = 500;

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

class SidecarRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "SidecarRequestError";
    this.status = status;
    this.code = code;
  }
}

export class LocalTranscriptionSidecarManager {
  private runtimes = new Map<SidecarMode, SidecarRuntime>();
  private starting = new Map<SidecarMode, Promise<SidecarRuntime>>();
  private readyModels = new Map<string, Promise<void>>();
  private modelsDirPromise: Promise<string> | null = null;
  private gpuUnavailable = false;

  async getModelStatus({
    model,
    preferGpu,
    validate = true,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
    validate?: boolean;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    return await this.getModelStatusByMode(runtime.mode, model, validate);
  }

  async listModelStatuses({
    preferGpu,
    validate = true,
    models = LOCAL_WHISPER_MODELS,
  }: {
    preferGpu: boolean;
    validate?: boolean;
    models?: LocalWhisperModel[];
  }): Promise<Record<LocalWhisperModel, LocalSidecarModelStatus>> {
    const runtime = await this.resolveRuntime(preferGpu);
    const statuses = await Promise.all(
      models.map(async (model) => {
        const status = await this.getModelStatusByMode(
          runtime.mode,
          model,
          validate,
        );
        return [model, status] as const;
      }),
    );

    const map = {} as Record<LocalWhisperModel, LocalSidecarModelStatus>;
    for (const [model, status] of statuses) {
      map[model] = status;
    }

    return map;
  }

  async downloadModel({
    model,
    preferGpu,
    onProgress,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
    onProgress?: (snapshot: LocalSidecarDownloadSnapshot) => void;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    await this.downloadModelOnMode(runtime.mode, model, onProgress);

    const finalStatus = await this.getModelStatusByMode(
      runtime.mode,
      model,
      true,
    );
    if (!finalStatus.downloaded || !finalStatus.valid) {
      throw new Error(
        finalStatus.validationError ||
          `Model '${model}' failed validation (${runtime.mode.toUpperCase()})`,
      );
    }

    this.markModelReady(runtime.mode, model);
    return finalStatus;
  }

  async deleteModel({
    model,
    preferGpu,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    const status = await this.requestModeJson<SidecarModelStatusResponse>(
      runtime.mode,
      `/v1/models/${model}`,
      {
        method: "DELETE",
      },
    );

    this.invalidateModelReadiness(model);
    return status;
  }

  async transcribe(
    input: LocalSidecarTranscribeInput,
  ): Promise<LocalSidecarTranscribeOutput> {
    const runtime = await this.resolveRuntime(input.preferGpu);

    try {
      return await this.transcribeInMode(runtime.mode, input);
    } catch (error) {
      if (
        input.preferGpu &&
        runtime.mode === "gpu" &&
        this.shouldFallbackToCpu(error)
      ) {
        this.markGpuUnavailable(error);
        return await this.transcribeInMode("cpu", input);
      }

      throw error;
    }
  }

  private async transcribeInMode(
    mode: SidecarMode,
    input: LocalSidecarTranscribeInput,
  ): Promise<LocalSidecarTranscribeOutput> {
    await this.ensureModelReady(mode, input.model);

    try {
      const result = await this.requestModeJson<SidecarTranscriptionResponse>(
        mode,
        "/v1/transcriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.toTranscribeRequestBody(input),
        },
      );

      this.markModelReady(mode, input.model);

      return {
        text: result.text,
        model: result.model,
        inferenceDevice: result.inferenceDevice,
        durationMs: result.durationMs,
        mode,
      };
    } catch (error) {
      if (!this.isModelMissingError(error)) {
        throw error;
      }

      this.invalidateModelReadiness(input.model);
      await this.downloadModelOnMode(mode, input.model);

      const retry = await this.requestModeJson<SidecarTranscriptionResponse>(
        mode,
        "/v1/transcriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.toTranscribeRequestBody(input),
        },
      );

      this.markModelReady(mode, input.model);

      return {
        text: retry.text,
        model: retry.model,
        inferenceDevice: retry.inferenceDevice,
        durationMs: retry.durationMs,
        mode,
      };
    }
  }

  private toTranscribeRequestBody(input: LocalSidecarTranscribeInput): string {
    return JSON.stringify({
      model: input.model,
      samples: input.samples,
      sampleRate: input.sampleRate,
      language: input.language,
      initialPrompt: input.initialPrompt,
    });
  }

  private async resolveRuntime(preferGpu: boolean): Promise<SidecarRuntime> {
    if (preferGpu && !this.gpuUnavailable) {
      try {
        return await this.ensureRuntime("gpu");
      } catch (error) {
        this.markGpuUnavailable(error);
      }
    }

    return await this.ensureRuntime("cpu");
  }

  private async ensureRuntime(mode: SidecarMode): Promise<SidecarRuntime> {
    const existing = this.runtimes.get(mode);
    if (existing) {
      const healthy = await this.checkHealth(existing.baseUrl, mode);
      if (healthy) {
        return existing;
      }
      await this.disposeRuntime(mode);
    }

    const pending = this.starting.get(mode);
    if (pending) {
      return await pending;
    }

    const startPromise = this.startRuntime(mode).finally(() => {
      this.starting.delete(mode);
    });
    this.starting.set(mode, startPromise);
    return await startPromise;
  }

  private async startRuntime(mode: SidecarMode): Promise<SidecarRuntime> {
    const port = SIDECAR_PORT_BY_MODE[mode];
    const binaryName =
      mode === "gpu"
        ? "binaries/rust-transcription-gpu"
        : "binaries/rust-transcription-cpu";
    const modelsDir = await this.resolveModelsDir();
    const baseUrl = `http://${SIDECAR_HOST}:${port}`;

    let childPid = -1;
    const child = await spawnShellSidecar({
      program: binaryName,
      options: {
        env: {
          RUST_TRANSCRIPTION_HOST: SIDECAR_HOST,
          RUST_TRANSCRIPTION_PORT: String(port),
          RUST_TRANSCRIPTION_MODELS_DIR: modelsDir,
        },
      },
      onClose: () => {
        const runtime = this.runtimes.get(mode);
        if (runtime?.child.pid === childPid) {
          this.runtimes.delete(mode);
        }
      },
      onError: (message) => {
        getLogger().warning(`[local-sidecar:${mode}] ${message}`);
      },
    });
    childPid = child.pid;

    try {
      await this.waitUntilHealthy(baseUrl, mode);
    } catch (error) {
      await child.kill().catch(() => {});
      throw error;
    }

    const runtime: SidecarRuntime = {
      mode,
      baseUrl,
      child,
    };

    this.runtimes.set(mode, runtime);
    if (mode === "gpu") {
      this.gpuUnavailable = false;
    }

    getLogger().info(
      `[local-sidecar:${mode}] started (pid=${runtime.child.pid}, port=${port})`,
    );

    return runtime;
  }

  private async waitUntilHealthy(
    baseUrl: string,
    mode: SidecarMode,
  ): Promise<void> {
    const deadline = Date.now() + SIDECAR_STARTUP_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (await this.checkHealth(baseUrl, mode)) {
        return;
      }
      await sleep(SIDECAR_STARTUP_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Timed out waiting for ${mode.toUpperCase()} transcription sidecar health`,
    );
  }

  private async checkHealth(
    baseUrl: string,
    mode: SidecarMode,
  ): Promise<boolean> {
    try {
      const response = await this.requestJsonByBaseUrl<SidecarHealthResponse>(
        baseUrl,
        "/health",
        {
          timeoutMs: SIDECAR_HEALTH_TIMEOUT_MS,
          retries: 1,
        },
      );

      return response.status === "ok" && response.mode === mode;
    } catch {
      return false;
    }
  }

  private async ensureModelReady(
    mode: SidecarMode,
    model: LocalWhisperModel,
  ): Promise<void> {
    const cacheKey = `${mode}:${model}`;
    const existing = this.readyModels.get(cacheKey);
    if (existing) {
      return await existing;
    }

    const pending = this.ensureModelReadyInternal(mode, model)
      .then(() => undefined)
      .catch((error) => {
        this.readyModels.delete(cacheKey);
        throw error;
      });

    this.readyModels.set(cacheKey, pending);
    await pending;
  }

  private async ensureModelReadyInternal(
    mode: SidecarMode,
    model: LocalWhisperModel,
  ): Promise<void> {
    const currentStatus = await this.getModelStatusByMode(mode, model, true, 1);

    if (!currentStatus.downloaded || !currentStatus.valid) {
      await this.downloadModelOnMode(mode, model);
    }

    const finalStatus = await this.getModelStatusByMode(mode, model, true, 1);

    if (!finalStatus.downloaded || !finalStatus.valid) {
      throw new Error(
        finalStatus.validationError ||
          `Model '${model}' failed validation (${mode.toUpperCase()})`,
      );
    }

    this.markModelReady(mode, model);
  }

  private async getModelStatusByMode(
    mode: SidecarMode,
    model: LocalWhisperModel,
    validate: boolean,
    retries = SIDECAR_REQUEST_RETRIES,
  ): Promise<LocalSidecarModelStatus> {
    return await this.requestModeJson<SidecarModelStatusResponse>(
      mode,
      `/v1/models/${model}/status?validate=${validate ? "true" : "false"}`,
      undefined,
      {
        retries,
      },
    );
  }

  private async downloadModelOnMode(
    mode: SidecarMode,
    model: LocalWhisperModel,
    onProgress?: (snapshot: LocalSidecarDownloadSnapshot) => void,
  ): Promise<void> {
    const job = await this.requestModeJson<SidecarDownloadSnapshot>(
      mode,
      `/v1/models/${model}/download`,
      {
        method: "POST",
      },
    );

    onProgress?.(job);

    if (job.status === "completed") {
      return;
    }

    if (job.status === "failed") {
      throw new Error(
        job.error ||
          `Model download failed for '${model}' (${mode.toUpperCase()})`,
      );
    }

    const deadline = Date.now() + MODEL_DOWNLOAD_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const progress = await this.requestModeJson<SidecarDownloadSnapshot>(
        mode,
        `/v1/models/${model}/download/${job.jobId}`,
        undefined,
        {
          retries: 1,
        },
      );

      onProgress?.(progress);

      if (progress.status === "completed") {
        return;
      }

      if (progress.status === "failed") {
        throw new Error(
          progress.error ||
            `Model download failed for '${model}' (${mode.toUpperCase()})`,
        );
      }

      await sleep(MODEL_DOWNLOAD_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Model download timed out for '${model}' (${mode.toUpperCase()})`,
    );
  }

  private markModelReady(mode: SidecarMode, model: LocalWhisperModel): void {
    this.readyModels.set(`${mode}:${model}`, Promise.resolve());
  }

  private invalidateModelReadiness(model: LocalWhisperModel): void {
    this.readyModels.delete(`cpu:${model}`);
    this.readyModels.delete(`gpu:${model}`);
  }

  private isModelMissingError(error: unknown): boolean {
    if (!(error instanceof SidecarRequestError)) {
      return false;
    }

    if (error.status !== 404) {
      return false;
    }

    return !error.code || error.code === "model_not_downloaded";
  }

  private async requestModeJson<T>(
    mode: SidecarMode,
    path: string,
    init?: RequestInit,
    options?: {
      timeoutMs?: number;
      retries?: number;
    },
  ): Promise<T> {
    const retries = options?.retries ?? SIDECAR_REQUEST_RETRIES;
    const timeoutMs = options?.timeoutMs ?? SIDECAR_REQUEST_TIMEOUT_MS;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const runtime = await this.ensureRuntime(mode);
      try {
        return await this.requestJsonByBaseUrl<T>(runtime.baseUrl, path, {
          init,
          timeoutMs,
          retries: 1,
        });
      } catch (error) {
        lastError = error;

        if (this.isTransportError(error)) {
          await this.disposeRuntime(mode);
        }

        if (attempt < retries && this.isRetriableError(error)) {
          await sleep(SIDECAR_REQUEST_RETRY_DELAY_MS * attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Request failed for ${mode} sidecar at ${path}`);
  }

  private async requestJsonByBaseUrl<T>(
    baseUrl: string,
    path: string,
    options?: {
      init?: RequestInit;
      timeoutMs?: number;
      retries?: number;
    },
  ): Promise<T> {
    const retries = options?.retries ?? SIDECAR_REQUEST_RETRIES;
    const timeoutMs = options?.timeoutMs ?? SIDECAR_REQUEST_TIMEOUT_MS;
    const init = options?.init;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(
          `${baseUrl}${path}`,
          init,
          timeoutMs,
        );

        if (!response.ok) {
          throw await this.buildHttpError(response);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt < retries && this.isRetriableError(error)) {
          await sleep(SIDECAR_REQUEST_RETRY_DELAY_MS * attempt);
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Request failed for ${path}`);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit | undefined,
    timeoutMs: number,
  ): Promise<Response> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let timeoutReject: ((reason?: unknown) => void) | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutReject = reject;
      timeoutHandle = setTimeout(() => {
        reject(new SidecarRequestError(`Request timed out: ${url}`));
      }, timeoutMs);
    });

    try {
      const fetchPromise = fetch(url, init);
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof SidecarRequestError) {
        throw error;
      }
      throw new SidecarRequestError(
        `Request failed for ${url}: ${this.toErrorMessage(error)}`,
      );
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (timeoutReject) {
        timeoutReject = null;
      }
    }
  }

  private async buildHttpError(
    response: Response,
  ): Promise<SidecarRequestError> {
    const status = response.status;
    const fallbackMessage = `Sidecar request failed (${status})`;

    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };

      const code = payload.error?.code;
      const message = payload.error?.message || fallbackMessage;
      return new SidecarRequestError(message, status, code);
    } catch {
      const text = await response.text().catch(() => "");
      return new SidecarRequestError(
        text.trim() || fallbackMessage,
        status,
        undefined,
      );
    }
  }

  private shouldFallbackToCpu(error: unknown): boolean {
    if (error instanceof SidecarRequestError) {
      return error.status === undefined;
    }

    const message = this.toErrorMessage(error).toLowerCase();
    return message.includes("sidecar") || message.includes("request failed");
  }

  private markGpuUnavailable(error: unknown): void {
    this.gpuUnavailable = true;
    getLogger().warning(
      `[local-sidecar:gpu] unavailable, falling back to CPU (${this.toErrorMessage(error)})`,
    );
  }

  private async disposeRuntime(mode: SidecarMode): Promise<void> {
    const runtime = this.runtimes.get(mode);
    if (!runtime) {
      return;
    }

    this.runtimes.delete(mode);
    await runtime.child.kill().catch(() => {});
  }

  private async resolveModelsDir(): Promise<string> {
    if (!this.modelsDirPromise) {
      this.modelsDirPromise = appDataDir().then(
        async (baseDir) => await join(baseDir, "transcription-models"),
      );
    }
    return await this.modelsDirPromise;
  }

  private isRetriableError(error: unknown): boolean {
    if (!(error instanceof SidecarRequestError)) {
      return false;
    }

    if (error.status === undefined) {
      return true;
    }

    return error.status >= 500;
  }

  private isTransportError(error: unknown): boolean {
    return error instanceof SidecarRequestError && error.status === undefined;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

let localTranscriptionSidecarManager: LocalTranscriptionSidecarManager | null =
  null;

export const getLocalTranscriptionSidecarManager =
  (): LocalTranscriptionSidecarManager => {
    if (!localTranscriptionSidecarManager) {
      localTranscriptionSidecarManager = new LocalTranscriptionSidecarManager();
    }
    return localTranscriptionSidecarManager;
  };
