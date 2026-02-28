import { appDataDir, join } from "@tauri-apps/api/path";
import { fetch } from "@tauri-apps/plugin-http";
import {
  LOCAL_WHISPER_MODELS,
  LocalWhisperModel,
} from "./local-transcription.utils";
import { getLogger } from "./log.utils";
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

type SidecarProcessorResponse = {
  id: string;
  kind: "cpu" | "gpu";
  name: string;
  index: number;
  freeMemoryBytes: number | null;
  totalMemoryBytes: number | null;
};

type SidecarProcessorListResponse = {
  processors: SidecarProcessorResponse[];
  selectedProcessorId: string;
};

type SidecarSelectedProcessorResponse = {
  processor: SidecarProcessorResponse;
};

type SidecarRuntime = {
  mode: SidecarMode;
  baseUrl: string;
  child: ShellChildProcess;
  selectedProcessorId?: string;
};

export type LocalSidecarModelStatus = SidecarModelStatusResponse;
export type LocalSidecarDownloadSnapshot = SidecarDownloadSnapshot;
export type LocalSidecarProcessor = SidecarProcessorResponse;

export type LocalSidecarTranscribeInput = {
  model: LocalWhisperModel;
  samples: number[];
  sampleRate: number;
  language?: string;
  initialPrompt?: string;
  preferGpu: boolean;
  processorId?: string;
};

export type LocalSidecarTranscribeOutput = {
  text: string;
  model: LocalWhisperModel;
  inferenceDevice: string;
  durationMs: number;
  mode: SidecarMode;
};

