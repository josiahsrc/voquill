import type { LogLevel } from "../types/log.types";

const LOG_LEVEL_KEY = "voquill_log_level";
const INFO_BUFFER_SIZE = 100;
const VERBOSE_BUFFER_SIZE = 1000;

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

  private write(tag: string, message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${tag}] ${message}`;
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.buffer.length;
    if (this.count < this.buffer.length) {
      this.count += 1;
    }
  }

  info(message: string): void {
    this.write("INFO", message);
  }

  warning(message: string): void {
    this.write("WARN", message);
  }

  error(message: string): void {
    this.write("ERROR", message);
  }

  verbose(message: string): void {
    if (this.level !== "verbose") return;
    this.write("VERBOSE", message);
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
