# AI Agent Architecture Plan

## Overview

Add an AI assistant page to the desktop app powered by [Mastra](https://mastra.ai). The agent runs locally as a sidecar process, with LLM calls proxied through a unified OpenAI-compatible interface that works identically across all deployment modes (community, cloud, enterprise).

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│  User's Machine                                           │
│                                                           │
│  Tauri Desktop App (React + Rust)                         │
│    │                                                      │
│    │  useChat() → localhost:4111                          │
│    │                                                      │
│    │  Desktop API Server (TS) ← localhost:4112            │
│    │    ├─ POST /v1/chat/completions  (LLM proxy)        │
│    │    ├─ POST /tools/paste          (native tools)     │
│    │    ├─ POST /tools/get-selected-text                  │
│    │    └─ ...                                            │
│    ▼                                                      │
│  Mastra Sidecar (bundled Node.js)                         │
│    │                                                      │
│    ├─ LLM calls ──→ localhost:4112/v1/chat/completions   │
│    │                                                      │
│    ├─ Native tools ──→ localhost:4112/tools/* ──→ Tauri   │
│    │                                                      │
│    └─ API tools ──→ external server calls                 │
└───────────────────────────────────────────────────────────┘
```

## 1. Mastra Sidecar

### Location

New directory: `packages/ai/` within the monorepo.

Contains:
- Agent definition(s) with system prompts
- Tool schemas (native + API tools)
- Mastra config with `chatRoute()`
- Build script to produce a standalone binary

### Bundling

Compile to a standalone executable using `bun build --compile` (or `pkg`). This binary gets included as a Tauri sidecar — no Node.js runtime needed on the user's machine.

### Startup

Tauri launches the sidecar on app start. The desktop app passes configuration via environment variables:

| Variable | Description | Example |
|---|---|---|
| `DESKTOP_API_URL` | Desktop API server base URL | `http://localhost:4112` |
| `DESKTOP_API_KEY` | Session API key for auth | Random UUID, regenerated each launch |
| `MASTRA_PORT` | Port for the Mastra server | `4111` |

The desktop API server hosts both the LLM proxy (`/v1/chat/completions`) and the native tool endpoints (`/tools/*`) on a single port. The sidecar uses `DESKTOP_API_URL` for all calls to the desktop app.

For standalone development/testing, `DESKTOP_API_URL` can point to any OpenAI-compatible endpoint (e.g., `https://api.openai.com`) so the sidecar can run independently without the desktop app.

### Security

Both the desktop API server and the sidecar are protected by a shared session API key. The key gates all access — without it, neither server responds to any request.

#### How it works

1. On app launch, the desktop app generates a random API key (`crypto.randomUUID()`) and holds it in memory
2. The desktop API server starts on `http://localhost:4112` and rejects any request without `Authorization: Bearer <key>`
3. The sidecar starts on `http://localhost:4111` with the same key passed via the `DESKTOP_API_KEY` env var, and also rejects unauthorized requests
4. Both processes enforce the key on every request — the desktop app includes it when calling the sidecar, the sidecar includes it when calling the desktop API server

#### Why plain HTTP on localhost is sufficient

The traffic between the desktop app and sidecar is `localhost` only — it never leaves the machine. The API key protects against the realistic threat: other programs on the machine discovering the ports (e.g., via port scanning) and making unauthorized requests. Without the key, they can't do anything.

More heavyweight options (TLS, Unix domain sockets) don't meaningfully improve security for this scenario. If an attacker can sniff localhost traffic or read process memory, they already have enough access to bypass any of these measures. The API key is defense-in-depth that stops casual/automated access, which is the actual threat model. This is the same approach used by VS Code extensions, Ollama, Docker Desktop, and other local sidecar architectures.

#### Key properties

- **Ephemeral** — generated fresh every app launch, never persisted to disk
- **In-memory only** — exists only in the two processes' memory (and the sidecar's env var at startup)
- **Single-use scope** — valid only for the current session, invalidated when the app closes

### Shutdown

Tauri kills the sidecar process when the app closes. Standard sidecar lifecycle.

## 2. Desktop API Server

A single HTTP server running in the desktop app's TypeScript layer. It serves two purposes:

1. **LLM Proxy** (`POST /v1/chat/completions`) — routes LLM calls to the correct provider
2. **Native Tools** (`POST /tools/*`) — exposes Tauri commands over HTTP (see Section 3)

All requests are authenticated with the session API key (`DESKTOP_API_KEY`).

### LLM Proxy

The sidecar sends standard OpenAI-format requests:

```
POST {DESKTOP_API_URL}/v1/chat/completions
Authorization: Bearer {DESKTOP_API_KEY}
Content-Type: application/json

{
  "model": "default",
  "messages": [...],
  "stream": true
}
```

The desktop app already knows the user's LLM provider, API keys, and deployment mode. The LLM proxy is a translation layer that accepts OpenAI-format requests and maps them to each provider's native API:

- Receives OpenAI-format `chat/completions` request
- Resolves "default" to the user's configured provider + model
- Translates the request to the provider's native format (if needed) and forwards it
- Translates the provider's response back to OpenAI-format streaming SSE

Every provider is supported natively — no dependency on providers being OpenAI-compatible.

### Streaming via Generative Text Repos

The existing generative text provider repositories (one per provider) already handle non-streaming LLM calls. Each repo gets a new method that returns a streaming response in a unified format:

```ts
interface StreamingChatCompletion {
  stream(): AsyncIterable<OpenAiChatChunk>;
}
```

Each repo implements this using its provider's native streaming API and translates chunks to OpenAI-format SSE on the fly. Providers that already speak OpenAI format (Groq, OpenAI, Ollama, OpenRouter, Deepseek) pass chunks through. Providers with different APIs (Claude, Gemini) translate in their repo implementation.

The `/v1/chat/completions` endpoint then becomes simple:

```ts
app.post("/v1/chat/completions", async (req, res) => {
  const repo = getConfiguredGenerativeTextRepo();
  const stream = repo.streamChatCompletion(req.body.messages);

  res.setHeader("Content-Type", "text/event-stream");
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});
```

The endpoint doesn't know or care which provider it's talking to — the repo handles all translation.

### Mode-Specific Routing

- **Community mode**: Reads the user's configured provider + key from local state, calls the provider directly via the corresponding repo.
- **Cloud mode**: Forwards to a Firebase function endpoint that handles provider routing server-side.
- **Enterprise mode**: Forwards to the enterprise gateway, which has its own provider routing, tier-based selection, and key management.

From the sidecar's perspective, it's always the same URL and format — the desktop app handles everything.

### Standalone / Testing Mode

For development, the sidecar can run without the desktop app by pointing `DESKTOP_API_URL` to any OpenAI-compatible endpoint:

```bash
DESKTOP_API_URL=https://api.openai.com/v1 \
DESKTOP_API_KEY=sk-... \
MASTRA_PORT=4111 \
pnpm --filter @voquill/ai dev
```

Native tools won't be available in standalone mode, but the agent can still chat and use API tools. This makes it easy to iterate on the agent without running the full desktop app.

## 3. Tool Architecture

### Design Principle

All tools are **imperative** and **stateless** — the Mastra sidecar executes tools directly and gets results back inline. The tools themselves hold no state; they call out to services (the desktop API server, external APIs) that manage state. This lets the agent chain tools naturally in a single turn.

Tools fall into two categories based on where they execute, but from the agent's perspective they all work the same way: discover → request permission → exchange for token → execute.

### Tool Discovery

The desktop API server exposes a single endpoint that returns all available tools:

```
GET /tools/list
  Response: {
    tools: [
      {
        id: "paste",
        description: "Writes to clipboard and triggers paste",
        schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
      },
      ...
    ]
  }
```

On startup, the Mastra sidecar fetches this list and dynamically registers each tool. No tool definitions are hardcoded in `packages/ai/` — the desktop API server is the single source of truth for what tools exist, what they do, and what parameters they accept.

### Tool Permission System

Every tool call goes through a three-step flow: **request permission** → **exchange for token** → **execute**. This ensures the user stays in control of what the agent can do, and that approved parameters cannot be tampered with after approval.

#### API

```
POST /tools/{tool}/permissions
  Body: { ...tool_params }
  Response: { permission_id: "..." }

GET /tools/permissions/{permission_id}
  Response: { status: "pending" | "allowed" | "denied", token?: "..." }

POST /tools/{tool}/execute
  Body: { token: "..." }
  Response: { result: {...} }
```

#### Flow

1. Agent calls `POST /tools/paste/permissions` with `{ text: "Hello" }`
2. Server creates a permission record, storing the tool params as a JSON blob alongside it
3. Server checks the allowlist for this tool + params
4. Returns `{ permission_id: "abc" }`
5. Agent calls `GET /tools/permissions/abc` to exchange the ID for a token
6. If `pending` → the desktop UI is showing an approval prompt; agent polls again
7. If `denied` → agent informs the user it couldn't perform the action
8. If `allowed` → response includes a signed JWT `token` (which embeds the `permission_id`)
9. Agent calls `POST /tools/paste/execute` with `{ token: "..." }` — **no params**
10. Server verifies the JWT, extracts the `permission_id`, looks up the stored params, and executes the tool with those exact params

#### Parameter Binding

Tool parameters are **locked at permission time**. The agent passes the full params in step 1, and those params are stored with the permission record. When the tool executes in step 9, it uses the stored params — the execute request carries only the token, not the params. This means:

- The user sees exactly what the agent wants to do before approving
- There's no way to change the params after approval
- The permission request is a signed intent

#### Token Design

The execution token is a **signed JWT** issued by the desktop API server. It contains:

- `permission_id` — references the stored permission record (and its params)
- `tool` — the tool ID (for validation)
- Signed with a secret known only to the desktop API server

The server verifies the JWT signature on execute, extracts the `permission_id`, loads the stored params, and runs the tool. No valid token = no execution.

#### Storage

Permission records, stored params, and issued tokens are all held **in-memory** at runtime — never persisted to disk or database. This is more secure since the data can't be read from the filesystem, and there's no need to survive a restart. Permissions and tokens are inherently ephemeral (scoped to a single app session), so in-memory storage is the right fit.

#### Permission Granularity

Different tools define different permission scopes:

- **paste / type**: Permission can be scoped to the specific text, or "allow all paste operations for this session"
- **web_search**: Permission scoped per domain (e.g., allow `google.com` but not arbitrary URLs)
- **get-selected-text / get-accessibility-info**: Can be pre-approved (always returns `allowed` immediately — no UI prompt needed)
- **capture-screenshot**: Might require approval every time, or once per session

The permission request carries the full params, so the desktop app can decide what to show the user and at what granularity to grant approval.

#### Sidecar Helper

A shared helper in `packages/ai/` keeps tool implementations dead simple:

```ts
async function callTool(tool: string, params: Record<string, unknown>) {
  const { permissionId } = await requestPermission(tool, params);

  const result = await pollForToken(permissionId);
  if (result.status === "denied") {
    return { error: `User denied ${tool}` };
  }

  return await executeTool(tool, result.token);
}
```

Since tool definitions are fetched dynamically from `GET /tools/list`, the sidecar registers them generically:

```ts
const tools = await fetchToolList();

for (const tool of tools) {
  agent.registerTool(createTool({
    id: tool.id,
    description: tool.description,
    inputSchema: tool.schema,
    execute: ({ context }) => callTool(tool.id, context),
  }));
}
```

### Tool Execution Strategies

Each tool definition includes an internal execution strategy that determines how the tool is actually invoked. The sidecar never sees this — it's the desktop API server's concern.

#### Strategy Types

```ts
type TauriToolStrategy = { type: "tauri"; command: string };
type HttpToolStrategy = { type: "http"; url: string; method: "GET" | "POST" };
type CallableToolStrategy = { type: "callable"; path: string };

type ToolStrategy = TauriToolStrategy | HttpToolStrategy | CallableToolStrategy;
```

- **tauri** — invokes a Tauri command (paste, type, screenshot, etc.)
- **http** — makes an HTTP request to an external URL
- **callable** — calls an internal callable function (e.g., enterprise gateway endpoints)

#### Tool Definition

```ts
// packages/types — shared between desktop API server and sidecar
type ToolInfo = {
  id: string;
  description: string;
  schema: JSONSchema;
};

type ToolPermissionStatus = "pending" | "allowed" | "denied";

// apps/desktop — internal only
type ToolDefinition = ToolInfo & {
  strategy: ToolStrategy;
};
```

`ToolInfo` and `ToolPermissionStatus` live in `packages/types` so they can be shared with the sidecar. `ToolDefinition` extends `ToolInfo` with the internal `strategy` field and stays in `apps/desktop` — the sidecar never sees it.

#### Execution Repositories

Each strategy type has a corresponding repo. The repo interface is generic over its strategy type, so each implementation receives the narrowed type directly — no casting needed.

```ts
interface ToolExecutionRepo<T extends ToolStrategy> {
  execute(strategy: T, params: Record<string, unknown>): Promise<unknown>;
}

class TauriToolExecutionRepo implements ToolExecutionRepo<TauriToolStrategy> {
  async execute(strategy: TauriToolStrategy, params) {
    return await invoke(strategy.command, params);
  }
}

class HttpToolExecutionRepo implements ToolExecutionRepo<HttpToolStrategy> {
  async execute(strategy: HttpToolStrategy, params) {
    return await fetch(strategy.url, { method: strategy.method, body: JSON.stringify(params) });
  }
}

class CallableToolExecutionRepo implements ToolExecutionRepo<CallableToolStrategy> {
  async execute(strategy: CallableToolStrategy, params) {
    return await callFunction(strategy.path, params);
  }
}
```

#### Factory

```ts
function getExecutionRepo(strategy: ToolStrategy): ToolExecutionRepo<typeof strategy> {
  switch (strategy.type) {
    case "tauri": return new TauriToolExecutionRepo();
    case "http": return new HttpToolExecutionRepo();
    case "callable": return new CallableToolExecutionRepo();
  }
}
```

#### State

Tool definitions and permission records live in Zustand app state as `byId` maps, following the existing pattern (`toneById`, `transcriptionById`, etc.):

```ts
// In AppState (top-level)
toolById: Record<string, ToolDefinition>;
toolPermissionById: Record<string, ToolPermission>;
```

The desktop API server reads from and writes to these maps directly. No separate registry class needed — the state *is* the registry.

### Tool List

| Tool | Strategy | What it does |
|---|---|---|
| `paste` | tauri | Writes to clipboard and triggers paste |
| `type` | tauri | Types text via keyboard input |
| `get-selected-text` | tauri | Returns the currently selected text |
| `get-accessibility-info` | tauri | Returns accessibility tree / focused element info |
| `capture-screenshot` | tauri | Takes a screenshot, returns base64 or file path |
| `open-window` | tauri | Opens/focuses a Tauri window |
| `close-window` | tauri | Closes a Tauri window |
| `search_transcriptions` | http/callable | Search user's transcription history |
| `get_user_preferences` | http/callable | Read user settings |
| `web_search` | http | Call a search API |

## 4. Desktop App Frontend

### Routes

Two routes:

- `/dashboard/chats` — chat list page (shows all conversations, create new chat)
- `/dashboard/chats/:id` — individual chat page (conversation with the agent)

```
src/components/chats/
  ChatsPage.tsx           — chat list page
  ChatPage.tsx            — individual chat conversation page
  ChatSideEffects.tsx     — subscriptions, sidecar health check, desktop API server lifecycle
  ChatMessages.tsx        — message list rendering
  ChatInput.tsx           — input field
```

### State

New Zustand state slice:

```ts
interface AiState {
  sidecarStatus: "starting" | "ready" | "error";
  sidecarPort: number;
  desktopApiPort: number;
}
```

Chat message state is managed by `useChat()` from `@ai-sdk/react` — no need to duplicate it in Zustand.

### Chat Integration

```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "@mastra/ai-sdk";

const { messages, input, handleSubmit } = useChat({
  transport: new DefaultChatTransport({
    baseUrl: `http://localhost:${sidecarPort}`,
    agent: "voquill-agent",
  }),
});
```

### Desktop API Server Implementation

The desktop API server runs in the renderer process, which gives it direct access to Tauri's `invoke()`. It starts before the sidecar launches and handles LLM proxy routes, tool discovery, and the tool permission/execution flow on a single port.

```ts
// Simplified — actual implementation in src/desktop-api/

// LLM proxy
app.post("/v1/chat/completions", async (req) => {
  const repo = getConfiguredGenerativeTextRepo();
  const stream = repo.streamChatCompletion(req.body.messages);
  // ... stream SSE response
});

// Tool discovery
app.get("/tools/list", async (req) => {
  return { tools: Object.values(getState().toolById) }; // id, description, schema for each
});

// Request permission (stores params in state)
app.post("/tools/:tool/permissions", async (req) => {
  const id = createId();
  setState(draft => {
    draft.toolPermissionById[id] = {
      id,
      tool: req.params.tool,
      params: req.body,
      status: "pending",
    };
  });
  return { permission_id: id };
});

// Exchange permission ID for execution token
app.get("/tools/permissions/:id", async (req) => {
  const permission = getState().toolPermissionById[req.params.id];
  if (permission.status === "allowed") {
    const token = signJwt({ permission_id: permission.id, tool: permission.tool });
    return { status: "allowed", token };
  }
  return { status: permission.status }; // "pending" or "denied"
});

// Execute tool with token (no params — uses stored params from permission)
app.post("/tools/:tool/execute", async (req) => {
  const claims = verifyJwt(req.body.token);
  const permission = getState().toolPermissionById[claims.permission_id];
  const tool = getState().toolById[req.params.tool];
  const repo = getExecutionRepo(tool.strategy);
  const result = await repo.execute(tool.strategy, permission.params);
  return { result };
});
```

The server starts before the sidecar and its URL + session key are passed via `DESKTOP_API_URL` and `DESKTOP_API_KEY`.

## 5. Implementation Order

### Phase 1: Foundation
1. Create `packages/ai/` with a basic Mastra agent (no tools, just chat)
2. Build the desktop API server with the LLM proxy endpoint (`/v1/chat/completions`)
3. Wire up the sidecar in Tauri config, generate session API key on launch
4. Build the chat page in the desktop app
5. End-to-end: user can chat with the AI via the desktop app

### Phase 2: Native Tools + Permission System
6. Build the tool registry and `GET /tools/list` endpoint on the desktop API server
7. Build the permission system (permission request endpoint, token exchange via signed JWT, approval UI)
8. Add tool execute endpoint (`POST /tools/{tool}/execute`) — validates JWT, loads stored params, executes
9. Build the `callTool` helper in `packages/ai/` (request permission → poll for token → execute with token)
10. Wire up dynamic tool registration in the sidecar (fetch `/tools/list` on startup, register tools generically)
11. Implement Tauri commands for paste, get selection, accessibility, screenshot, etc.
12. End-to-end: agent can read screen context and take actions (with user approval)

### Phase 3: Cloud + Enterprise LLM Routing
10. Add cloud/enterprise provider routing in the desktop API server's LLM proxy
11. Desktop app selects the right upstream based on deployment mode

### Phase 4: API Tools
12. Add server-calling tools (search transcriptions, etc.)
13. Pass auth context to the sidecar for authenticated API calls

## 6. Conversation Persistence

Chat history is persisted to local SQLite via two tables:

### Schema

```sql
CREATE TABLE ai_chat (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ai_chat_message (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES ai_chat(id) ON DELETE CASCADE,
  role TEXT NOT NULL,        -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,     -- JSON-encoded message content (supports text + tool calls)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_chat_message_chat_id ON ai_chat_message(chat_id);
```

### Purging

Chat titles are set from the user's first message in the conversation (truncated if needed).

Old chats are purged automatically. Strategy TBD — likely a max chat count or age-based threshold (e.g., delete chats older than 30 days). The purge runs on app startup or periodically. `ON DELETE CASCADE` ensures messages are cleaned up with their parent chat.

### Data Flow

The frontend persists messages as they stream in. When the user opens the assistant page, it loads the most recent chat (or creates a new one). The user can start new chats and switch between recent ones.

New Tauri commands needed:
- `create_ai_chat` → creates a new chat, returns ID
- `list_ai_chats` → returns recent chats (paginated)
- `get_ai_chat_messages` → returns messages for a chat
- `save_ai_chat_message` → persists a message
- `delete_ai_chat` → deletes a chat and its messages

New migration: `NNN_ai_chat.sql` in `src-tauri/src/db/migrations/`.

## Open Questions

(None remaining — all resolved.)
