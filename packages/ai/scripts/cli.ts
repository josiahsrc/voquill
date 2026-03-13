import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadPackageEnv } from "../src/env";
import type {
  LlmChatRequest,
  OpenAiChatCompletion,
  SidecarMessage,
  SidecarReadyEvent,
  SidecarRequest,
  SidecarResponse,
  ToolInfo,
} from "@repo/types";

loadPackageEnv();

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sidecarApiKey = process.env.SIDECAR_API_KEY || randomUUID();
const sidecarPort = parsePort(process.env.MASTRA_PORT) ?? 4111;
const upstreamBaseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const upstreamApiKey =
  process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
const upstreamModel = process.env.LLM_MODEL || "gpt-5.4";

const tools: ToolInfo[] = [
  {
    id: "get-selected-text",
    description:
      "Returns the currently selected text from the active application.",
    schema: { type: "object", properties: {}, required: [] },
  },
  {
    id: "paste",
    description: "Writes text to the clipboard and triggers a paste action.",
    schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to paste" },
      },
      required: ["text"],
    },
  },
  {
    id: "type",
    description: "Types text via keyboard input into the active application.",
    schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to type" },
      },
      required: ["text"],
    },
  },
  {
    id: "web-search",
    description: "Searches the web and returns results.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
];

interface PermissionRecord {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  status: "pending" | "allowed" | "denied";
  token: string;
}

const permissions = new Map<string, PermissionRecord>();

const sidecar = spawn(
  process.execPath,
  ["--import", "tsx", "./src/server.ts"],
  {
    cwd: packageDir,
    env: {
      ...process.env,
      SIDECAR_API_KEY: sidecarApiKey,
      MASTRA_PORT: String(sidecarPort),
    },
    stdio: ["pipe", "pipe", "pipe"],
  },
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
const pendingReady = createDeferred<SidecarReadyEvent>();

sidecar.stdout.setEncoding("utf-8");
sidecar.stderr.setEncoding("utf-8");

const stdoutReader = readline.createInterface({
  input: sidecar.stdout,
  crlfDelay: Infinity,
});

stdoutReader.on("line", (line) => {
  void handleSidecarLine(line);
});

sidecar.stderr.on("data", (chunk: string) => {
  process.stderr.write(`[sidecar] ${chunk}`);
});

sidecar.on("exit", (code) => {
  pendingReady.reject(
    new Error(`Sidecar exited before CLI completed (code ${code ?? "null"})`),
  );
});

process.on("SIGINT", () => {
  shutdown();
});

process.on("SIGTERM", () => {
  shutdown();
});

let ready: SidecarReadyEvent;

try {
  ready = await pendingReady.promise;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
  throw error;
}

console.log("Voquill AI Agent — Interactive CLI");
console.log(`Sidecar: http://127.0.0.1:${ready.port}`);
console.log(`LLM proxy: ${upstreamBaseUrl}`);
console.log("Commands: /clear, /quit\n");

prompt();

async function prompt() {
  rl.question("\nyou: ", async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      return prompt();
    }

    if (trimmed === "/quit" || trimmed === "/exit") {
      shutdown();
      return;
    }

    if (trimmed === "/clear") {
      messages.length = 0;
      console.log("(conversation cleared)");
      return prompt();
    }

    messages.push({ role: "user", content: trimmed });
    process.stdout.write("\nassistant: ");

    try {
      const response = await fetch(
        `http://127.0.0.1:${ready.port}/api/agents/voquill-agent/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sidecarApiKey}`,
          },
          body: JSON.stringify({ messages }),
        },
      );

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write(chunk);
        fullResponse += chunk;
      }

      process.stdout.write("\n");
      messages.push({ role: "assistant", content: fullResponse });
    } catch (error) {
      console.error(
        "\n[error]",
        error instanceof Error ? error.message : String(error),
      );
    }

    prompt();
  });
}

