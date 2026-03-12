import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createVoquillAgent } from "../src/mastra/agents";
import { loadPackageEnv } from "./lib/env";

loadPackageEnv();

const PORT = Number(process.env.MASTRA_PORT) || 4111;
const API_KEY = process.env.SIDECAR_API_KEY || "dev";

const agent = await createVoquillAgent();

const server = createServer(async (req, res) => {
  try {
    await routeRequest(req, res);
  } catch (error) {
    process.stderr.write(
      `[sidecar] Request failed: ${
        error instanceof Error ? error.stack || error.message : String(error)
      }\n`,
    );

    if (!res.headersSent) {
      json(res, 500, { error: "Internal Server Error" });
      return;
    }

    res.end();
  }
});

server.on("error", (error) => {
  process.stderr.write(
    `[sidecar] Failed to start HTTP server: ${
      error instanceof Error ? error.message : String(error)
    }\n`,
  );
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`${JSON.stringify({ type: "ready", port: PORT })}\n`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function routeRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (method === "POST" && url.pathname === "/api/agents/voquill-agent/stream") {
    if (!checkAuth(req, res)) {
      return;
    }

    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const response = await agent.stream(messages);

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const chunk of response.textStream) {
      res.write(chunk);
    }

    res.end();
    return;
  }

  json(res, 404, { error: "Not found" });
}

function checkAuth(req: IncomingMessage, res: ServerResponse) {
  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    json(res, 401, { error: "Unauthorized" });
    return false;
  }

  return true;
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf-8");
  return text ? JSON.parse(text) : {};
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}