const SIDECAR_HOST = "127.0.0.1";
const SIDECAR_DYNAMIC_PORT = "0";
const SIDECAR_BOUND_PORT_PREFIX = "RUST_TRANSCRIPTION_BOUND_PORT=";
const SIDECAR_HEALTH_TIMEOUT_MS = 2_000;
const SIDECAR_STARTUP_TIMEOUT_MS = 15_000;
const SIDECAR_STARTUP_POLL_INTERVAL_MS = 150;
const SIDECAR_REQUEST_TIMEOUT_MS = 120_000;
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
    processorId,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
    validate?: boolean;
    processorId?: string;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    return await this.getModelStatusByMode(
      runtime.mode,
      model,
      validate,
      SIDECAR_REQUEST_RETRIES,
      processorId,
    );
  }

  async listModelStatuses({
    preferGpu,
    validate = true,
    models = LOCAL_WHISPER_MODELS,
    processorId,
  }: {
    preferGpu: boolean;
    validate?: boolean;
    models?: LocalWhisperModel[];
    processorId?: string;
  }): Promise<Record<LocalWhisperModel, LocalSidecarModelStatus>> {
    const runtime = await this.resolveRuntime(preferGpu);
    const statuses = await Promise.all(
      models.map(async (model) => {
        const status = await this.getModelStatusByMode(
          runtime.mode,
          model,
          validate,
          SIDECAR_REQUEST_RETRIES,
          processorId,
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
    processorId,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
    onProgress?: (snapshot: LocalSidecarDownloadSnapshot) => void;
    processorId?: string;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    await this.downloadModelOnMode(
      runtime.mode,
      model,
      onProgress,
      processorId,
    );

    const finalStatus = await this.getModelStatusByMode(
      runtime.mode,
      model,
      true,
      SIDECAR_REQUEST_RETRIES,
      processorId,
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
    processorId,
  }: {
    model: LocalWhisperModel;
    preferGpu: boolean;
    processorId?: string;
  }): Promise<LocalSidecarModelStatus> {
    const runtime = await this.resolveRuntime(preferGpu);
    const status = await this.requestModeJson<SidecarModelStatusResponse>(
      runtime.mode,
      `/v1/models/${model}`,
      {
        method: "DELETE",
      },
      {
        processorId,
      },
    );

    this.invalidateModelReadiness(model);
    return status;
  }

  async listProcessors({
    preferGpu,
  }: {
    preferGpu: boolean;
  }): Promise<LocalSidecarProcessor[]> {
    const runtime = await this.resolveRuntime(preferGpu);
    const response = await this.requestModeJson<SidecarProcessorListResponse>(
      runtime.mode,
      "/v1/processors",
    );

    runtime.selectedProcessorId = response.selectedProcessorId;
    return response.processors;
  }

  async getSelectedProcessor({
    preferGpu,
  }: {
    preferGpu: boolean;
  }): Promise<LocalSidecarProcessor> {
    const runtime = await this.resolveRuntime(preferGpu);
    const response =
      await this.requestModeJson<SidecarSelectedProcessorResponse>(
        runtime.mode,
        "/v1/processors/selected",
      );
    runtime.selectedProcessorId = response.processor.id;
    return response.processor;
  }

  async selectProcessor({
    preferGpu,
    processorId,
  }: {
    preferGpu: boolean;
    processorId: string;
  }): Promise<LocalSidecarProcessor> {
    const runtime = await this.resolveRuntime(preferGpu);
    const response =
      await this.requestModeJson<SidecarSelectedProcessorResponse>(
        runtime.mode,
        "/v1/processors/selected",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ processorId }),
        },
      );
    runtime.selectedProcessorId = response.processor.id;
    return response.processor;
  }

  async transcribe(
    input: LocalSidecarTranscribeInput,
  ): Promise<LocalSidecarTranscribeOutput> {
    const runtime = await this.resolveRuntime(input.preferGpu);

    try {
      return await this.transcribeInMode(
        runtime.mode,
        input,
        input.processorId,
      );
    } catch (error) {
      if (
        input.preferGpu &&
        runtime.mode === "gpu" &&
        this.shouldFallbackToCpu(error)
      ) {
        this.markGpuUnavailable(error);
        return await this.transcribeInMode("cpu", input, input.processorId);
      }

      throw error;
    }
  }

  private async transcribeInMode(
    mode: SidecarMode,
    input: LocalSidecarTranscribeInput,
    processorId?: string,
  ): Promise<LocalSidecarTranscribeOutput> {
    await this.ensureModelReady(mode, input.model, processorId);

    try {
      const result = await this.requestModeJson<SidecarTranscriptionResponse>(
        mode,
        "/v1/transcriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.toTranscribeRequestBody(input),
        },
        {
          processorId,
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
      await this.downloadModelOnMode(mode, input.model, undefined, processorId);

      const retry = await this.requestModeJson<SidecarTranscriptionResponse>(
        mode,
        "/v1/transcriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.toTranscribeRequestBody(input),
        },
        {
          processorId,
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
    const binaryName =
      mode === "gpu"
        ? "binaries/rust-transcription-gpu"
        : "binaries/rust-transcription-cpu";
    const modelsDir = await this.resolveModelsDir();
    let stdoutBuffer = "";
    let resolveBoundPort: ((port: number) => void) | null = null;
    let rejectBoundPort: ((reason?: unknown) => void) | null = null;
    const boundPortPromise = new Promise<number>((resolve, reject) => {
      resolveBoundPort = resolve;
      rejectBoundPort = reject;
    });
    const failBoundPort = (message: string): void => {
      if (!rejectBoundPort) {
        return;
      }
      rejectBoundPort(new Error(message));
      resolveBoundPort = null;
      rejectBoundPort = null;
    };
    const handleStdout = (chunk: string): void => {
      if (!resolveBoundPort) {
        return;
      }

      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const port = this.parseBoundPortLine(line);
        if (port === null) {
          continue;
        }
        resolveBoundPort(port);
        resolveBoundPort = null;
        rejectBoundPort = null;
        return;
      }
    };

    let childPid = -1;
    const child = await spawnShellSidecar({
      program: binaryName,
      options: {
        env: {
          RUST_TRANSCRIPTION_HOST: SIDECAR_HOST,
          RUST_TRANSCRIPTION_PORT: SIDECAR_DYNAMIC_PORT,
          RUST_TRANSCRIPTION_MODELS_DIR: modelsDir,
        },
      },
      onStdout: handleStdout,
      onClose: (payload) => {
        const runtime = this.runtimes.get(mode);
        if (runtime?.child.pid === childPid) {
          this.runtimes.delete(mode);
        }
        failBoundPort(
          `${mode.toUpperCase()} sidecar exited before startup completed (code=${payload.code ?? "unknown"}, signal=${payload.signal ?? "unknown"})`,
        );
      },
      onError: (message) => {
        getLogger().warning(`[local-sidecar:${mode}] ${message}`);
        failBoundPort(
          `${mode.toUpperCase()} sidecar failed before startup completed: ${message}`,
        );
      },
    });
    childPid = child.pid;

    let port = 0;
    let baseUrl = "";
    try {
      port = await this.waitForBoundPort(mode, boundPortPromise);
      baseUrl = `http://${SIDECAR_HOST}:${port}`;
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

  private parseBoundPortLine(line: string): number | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SIDECAR_BOUND_PORT_PREFIX)) {
      return null;
    }

    const portValue = trimmed.slice(SIDECAR_BOUND_PORT_PREFIX.length).trim();
    const port = Number.parseInt(portValue, 10);
    if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
      return null;
    }

    return port;
  }

  private async waitForBoundPort(
    mode: SidecarMode,
    boundPortPromise: Promise<number>,
  ): Promise<number> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for ${mode.toUpperCase()} transcription sidecar port announcement`,
          ),
        );
      }, SIDECAR_STARTUP_TIMEOUT_MS);
    });

    return await Promise.race([boundPortPromise, timeoutPromise]);
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
    processorId?: string,
  ): Promise<void> {
    const cacheKey = `${mode}:${processorId ?? "default"}:${model}`;
    const existing = this.readyModels.get(cacheKey);
    if (existing) {
      return await existing;
    }

    const pending = this.ensureModelReadyInternal(mode, model, processorId)
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
    processorId?: string,
  ): Promise<void> {
    const currentStatus = await this.getModelStatusByMode(
      mode,
      model,
      true,
      1,
      processorId,
    );

    if (!currentStatus.downloaded || !currentStatus.valid) {
      await this.downloadModelOnMode(mode, model, undefined, processorId);
    }

    const finalStatus = await this.getModelStatusByMode(
      mode,
      model,
      true,
      1,
      processorId,
    );

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
    processorId?: string,
  ): Promise<LocalSidecarModelStatus> {
    return await this.requestModeJson<SidecarModelStatusResponse>(
      mode,
      `/v1/models/${model}/status?validate=${validate ? "true" : "false"}`,
      undefined,
      {
        retries,
        processorId,
      },
    );
  }

  private async downloadModelOnMode(
    mode: SidecarMode,
    model: LocalWhisperModel,
    onProgress?: (snapshot: LocalSidecarDownloadSnapshot) => void,
    processorId?: string,
  ): Promise<void> {
    const job = await this.requestModeJson<SidecarDownloadSnapshot>(
      mode,
      `/v1/models/${model}/download`,
      {
        method: "POST",
      },
      {
        processorId,
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
          processorId,
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
      processorId?: string;
    },
  ): Promise<T> {
    const retries = options?.retries ?? SIDECAR_REQUEST_RETRIES;
    const timeoutMs = options?.timeoutMs ?? SIDECAR_REQUEST_TIMEOUT_MS;
    const processorId = options?.processorId;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const runtime = await this.ensureRuntime(mode);
      try {
        await this.syncRuntimeProcessor(runtime, processorId);
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

  private async syncRuntimeProcessor(
    runtime: SidecarRuntime,
    processorId?: string,
  ): Promise<void> {
    if (
      !processorId ||
      !processorId.startsWith(`${runtime.mode}:`) ||
      runtime.selectedProcessorId === processorId
    ) {
      return;
    }

    const response =
      await this.requestJsonByBaseUrl<SidecarSelectedProcessorResponse>(
        runtime.baseUrl,
        "/v1/processors/selected",
        {
          init: {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ processorId }),
          },
        },
      );

    runtime.selectedProcessorId = response.processor.id;
    if (response.processor.id !== processorId) {
      throw new SidecarRequestError(
        `Sidecar selected unexpected processor '${response.processor.id}'`,
      );
    }
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
