import type { LogLevel } from "../types/log.types";

const LOG_LEVEL_KEY = "voquill_log_level";
const INFO_BUFFER_SIZE = 200;
const VERBOSE_BUFFER_SIZE = 2000;

let onBufferWrapCallback: (() => void) | null = null;

export const setOnBufferWrap = (cb: (() => void) | null): void => {
  onBufferWrapCallback = cb;
};

export class Logger {
  private buffer: string[];
  private head: number;
  private count: number;
  private level: LogLevel;

  constructor(level: LogLevel) {
    this.level = level;
    const size = level === "verbose" ? VERBOSE_BUFFER_SIZE : INFO_BUFFER_SIZE;
    this.buffer = Array.from<string>({ length: size });
    this.head = 0;
    this.count = 0;
  }

  private stringify(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return arg.stack ?? arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");
  }

  private write(tag: string, args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${tag}] ${this.stringify(args)}`;
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.buffer.length;
    if (this.count < this.buffer.length) {
      this.count += 1;
    } else if (this.head === 0 && onBufferWrapCallback) {
      setTimeout(onBufferWrapCallback, 0);
    }

    console.log(entry);
  }

  info(...args: unknown[]): void {
    this.write("INFO", args);
  }

  warning(...args: unknown[]): void {
    this.write("WARN", args);
  }

  error(...args: unknown[]): void {
    this.write("ERROR", args);
  }

  verbose(...args: unknown[]): void {
    if (this.level !== "verbose") return;
    this.write("VERBOSE", args);
  }

  getLogLevel(): LogLevel {
    return this.level;
  }

  getLogs(): string[] {
    if (this.count < this.buffer.length) {
      return this.buffer.slice(0, this.count);
    }
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }
}

let logger: Logger | null = null;

export const getLogLevel = (): LogLevel => {
  const stored = localStorage.getItem(LOG_LEVEL_KEY);
  if (stored === "verbose" || stored === "info") return stored;
  return "info";
};

export const setLogLevel = (level: LogLevel): void => {
  localStorage.setItem(LOG_LEVEL_KEY, level);
  logger = new Logger(level);
};

export const getLogger = (): Logger => {
  if (logger && logger.getLogLevel() === getLogLevel()) {
    return logger;
  }
  logger = new Logger(getLogLevel());
  return logger;
};

export const downloadLogs = (): void => {
  const logs = getLogger().getLogs();
  const blob = new Blob([logs.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voquill-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
