import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createVoquillAgent } from "./mastra/agents";
import { loadPackageEnv } from "./env";

loadPackageEnv();

const DEFAULT_PORT = 4111;
const API_KEY = process.env.SIDECAR_API_KEY || "dev";
const requestedPort = parsePort(process.env.MASTRA_PORT) ?? DEFAULT_PORT;
let agentPromise: Promise<
  Awaited<ReturnType<typeof createVoquillAgent>>
> | null = null;

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

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : requestedPort;
  process.stdout.write(`${JSON.stringify({ type: "ready", port })}\n`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function routeRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method || "GET";
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "127.0.0.1"}`,
  );

  if (method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/agents/voquill-agent/stream"
  ) {
    if (!checkAuth(req, res)) {
      return;
    }

    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const agent = await getAgent();
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

function getAgent() {
  agentPromise ??= createVoquillAgent();
  return agentPromise;
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
