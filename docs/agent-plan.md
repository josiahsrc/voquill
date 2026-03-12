# AI Agent Architecture Plan

## Overview

Add an AI assistant page to the desktop app powered by [Mastra](https://mastra.ai). The agent runs locally as a sidecar process, communicating with the desktop app's TypeScript layer via stdin/stdout through Rust. LLM calls are proxied through a unified OpenAI-compatible interface that works identically across all deployment modes (community, cloud, enterprise).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  User's Machine                                              │
│                                                              │
│  Tauri Desktop App                                           │
│                                                              │
│    React Renderer (TypeScript)                               │
│      │                                                       │
│      │  useChat() ──→ localhost:4111 ──→ Sidecar HTTP        │
│      │                                                       │
│      │  Message Handler (business logic)                     │
│      │    ├─ LLM proxy (provider routing)                    │
│      │    ├─ Tool registry (native, HTTP, callable)          │
│      │    ├─ Permission system (approval UI, JWT tokens)     │
│      │    └─ Tool execution (invoke, fetch, callable)        │
│      │                                                       │
│      │  ↕ Tauri IPC (invoke / events)                        │
│      │                                                       │
│    Rust Layer (dumb relay)                                    │
│      │  ├─ Reads sidecar stdout → emits event to renderer    │
│      │  └─ Receives invoke from renderer → writes to stdin   │
│      │                                                       │
│      │  ↕ stdin / stdout                                     │
│      │                                                       │
│    Mastra Sidecar (bundled binary)                           │
│      ├─ HTTP server on :4111 for useChat()                   │
│      ├─ Agent with system prompts                            │
│      ├─ Requests tools, LLM via stdout                       │
│      └─ Receives responses via stdin                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

There are two communication channels:

1. **Renderer → Sidecar (chat stream)**: The React frontend calls `useChat()` which makes HTTP requests to the sidecar's server on `localhost:4111`. This is how user messages go in and assistant messages stream out.

2. **Sidecar ↔ Renderer (tools, LLM proxy)**: The sidecar communicates with the TypeScript layer via stdin/stdout, relayed through Rust. This is how the sidecar discovers tools, requests permissions, executes tools, and proxies LLM calls.

## 1. Mastra Sidecar

### Location

New directory: `packages/ai/` within the monorepo.

Contains:
- Agent definition(s) with system prompts
- Mastra config with `chatRoute()`
- IPC client (stdin/stdout message handling, pending promises map)
- CLI harness for standalone testing
- Build script to produce a standalone binary

### Bundling

Compile to a standalone executable using `bun build --compile` (or `pkg`). This binary gets included as a Tauri sidecar — no Node.js runtime needed on the user's machine.

### Startup

Tauri launches the sidecar on app start. The desktop app passes configuration via environment variables:

| Variable | Description | Example |
|---|---|---|
| `SIDECAR_API_KEY` | Session API key for the sidecar's HTTP server | Random UUID, regenerated each launch |
| `MASTRA_PORT` | Port for the Mastra HTTP server | `4111` |

The sidecar starts its HTTP server (for `useChat()`) and then sends a `ready` message on stdout. The renderer waits for this message before considering the sidecar operational.

### Security

The sidecar's stdin/stdout channel is inherently secure — only the parent process (Tauri/Rust) can read and write to it. No network ports are exposed for this communication, so there's no port scanning risk and no need for authentication on the IPC channel.

The sidecar's HTTP server on port 4111 (used by `useChat()`) is protected by `SIDECAR_API_KEY`. The renderer includes this key when making HTTP requests to the sidecar. Without it, the sidecar rejects requests.

#### Key properties

- **Ephemeral** — generated fresh every app launch, never persisted to disk
- **In-memory only** — exists only in the renderer's memory and the sidecar's env var
- **Single-use scope** — valid only for the current session, invalidated when the app closes

### Shutdown

Tauri kills the sidecar process when the app closes. Standard sidecar lifecycle.

### CLI Harness (Development / Testing)

For development, `packages/ai/` includes a CLI harness that replaces the Rust relay with a terminal interface. Instead of stdin/stdout going through Rust and into the renderer, the CLI harness processes messages directly:

```bash
pnpm --filter @voquill/ai dev
```

The CLI harness:
- Reads sidecar stdout messages and handles them inline (e.g., responds to `tools/list` with a hardcoded tool set, proxies `llm/chat` directly to an OpenAI-compatible endpoint)
- Writes responses to the sidecar's stdin
- Accepts an `LLM_BASE_URL` and `LLM_API_KEY` env var for direct LLM access without the desktop app's provider routing

Native tools won't be available in CLI mode, but the agent can still chat and use API tools. This makes it easy to iterate on the agent without running the full desktop app.

## 2. IPC Protocol

The sidecar and renderer communicate via newline-delimited JSON messages over stdin/stdout. Every message has an `id` for request/response correlation.

### Message Schema

```ts
// Base shape — every message has an id and a type
type SidecarMessageBase = {
  id: string;
  type: string;
};

// --- Sidecar → Renderer (requests via stdout) ---

type ToolsListRequest = SidecarMessageBase & {
  type: "tools/list";
};

type ToolsPermissionRequest = SidecarMessageBase & {
  type: "tools/permission";
  tool: string;
  params: Record<string, unknown>;
};

type ToolsPermissionStatusRequest = SidecarMessageBase & {
  type: "tools/permission-status";
  permissionId: string;
};

type ToolsExecuteRequest = SidecarMessageBase & {
  type: "tools/execute";
  tool: string;
  token: string;
};

type LlmChatRequest = SidecarMessageBase & {
  type: "llm/chat";
  messages: OpenAiMessage[];
  stream: boolean;
};

type SidecarRequest =
  | ToolsListRequest
  | ToolsPermissionRequest
  | ToolsPermissionStatusRequest
  | ToolsExecuteRequest
  | LlmChatRequest;

// --- Renderer → Sidecar (responses via stdin) ---

type SidecarResponseOk = SidecarMessageBase & {
  status: "ok";
  result: unknown;
};

type SidecarResponseError = SidecarMessageBase & {
  status: "error";
  error: string;
};

type SidecarResponseChunk = SidecarMessageBase & {
  status: "chunk";
  data: unknown;
};

type SidecarResponseDone = SidecarMessageBase & {
  status: "done";
};

type SidecarResponse =
  | SidecarResponseOk
  | SidecarResponseError
  | SidecarResponseChunk
  | SidecarResponseDone;
```

`SidecarRequest` is a discriminated union on `type` (what do you want?). `SidecarResponse` is a discriminated union on `status` (what happened?). The `id` ties a response to its request.

### Request/Response Correlation

Non-streaming requests get back one `SidecarResponseOk` or `SidecarResponseError`. Streaming requests (like `llm/chat` with `stream: true`) get back N `SidecarResponseChunk` messages followed by one `SidecarResponseDone`, all sharing the same `id`.

### Sidecar IPC Client

The sidecar maintains a **pending promises map** — a `Map<string, { resolve, reject }>` keyed by message ID. Sending a request writes JSON to stdout and returns a promise. When a response arrives on stdin with a matching ID, the promise resolves.

```ts
const pending = new Map<string, { resolve: Function; reject: Function }>();

process.stdin.on("data", (data) => {
  const msg = JSON.parse(data);
  const entry = pending.get(msg.id);
  if (entry) {
    pending.delete(msg.id);
    entry.resolve(msg);
  }
});

function request<T>(type: string, payload: object): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`IPC request ${type} timed out`));
    }, 30_000);
    process.stdout.write(JSON.stringify({ id, type, ...payload }) + "\n");
  });
}
```

For streaming responses, the client uses an async iterator pattern instead of a single promise:

```ts
function requestStream(type: string, payload: object): AsyncIterable<unknown> {
  const id = crypto.randomUUID();
  // Create a readable stream, register it in a streaming map keyed by id
  // When "chunk" messages arrive with this id, push to the stream
  // When "done" arrives, close the stream and clean up
}
```

### Rust Relay

Rust's role is minimal — it's a dumb pipe between the sidecar's stdio and the renderer's IPC:

```rust
// On sidecar stdout line received:
app.emit("sidecar-request", payload)?;

// Tauri command called by the renderer to send responses:
#[tauri::command]
fn send_to_sidecar(sidecar: State<SidecarHandle>, message: String) {
    sidecar.write_stdin(message);
}
```

Rust never interprets, validates, or transforms the messages. It passes JSON through.

### Renderer Message Handler

The renderer listens for sidecar requests and dispatches them to the appropriate handler:

```ts
listen("sidecar-request", async (event) => {
  const msg = event.payload as SidecarRequest;

  try {
    switch (msg.type) {
      case "tools/list":
        return sendToSidecar({ id: msg.id, status: "ok", result: getToolList() });
      case "tools/permission":
        return sendToSidecar({ id: msg.id, status: "ok", result: requestPermission(msg) });
      case "tools/permission-status":
        return sendToSidecar({ id: msg.id, status: "ok", result: getPermissionStatus(msg) });
      case "tools/execute":
        return sendToSidecar({ id: msg.id, status: "ok", result: await executeTool(msg) });
      case "llm/chat":
        return await streamLlmChat(msg); // sends multiple chunks + done
    }
  } catch (e) {
    sendToSidecar({ id: msg.id, status: "error", error: e.message });
  }
});

async function sendToSidecar(response: SidecarResponse) {
  await invoke("send_to_sidecar", { message: JSON.stringify(response) });
}
```

## 3. LLM Proxy

The renderer's message handler proxies LLM calls for the sidecar. The sidecar sends a `llm/chat` request, and the renderer routes it to the correct provider.

### How It Works

The sidecar sends:
```json
{ "id": "abc", "type": "llm/chat", "messages": [...], "stream": true }
```

The renderer:
1. Resolves the user's configured provider + model from Zustand state
2. Calls the appropriate generative text repo's streaming method
3. Streams chunks back to the sidecar as `SidecarResponseChunk` messages
4. Sends a final `SidecarResponseDone` when the stream completes

```ts
async function streamLlmChat(msg: LlmChatRequest) {
  const repo = getConfiguredGenerativeTextRepo();
  const stream = repo.streamChatCompletion(msg.messages);

  for await (const chunk of stream) {
    sendToSidecar({ id: msg.id, status: "chunk", data: chunk });
  }
  sendToSidecar({ id: msg.id, status: "done" });
}
```

### Streaming via Generative Text Repos

The existing generative text provider repositories (one per provider) already handle non-streaming LLM calls. Each repo gets a new method that returns a streaming response in a unified format:

```ts
interface StreamingChatCompletion {
  stream(): AsyncIterable<OpenAiChatChunk>;
}
```

Each repo implements this using its provider's native streaming API and translates chunks to OpenAI-format on the fly. Providers that already speak OpenAI format (Groq, OpenAI, Ollama, OpenRouter, Deepseek) pass chunks through. Providers with different APIs (Claude, Gemini) translate in their repo implementation.

### Mode-Specific Routing

- **Community mode**: Reads the user's configured provider + key from local state, calls the provider directly via the corresponding repo.
- **Cloud mode**: Forwards to a Firebase function endpoint that handles provider routing server-side.
- **Enterprise mode**: Forwards to the enterprise gateway, which has its own provider routing, tier-based selection, and key management.

From the sidecar's perspective, it always sends the same `llm/chat` message — the renderer handles everything.

## 4. Tool Architecture

### Design Principle

All tools are **imperative** and **stateless** — the Mastra sidecar executes tools directly and gets results back inline. The tools themselves hold no state; they call out to services (the renderer, external APIs) that manage state. This lets the agent chain tools naturally in a single turn.

Tools come from multiple sources but from the agent's perspective they all work the same way: discover → request permission → poll for approval → execute with token.

### Tool Sources

The renderer aggregates tools from multiple sources into a single registry:

- **Native (Tauri)** — built-in tools that invoke Tauri commands (paste, screenshot, get selected text, etc.)
- **HTTP** — tools registered by the user in the desktop app UI, pointing to external HTTP endpoints
- **Callable** — tools exposed by the Firebase cloud functions or enterprise gateway server

On startup (and when the sidecar sends a `tools/list` request), the renderer gathers tools from all sources and returns a unified list. The sidecar doesn't know or care where a tool comes from.

### Tool Discovery

The sidecar sends a `tools/list` request on startup:

```json
{ "id": "1", "type": "tools/list" }
```

The renderer responds with all available tools:

```json
{
  "id": "1",
  "status": "ok",
  "result": {
    "tools": [
      {
        "id": "paste",
        "description": "Writes to clipboard and triggers paste",
        "schema": { "type": "object", "properties": { "text": { "type": "string" } }, "required": ["text"] }
      }
    ]
  }
}
```

The sidecar dynamically registers each tool with Mastra. No tool definitions are hardcoded in `packages/ai/` — the renderer is the single source of truth for what tools exist, what they do, and what parameters they accept.

### Tool Permission System

Every tool call goes through a three-step flow: **request permission** → **poll for approval** → **execute with token**. This ensures the user stays in control of what the agent can do, and that approved parameters cannot be tampered with after approval.

#### Flow

1. Sidecar sends `tools/permission` with tool ID and params:
   ```json
   { "id": "2", "type": "tools/permission", "tool": "paste", "params": { "text": "Hello" } }
   ```
2. Renderer creates a permission record in Zustand, storing the params. Checks the allowlist for auto-approval. Returns the permission ID:
   ```json
   { "id": "2", "status": "ok", "result": { "permissionId": "p-abc" } }
   ```
3. Sidecar polls for approval status via `tools/permission-status`:
   ```json
   { "id": "3", "type": "tools/permission-status", "permissionId": "p-abc" }
   ```
4. Renderer checks the permission record:
   - If `pending` → the desktop UI is showing an approval prompt:
     ```json
     { "id": "3", "status": "ok", "result": { "status": "pending" } }
     ```
   - If `denied` → user rejected:
     ```json
     { "id": "3", "status": "ok", "result": { "status": "denied" } }
     ```
   - If `allowed` → user approved, renderer issues a signed JWT:
     ```json
     { "id": "3", "status": "ok", "result": { "status": "allowed", "token": "eyJ..." } }
     ```
5. Sidecar executes with the token via `tools/execute`:
   ```json
   { "id": "4", "type": "tools/execute", "tool": "paste", "token": "eyJ..." }
   ```
6. Renderer verifies the JWT, loads the stored params from the permission record, executes the tool using the appropriate strategy, and returns the result:
   ```json
   { "id": "4", "status": "ok", "result": { "success": true } }
   ```

#### Parameter Binding

Tool parameters are **locked at permission time**. The sidecar passes the full params in step 1, and those params are stored with the permission record. When the tool executes in step 5, it uses the stored params — the execute request carries only the token, not the params. This means:

- The user sees exactly what the agent wants to do before approving
- There's no way to change the params after approval
- The permission request is a signed intent

#### Token Design

The execution token is a **signed JWT** issued by the renderer. It contains:

- `permission_id` — references the stored permission record (and its params)
- `tool` — the tool ID (for validation)
- Signed with a secret generated in-memory at app launch

The renderer verifies the JWT signature on execute, extracts the `permission_id`, loads the stored params, and runs the tool. No valid token = no execution.

#### Storage

Permission records, stored params, and issued tokens are all held **in-memory** in Zustand at runtime — never persisted to disk or database. Permissions and tokens are inherently ephemeral (scoped to a single app session), so in-memory storage is the right fit.

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
  const { permissionId } = await request("tools/permission", { tool, params });

  let status = "pending";
  while (status === "pending") {
    await sleep(500);
    const result = await request("tools/permission-status", { permissionId });
    status = result.status;
    if (status === "denied") return { error: `User denied ${tool}` };
    if (status === "allowed") {
      return await request("tools/execute", { tool, token: result.token });
    }
  }
}
```

Since tool definitions are fetched dynamically via `tools/list`, the sidecar registers them generically:

```ts
const { tools } = await request("tools/list", {});

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

