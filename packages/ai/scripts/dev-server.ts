/**
 * Mock desktop API server for local development.
 *
 * Implements the tool discovery, permission, and execution endpoints
 * from the agent plan, with all permissions auto-approved.
 *
 * Also proxies /v1/chat/completions to a real OpenAI-compatible endpoint.
 *
 * Env vars:
 *   LLM_BASE_URL  — upstream LLM endpoint (default: https://api.openai.com/v1)
 *   LLM_API_KEY   — API key for the upstream LLM
 *   LLM_MODEL     — model name to use (default: gpt-4o)
 *   PORT          — server port (default: 4112)
 *   API_KEY       — session API key (default: dev)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

// Load .env from packages/ai/
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const raw = trimmed.slice(eqIndex + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // No .env file — that's fine, use env vars directly
}

const PORT = Number(process.env.PORT) || 4112;
const API_KEY = process.env.API_KEY || "dev";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o";

// --- Tool definitions ---

interface ToolInfo {
  id: string;
  description: string;
  schema: Record<string, unknown>;
}

const tools: ToolInfo[] = [
  {
    id: "get-selected-text",
    description: "Returns the currently selected text from the active application.",
    schema: { type: "object", properties: {}, required: [] },
  },
  {
    id: "paste",
    description: "Writes text to the clipboard and triggers a paste action.",
    schema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to paste" } },
      required: ["text"],
    },
  },
  {
    id: "type",
    description: "Types text via keyboard input into the active application.",
    schema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to type" } },
      required: ["text"],
    },
  },
  {
    id: "web-search",
    description: "Searches the web and returns results.",
    schema: {
      type: "object",
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
];

// --- Permission store (in-memory, auto-approved) ---

interface PermissionRecord {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  status: "pending" | "allowed" | "denied";
  token: string;
}

const permissions = new Map<string, PermissionRecord>();

// --- Mock tool executors ---

function executeTool(toolId: string, params: Record<string, unknown>): unknown {
  switch (toolId) {
    case "get-selected-text":
      return { text: "[Mock] This is some selected text from the active application." };
    case "paste":
      console.log(`  [tool:paste] Would paste: "${params.text}"`);
      return { success: true };
    case "type":
      console.log(`  [tool:type] Would type: "${params.text}"`);
      return { success: true };
    case "web-search":
      return {
        results: [
          { title: "Mock Result 1", url: "https://example.com/1", snippet: `Result for "${params.query}"` },
          { title: "Mock Result 2", url: "https://example.com/2", snippet: `Another result for "${params.query}"` },
        ],
      };
    default:
      return { error: `Unknown tool: ${toolId}` };
  }
}

// --- HTTP helpers ---

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${API_KEY}`) {
    json(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

// --- Route handlers ---

async function handleLlmProxy(req: IncomingMessage, res: ServerResponse) {
  if (!LLM_API_KEY) {
    json(res, 500, { error: "LLM_API_KEY or OPENAI_API_KEY not set" });
    return;
  }

  const body = await readBody(req);
  const parsed = JSON.parse(body);

  // Replace "default" model with the configured model
  if (parsed.model === "default") {
    parsed.model = LLM_MODEL;
  }

  const upstream = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(parsed),
  });

  // Stream the response through
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    "Cache-Control": "no-cache",
  });

  if (upstream.body) {
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

function handleToolsList(_req: IncomingMessage, res: ServerResponse) {
  json(res, 200, { tools });
}

async function handleToolPermission(toolId: string, req: IncomingMessage, res: ServerResponse) {
  const body = JSON.parse(await readBody(req));
  const id = randomUUID();
  const token = randomUUID();

  const record: PermissionRecord = {
    id,
    tool: toolId,
    params: body,
    status: "allowed", // auto-approve in dev
    token,
  };
  permissions.set(id, record);

  console.log(`  [permission] Auto-approved ${toolId} with params:`, JSON.stringify(body));
  json(res, 200, { permission_id: id });
}

function handlePermissionStatus(permissionId: string, _req: IncomingMessage, res: ServerResponse) {
  const record = permissions.get(permissionId);
  if (!record) {
    json(res, 404, { error: "Permission not found" });
    return;
  }

  json(res, 200, { status: record.status, token: record.token });
}

async function handleToolExecute(toolId: string, req: IncomingMessage, res: ServerResponse) {
  const body = JSON.parse(await readBody(req));
  const { token } = body;

  // Find permission by token
  const record = Array.from(permissions.values()).find(
    (p) => p.token === token && p.tool === toolId
  );

  if (!record) {
    json(res, 403, { error: "Invalid token" });
    return;
  }

  const result = executeTool(toolId, record.params);
  console.log(`  [execute] ${toolId} →`, JSON.stringify(result));
  json(res, 200, { result });
}

// --- Server ---

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || "GET";

  if (!checkAuth(req, res)) return;

  try {
    // LLM proxy
    if (method === "POST" && path === "/v1/chat/completions") {
      return await handleLlmProxy(req, res);
    }

    // Tool discovery
    if (method === "GET" && path === "/tools/list") {
      return handleToolsList(req, res);
    }

    // Tool permissions
    const permissionMatch = path.match(/^\/tools\/([^/]+)\/permissions$/);
    if (method === "POST" && permissionMatch) {
      return await handleToolPermission(permissionMatch[1], req, res);
    }

    // Permission status
    const statusMatch = path.match(/^\/tools\/permissions\/([^/]+)$/);
    if (method === "GET" && statusMatch) {
      return handlePermissionStatus(statusMatch[1], req, res);
    }

    // Tool execute
    const executeMatch = path.match(/^\/tools\/([^/]+)\/execute$/);
    if (method === "POST" && executeMatch) {
      return await handleToolExecute(executeMatch[1], req, res);
    }

    json(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("Request error:", err);
    json(res, 500, { error: String(err) });
  }
});

server.listen(PORT, "localhost", () => {
  console.log(`\nDev desktop API server running on http://localhost:${PORT}`);
  console.log(`API key: ${API_KEY}`);
  console.log(`LLM proxy → ${LLM_BASE_URL} (model: ${LLM_MODEL})`);
  console.log(`\nAvailable tools: ${tools.map((t) => t.id).join(", ")}`);
  console.log(`\nAll permissions are auto-approved in dev mode.\n`);
});
