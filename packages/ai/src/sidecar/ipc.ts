import { randomUUID } from "node:crypto";
import * as readline from "node:readline";
import type { Readable, Writable } from "node:stream";
import type {
  SidecarRequest,
  SidecarResponse,
  SidecarResponseChunk,
  SidecarResponseDone,
  SidecarResponseError,
  SidecarResponseOk,
} from "@repo/types";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_STREAM_TIMEOUT_MS = 120_000;

class AsyncQueue<T> implements AsyncIterableIterator<T> {
  private values: T[] = [];
  private resolvers: Array<(result: IteratorResult<T>) => void> = [];
  private rejecters: Array<(reason?: unknown) => void> = [];
  private closed = false;
  private failure: Error | null = null;

  push(value: T) {
    if (this.closed) {
      return;
    }

    const resolve = this.resolvers.shift();
    this.rejecters.shift();

    if (resolve) {
      resolve({ value, done: false });
      return;
    }

    this.values.push(value);
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift();
      this.rejecters.shift();
      resolve?.({ value: undefined, done: true });
    }
  }

  fail(error: unknown) {
    this.failure = toError(error);
    this.closed = true;

    while (this.rejecters.length > 0) {
      const reject = this.rejecters.shift();
      this.resolvers.shift();
      reject?.(this.failure);
    }
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.values.length > 0) {
      return { value: this.values.shift() as T, done: false };
    }

    if (this.failure) {
      throw this.failure;
    }

    if (this.closed) {
      return { value: undefined, done: true };
    }

    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.resolvers.push(resolve);
      this.rejecters.push(reject);
    });
  }

  async return(): Promise<IteratorResult<T>> {
    this.close();
    return { value: undefined, done: true };
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

interface PendingStream {
  queue: AsyncQueue<any>;
  timeout: NodeJS.Timeout;
}

export class SidecarIpcClient {
  private readonly input: Readable;
  private readonly output: Writable;
  private readonly reader: readline.Interface;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly streams = new Map<string, PendingStream>();

  constructor({
    input,
    output,
  }: {
    input: Readable;
    output: Writable;
  }) {
    this.input = input;
    this.output = output;
    this.reader = readline.createInterface({
      input: this.input,
      crlfDelay: Infinity,
    });

    this.reader.on("line", (line) => {
      this.handleLine(line);
    });
  }

  request<TResult>(
    type: SidecarRequest["type"],
    payload: Omit<Extract<SidecarRequest, { type: typeof type }>, "id" | "type">,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
    const id = randomUUID();

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`IPC request timed out: ${type}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
        timeout,
      });
      this.send({ id, type, ...payload });
    });
  }

  requestStream<TChunk>(
    type: SidecarRequest["type"],
    payload: Omit<Extract<SidecarRequest, { type: typeof type }>, "id" | "type">,
    timeoutMs = DEFAULT_STREAM_TIMEOUT_MS,
  ): AsyncIterable<TChunk> {
    const id = randomUUID();
    const queue = new AsyncQueue<TChunk>();
    const timeout = setTimeout(() => {
      this.streams.delete(id);
      queue.fail(new Error(`IPC stream timed out: ${type}`));
    }, timeoutMs);

    this.streams.set(id, { queue, timeout });
    this.send({ id, type, ...payload });

    return queue;
  }

  dispose() {
    this.reader.close();

    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timeout);
      entry.reject(new Error(`IPC client disposed during request: ${id}`));
    }

    this.pending.clear();

    for (const [id, stream] of this.streams) {
      clearTimeout(stream.timeout);
      stream.queue.fail(new Error(`IPC client disposed during stream: ${id}`));
    }

    this.streams.clear();
  }

  private send(message: unknown) {
    this.output.write(`${JSON.stringify(message)}\n`);
  }

  private handleLine(line: string) {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    let message: SidecarResponse;

    try {
      message = JSON.parse(trimmed) as SidecarResponse;
    } catch (error) {
      process.stderr.write(
        `[sidecar] Failed to parse IPC response: ${toError(error).message}\n`,
      );
      return;
    }

    if (message.status === "ok" || message.status === "error") {
      this.handleRequestResponse(message);
      return;
    }

    this.handleStreamResponse(message);
  }

  private handleRequestResponse(
    message: SidecarResponseOk | SidecarResponseError,
  ) {
    const pending = this.pending.get(message.id);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.status === "error") {
      pending.reject(new Error(message.error));
      return;
    }

    pending.resolve(message.result);
  }

  private handleStreamResponse(
    message: SidecarResponseChunk | SidecarResponseDone | SidecarResponseError,
  ) {
    const stream = this.streams.get(message.id);

    if (!stream) {
      return;
    }

    if (message.status === "error") {
      clearTimeout(stream.timeout);
      this.streams.delete(message.id);
      stream.queue.fail(new Error(message.error));
      return;
    }

    if (message.status === "done") {
      clearTimeout(stream.timeout);
      this.streams.delete(message.id);
      stream.queue.close();
      return;
    }

    stream.timeout.refresh();
    stream.queue.push(message.data);
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
}