Each tool definition includes an internal execution strategy that determines how the tool is actually invoked. The sidecar never sees this — it's the renderer's concern.

#### Strategy Types

```ts
type TauriToolStrategy = { type: "tauri"; command: string };
type HttpToolStrategy = { type: "http"; url: string; method: "GET" | "POST" };
type CallableToolStrategy = { type: "callable"; path: string };

type ToolStrategy = TauriToolStrategy | HttpToolStrategy | CallableToolStrategy;
```

- **tauri** — invokes a Tauri command (paste, type, screenshot, etc.)
- **http** — makes an HTTP request to a user-registered URL or external service
- **callable** — calls a Firebase cloud function or enterprise gateway endpoint

#### Tool Definition

```ts
// packages/types — shared types
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

`ToolInfo` and `ToolPermissionStatus` live in `packages/types`. `ToolDefinition` extends `ToolInfo` with the internal `strategy` field and stays in `apps/desktop` — the sidecar never sees it.

#### Execution Repositories

Each strategy type has a corresponding repo:

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

The renderer message handler reads from and writes to these maps directly. No separate registry class needed — the state *is* the registry.

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
| `search_transcriptions` | callable | Search user's transcription history |
| `get_user_preferences` | callable | Read user settings |
| `web_search` | http | Call a search API |

## 5. Desktop App Frontend

### Routes

Two routes:

- `/dashboard/chats` — chat list page (shows all conversations, create new chat)
- `/dashboard/chats/:id` — individual chat page (conversation with the agent)

```
src/components/chats/
  ChatsPage.tsx           — chat list page
  ChatPage.tsx            — individual chat conversation page
  ChatSideEffects.tsx     — subscriptions, sidecar health check, message handler lifecycle
  ChatMessages.tsx        — message list rendering
  ChatInput.tsx           — input field
