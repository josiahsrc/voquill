import type { ShellChildProcess } from "../utils/tauri-shell.utils";
import { spawnShellSidecar } from "../utils/tauri-shell.utils";
import { getLogger } from "../utils/log.utils";
import {
  createDeferred,
  fetchWithTimeout,
  sleep,
  toErrorMessage,
} from "./sidecar.utils";

export type SidecarConfig = {
  binaryName: string;
  host: string;
  startupTimeoutMs: number;
  healthTimeoutMs: number;
  healthPollIntervalMs: number;
  logPrefix: string;
  idleDisposeMs?: number;
};

export type SidecarRuntime = {
  port: number;
  baseUrl: string;
  child: ShellChildProcess;
};

export abstract class BaseSidecar {
  private runtime: SidecarRuntime | null = null;
  private startupPromise: Promise<SidecarRuntime> | null = null;
  private stoppingPid: number | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(protected readonly config: SidecarConfig) {}

  async ensureStarted(): Promise<SidecarRuntime> {
    this.cancelIdleTimer();

    if (this.runtime) {
      return this.runtime;
    }

    if (this.startupPromise) {
      return await this.startupPromise;
    }

    this.startupPromise = this.startInternal()
      .catch((error) => {
        const message = toErrorMessage(error);
        getLogger().error(
          `[${this.config.logPrefix}] Failed to start: ${message}`,
        );
        this.onError(message);
        throw error;
      })
      .finally(() => {
        this.startupPromise = null;
      });

    return await this.startupPromise;
  }

  async dispose(): Promise<void> {
    this.cancelIdleTimer();
    const runtime = this.runtime;
    this.runtime = null;

    if (!runtime) {
      this.onStopped();
      return;
    }

    this.stoppingPid = runtime.child.pid;
    this.onStopped();

    try {
      await runtime.child.kill();
    } catch (error) {
      getLogger().warning(
        `[${this.config.logPrefix}] Failed to stop pid=${runtime.child.pid}: ${toErrorMessage(error)}`,
      );
    } finally {
      this.stoppingPid = null;
    }
  }

  getRuntime(): SidecarRuntime | null {
    return this.runtime;
  }

  isRunning(): boolean {
    return this.runtime !== null;
  }

  protected async resetRuntime(): Promise<void> {
    this.cancelIdleTimer();
    const runtime = this.runtime;
    this.runtime = null;
    if (runtime) {
      await runtime.child.kill().catch(() => {});
    }
  }

  protected markActivity(): void {
    if (this.config.idleDisposeMs == null || !this.runtime) {
      return;
    }

    this.cancelIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      getLogger().info(
        `[${this.config.logPrefix}] idle for ${this.config.idleDisposeMs}ms, disposing to free resources`,
      );
      void this.dispose().catch((error) => {
        getLogger().warning(
          `[${this.config.logPrefix}] idle dispose failed: ${toErrorMessage(error)}`,
        );
      });
    }, this.config.idleDisposeMs);
  }

  private cancelIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  protected abstract buildSpawnEnv(): Promise<Record<string, string>>;
  protected abstract parsePortFromLine(line: string): number | null;
  protected abstract handleStdoutLine(
    line: string,
    child: ShellChildProcess,
  ): void;
  protected abstract onStarted(runtime: SidecarRuntime): void;
  protected abstract onStopped(): void;
  protected abstract onError(message: string): void;
  protected abstract checkHealthResponse(response: Response): Promise<boolean>;

  private async startInternal(): Promise<SidecarRuntime> {
    this.onStarting();

    const env = await this.buildSpawnEnv();
    const ready = createDeferred<number>();
    const pendingStdoutLines: string[] = [];
    let stdoutBuffer = "";
    let childPid = -1;
    let child: ShellChildProcess | null = null;

    const failReady = (message: string) => {
      ready.reject(new Error(message));
    };

    child = await spawnShellSidecar({
      program: this.config.binaryName,
      options: { env },
      onStdout: (chunk) => {
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!child) {
            pendingStdoutLines.push(line);
            continue;
          }

          this.processStdoutLine(line, child, ready);
        }
      },
      onStderr: (chunk) => {
        getLogger().warning(
          `[${this.config.logPrefix}:${childPid}] ${chunk.trimEnd()}`,
        );
      },
      onClose: (payload) => {
        if (this.stoppingPid === childPid) {
          this.stoppingPid = null;
          return;
        }

        if (this.runtime?.child.pid === childPid) {
          this.runtime = null;
        }

        const message =
          `Sidecar exited (code=${payload.code ?? "unknown"}, ` +
          `signal=${payload.signal ?? "unknown"})`;
        getLogger().warning(`[${this.config.logPrefix}] ${message}`);
        this.onError(message);
        failReady(message);
      },
      onError: (message) => {
        getLogger().warning(`[${this.config.logPrefix}] ${message}`);
        failReady(`Sidecar failed before startup completed: ${message}`);
      },
    });
    childPid = child.pid;

    for (const line of pendingStdoutLines) {
      this.processStdoutLine(line, child, ready);
    }

    const port = await this.waitForPort(ready.promise);
    const baseUrl = `http://${this.config.host}:${port}`;

    try {
      await this.waitUntilHealthy(baseUrl);
    } catch (error) {
      await child.kill().catch(() => {});
      throw error;
    }

    const runtime: SidecarRuntime = { port, baseUrl, child };
    this.runtime = runtime;
    this.onStarted(runtime);

    getLogger().info(
      `[${this.config.logPrefix}] started (pid=${child.pid}, port=${port})`,
    );

    return runtime;
  }

  protected onStarting(): void {}

  private processStdoutLine(
    line: string,
    child: ShellChildProcess,
    ready: import("./sidecar.utils").Deferred<number>,
  ) {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const port = this.parsePortFromLine(trimmed);
    if (port !== null) {
      ready.resolve(port);
      return;
    }

    this.handleStdoutLine(trimmed, child);
  }

  private async waitForPort(portPromise: Promise<number>): Promise<number> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Timed out waiting for ${this.config.logPrefix} readiness`),
        );
      }, this.config.startupTimeoutMs);
    });

    return await Promise.race([portPromise, timeoutPromise]);
  }

  private async waitUntilHealthy(baseUrl: string): Promise<void> {
    const deadline = Date.now() + this.config.startupTimeoutMs;

    while (Date.now() < deadline) {
      if (await this.checkHealth(baseUrl)) {
        return;
      }

      await sleep(this.config.healthPollIntervalMs);
    }

    throw new Error(`Timed out waiting for ${this.config.logPrefix} health`);
  }

  private async checkHealth(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/health`,
        undefined,
        this.config.healthTimeoutMs,
      );
      if (!response.ok) {
        return false;
      }

      return await this.checkHealthResponse(response);
    } catch {
      return false;
    }
  }
}
