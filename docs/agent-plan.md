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

On each app launch, the desktop app generates a random session API key (e.g., `crypto.randomUUID()`). This key is:

1. Passed to the sidecar via the `DESKTOP_API_KEY` env var
2. Used by the desktop API server to authenticate all incoming requests (both LLM proxy and tool endpoints)

The server rejects any request that doesn't include a valid `Authorization: Bearer <key>` header. Since the key is generated fresh per session and only shared between the desktop app and its own sidecar process, no other local process can access the LLM proxy or native tools.

The sidecar includes this key in all desktop API requests automatically.

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

Tools fall into two categories based on where they execute, but from the agent's perspective they all work the same way: request permission → execute.

### Tool Permission System

Every tool call goes through a two-step permission flow: **request permission**, then **execute**. This ensures the user stays in control of what the agent can do without interrupting the agent's reasoning.

#### API

```
POST /tools/{tool}/permissions
  Body: { ...params that will be passed to execute }
  Response: { status: "allowed" | "pending" | "denied", permission_id: "..." }

GET /tools/permissions/{permission_id}
  Response: { status: "allowed" | "pending" | "denied" }

POST /tools/{tool}/execute
  Body: { permission_id: "...", ...params }
  Response: { result: {...} }
```

#### Flow

1. Agent calls `POST /tools/paste/permissions` with `{ text: "Hello" }`
2. Server checks the allowlist for this tool + params
3. If already allowed → `{ status: "allowed", permission_id: "abc" }`
4. If not → server creates a permission request, shows a prompt in the desktop UI → `{ status: "pending", permission_id: "abc" }`
5. Agent polls `GET /tools/permissions/abc` until it resolves to `allowed` or `denied`
6. If `allowed` → agent calls `POST /tools/paste/execute` with `{ permission_id: "abc", text: "Hello" }`
7. If `denied` → agent informs the user it couldn't perform the action

The `execute` endpoint rejects any call without a matching, approved `permission_id`. You can't skip the permission step.

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
  const perm = await requestPermission(tool, params);

  if (perm.status === "pending") {
    perm = await pollUntilResolved(perm.permissionId);
  }

  if (perm.status === "denied") {
    return { error: `User denied ${tool}` };
  }

  return await executeTool(tool, perm.permissionId, params);
}
```

Each Mastra tool is then just:

```ts
const pasteText = createTool({
  id: "paste_text",
  description: "Paste text at the current cursor position",
  inputSchema: z.object({ text: z.string() }),
  execute: ({ context }) => callTool("paste", { text: context.text }),
});
```

### Native Tool Endpoints

The desktop API server exposes native capabilities under the `/tools/` prefix. Each tool has `permissions` and `execute` routes. The execute handler wraps a Tauri `invoke()` call.

| Tool | What it does |
|---|---|
| `paste` | Writes to clipboard and triggers paste via Tauri |
| `type` | Types text via Tauri keyboard input |
| `get-selected-text` | Returns the currently selected text |
| `get-accessibility-info` | Returns accessibility tree / focused element info |
| `capture-screenshot` | Takes a screenshot, returns base64 or file path |
| `open-window` | Opens/focuses a Tauri window |
| `close-window` | Closes a Tauri window |

### API Tools

These run directly in the Mastra sidecar (no tool server needed):

| Tool | Action |
|---|---|
| `search_transcriptions` | Call server API to search user's transcription history |
| `get_user_preferences` | Read user settings |
| `web_search` | Call a search API |

These tools make HTTP calls and return results to the agent. They can hit the same server the user is connected to (Firebase, enterprise gateway, etc.) using the auth token passed at startup.

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

The desktop API server runs in the renderer process, which gives it direct access to Tauri's `invoke()`. It starts before the sidecar launches and handles both LLM proxy routes and native tool routes on a single port.

```ts
// Simplified — actual implementation in src/desktop-api/

// LLM proxy
app.post("/v1/chat/completions", async (req) => {
  const repo = getConfiguredGenerativeTextRepo();
  const stream = repo.streamChatCompletion(req.body.messages);
  // ... stream SSE response
});

// Tool permissions
app.post("/tools/:tool/permissions", async (req) => {
  const { tool } = req.params;
  const status = permissionManager.check(tool, req.body);
  if (status === "allowed") return { status, permission_id: createId() };
  const id = permissionManager.requestApproval(tool, req.body); // shows UI prompt
  return { status: "pending", permission_id: id };
});

app.get("/tools/permissions/:id", async (req) => {
  return { status: permissionManager.getStatus(req.params.id) };
});

// Tool execution
app.post("/tools/:tool/execute", async (req) => {
  permissionManager.assertApproved(req.body.permission_id);
  const result = await executeToolViaTauri(req.params.tool, req.body);
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
6. Build the tool permission system (permissions endpoint, polling endpoint, approval UI)
7. Add native tool execute endpoints to the desktop API server (`/tools/*/execute`)
8. Build the `callTool` helper in `packages/ai/` (request permission → poll → execute)
9. Define native tool schemas in Mastra using the helper
10. Implement Tauri commands for paste, get selection, accessibility, screenshot, etc.
11. End-to-end: agent can read screen context and take actions (with user approval)

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