```

### State

New Zustand state slice:

```ts
interface AiState {
  sidecarStatus: "starting" | "ready" | "error";
  sidecarPort: number;
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

### Renderer Message Handler

The renderer's message handler (described in Section 2) starts before the sidecar launches. It listens for `sidecar-request` events from Rust and dispatches them to the appropriate handler function. Each handler has direct access to Zustand state and Tauri's `invoke()`.

```ts
// Simplified — actual implementation in src/sidecar/
listen("sidecar-request", async (event) => {
  const msg = event.payload as SidecarRequest;
  // ... dispatch by msg.type (see Section 2)
});
```

## 6. Implementation Order

### Phase 1: Foundation
1. Create `packages/ai/` with a basic Mastra agent (no tools, just chat)
2. Build the IPC client in `packages/ai/` (pending promises map, request/response over stdin/stdout)
3. Build the CLI harness in `packages/ai/` for standalone testing
4. Build the Rust relay (sidecar stdout → renderer event, renderer invoke → sidecar stdin)
5. Build the renderer message handler with `llm/chat` support
6. Wire up the sidecar in Tauri config
7. Build the chat page in the desktop app
8. End-to-end: user can chat with the AI via the desktop app

### Phase 2: Native Tools + Permission System
9. Build the tool registry in Zustand and `tools/list` handler
10. Build the permission system (`tools/permission`, `tools/permission-status`, JWT token issuance, approval UI)
11. Build the `tools/execute` handler (JWT validation, stored param lookup, strategy dispatch)
12. Build the `callTool` helper in `packages/ai/` (permission → poll → execute over IPC)
13. Wire up dynamic tool registration in the sidecar (request `tools/list` on startup, register generically)
14. Implement Tauri commands for paste, get selection, accessibility, screenshot, etc.
15. End-to-end: agent can read screen context and take actions (with user approval)

### Phase 3: Cloud + Enterprise LLM Routing
16. Add cloud/enterprise provider routing in the renderer's `llm/chat` handler
17. Renderer selects the right upstream based on deployment mode

### Phase 4: API Tools
18. Add callable tools (search transcriptions, etc.)
19. Add HTTP tool registration UI
20. Pass auth context for authenticated API calls

## 7. Conversation Persistence

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