async function handleSidecarLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  let message: SidecarMessage;

  try {
    message = JSON.parse(trimmed) as SidecarMessage;
  } catch (error) {
    process.stderr.write(
      `[cli] Failed to parse sidecar stdout: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    return;
  }

  if ("type" in message && message.type === "ready") {
    pendingReady.resolve(message);
    return;
  }

  if (!("type" in message) || !("id" in message)) {
    return;
  }

  const request = message as SidecarRequest;

  try {
    switch (request.type) {
      case "tools/list":
        return respond({
          id: request.id,
          status: "ok",
          result: { tools },
        });
      case "tools/permission":
        return handlePermission(request);
      case "tools/permission-status":
        return handlePermissionStatus(request);
      case "tools/execute":
        return handleToolExecute(request);
      case "llm/chat":
        return handleLlmChat(request);
    }
  } catch (error) {
    return respond({
      id: request.id,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function handlePermission(
  request: Extract<SidecarRequest, { type: "tools/permission" }>,
) {
  const id = randomUUID();
  const token = randomUUID();

  permissions.set(id, {
    id,
    tool: request.tool,
    params: request.params,
    status: "allowed",
    token,
  });

  console.log(
    `[permission] auto-approved ${request.tool} ${JSON.stringify(request.params)}`,
  );

  return respond({
    id: request.id,
    status: "ok",
    result: {
      permissionId: id,
    },
  });
}

function handlePermissionStatus(
  request: Extract<SidecarRequest, { type: "tools/permission-status" }>,
) {
  const permission = permissions.get(request.permissionId);

  if (!permission) {
    return respond({
      id: request.id,
      status: "error",
      error: `Permission not found: ${request.permissionId}`,
    });
  }

  return respond({
    id: request.id,
    status: "ok",
    result: {
      status: permission.status,
      token: permission.token,
    },
  });
}

function handleToolExecute(
  request: Extract<SidecarRequest, { type: "tools/execute" }>,
) {
  const permission = [...permissions.values()].find(
    (entry) => entry.tool === request.tool && entry.token === request.token,
  );

  if (!permission) {
    return respond({
      id: request.id,
      status: "error",
      error: `Invalid tool token for ${request.tool}`,
    });
  }

  return respond({
    id: request.id,
    status: "ok",
    result: executeTool(permission.tool, permission.params),
  });
}

async function handleLlmChat(request: LlmChatRequest) {
  if (!upstreamApiKey) {
    return respond({
      id: request.id,
      status: "error",
      error: "LLM_API_KEY or OPENAI_API_KEY not set",
    });
  }

  const body = {
    ...request.request,
    model:
      !request.request.model || request.request.model === "default"
        ? upstreamModel
        : request.request.model,
    stream: request.request.stream,
    stream_options: request.request.stream
      ? { include_usage: true }
      : undefined,
  };

  const upstream = await fetch(`${upstreamBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstreamApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return respond({
      id: request.id,
      status: "error",
      error: await upstream.text(),
    });
  }

  if (!request.request.stream) {
    return respond({
      id: request.id,
      status: "ok",
      result: (await upstream.json()) as OpenAiChatCompletion,
    });
  }

  if (!upstream.body) {
    return respond({
      id: request.id,
      status: "error",
      error: "Upstream returned an empty stream body",
    });
  }

  await forwardSseChunks(request.id, upstream.body);
  return respond({
    id: request.id,
    status: "done",
  });
}

async function forwardSseChunks(
  id: string,
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length === 0) {
        continue;
      }

      const payload = dataLines.join("\n");
      if (payload === "[DONE]") {
        return;
      }

      respond({
        id,
        status: "chunk",
        data: JSON.parse(payload) as OpenAiChatCompletion,
      });
    }
  }
}

function executeTool(toolId: string, params: Record<string, unknown>) {
  switch (toolId) {
    case "get-selected-text":
      return {
        text: "[Mock] This is some selected text from the active application.",
      };
    case "paste":
      console.log(`[tool:paste] ${String(params.text ?? "")}`);
      return { success: true };
    case "type":
      console.log(`[tool:type] ${String(params.text ?? "")}`);
      return { success: true };
    case "web-search":
      return {
        results: [
          {
            title: "Mock Result 1",
            url: "https://example.com/1",
            snippet: `Result for "${String(params.query ?? "")}"`,
          },
          {
            title: "Mock Result 2",
            url: "https://example.com/2",
            snippet: `Another result for "${String(params.query ?? "")}"`,
          },
        ],
      };
    default:
      return { error: `Unknown tool: ${toolId}` };
  }
}

function respond(response: SidecarResponse) {
  sidecar.stdin.write(`${JSON.stringify(response)}\n`);
}

function shutdown(exitCode = 0) {
  rl.close();
  stdoutReader.close();
  sidecar.kill("SIGTERM");
  process.exit(exitCode);
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function parsePort(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    return null;
  }

  return port;
}
