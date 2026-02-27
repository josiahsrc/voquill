# AI Agent Architecture Plan

## Overview

Add an AI assistant page to the desktop app powered by [Mastra](https://mastra.ai). The agent runs locally as a sidecar process, with LLM calls proxied through a unified OpenAI-compatible interface that works identically across all deployment modes (community, cloud, enterprise).

## Architecture

```
┌─────────────────────────────────────────────────┐
│  User's Machine                                 │
│                                                 │
│  Tauri Desktop App (React + Rust)               │
│    │                                            │
│    │  useChat() → localhost:4111                │
│    ▼                                            │
│  Mastra Sidecar (bundled Node.js)               │
│    │                                            │
│    ├─ LLM calls ──→ LLM Proxy (per mode)       │
│    │                                            │
│    ├─ Native tools ──→ returns instructions     │
│    │                    to frontend, which       │
│    │                    executes via Tauri       │
│    │                                            │
│    └─ API tools ──→ external server calls       │
└─────────────────────────────────────────────────┘
```

## 1. Mastra Sidecar

### Location

New directory: `apps/ai/` (or `packages/ai/`) within the monorepo.

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
| `LLM_BASE_URL` | OpenAI-compatible endpoint | `http://localhost:9222/v1` (community) |
| `LLM_API_KEY` | Auth token for the LLM proxy | JWT, Firebase token, or empty string |
| `MASTRA_PORT` | Port for the Mastra server | `4111` |

The desktop app already knows which mode it's in and has the relevant auth tokens. It just passes them through.

### Shutdown

Tauri kills the sidecar process when the app closes. Standard sidecar lifecycle.

## 2. Unified LLM Proxy

Every deployment mode exposes the same OpenAI-compatible interface. Mastra always sees:

```
POST {LLM_BASE_URL}/chat/completions
Authorization: Bearer {LLM_API_KEY}
Content-Type: application/json

{
  "model": "default",
  "messages": [...],
  "stream": true
}
```

The proxy resolves "default" (or any model alias) to a real provider + model internally.

### 2a. Community Mode — Local Proxy in Tauri (Rust)

A lightweight HTTP server in the Rust layer that:

1. Listens on a local port (e.g. `localhost:9222`)
2. Receives OpenAI-format chat completion requests
3. Reads the user's configured LLM provider + API key from local SQLite (same `LocalApiKeyRepo` data the app already stores)
4. Forwards the request to the real provider's OpenAI-compatible endpoint:
   - Groq → `https://api.groq.com/openai/v1`
   - OpenAI → `https://api.openai.com/v1`
   - Ollama → `http://localhost:11434/v1`
   - OpenRouter → `https://openrouter.ai/api/v1`
   - Azure → user's Azure endpoint
   - Deepseek → `https://api.deepseek.com/v1`
   - Claude → needs translation (not OpenAI-compatible natively)
   - Gemini → needs translation (not OpenAI-compatible natively)
5. Streams the response back to Mastra unchanged

Since all existing desktop LLM providers (see `enterprise/gateway/src/apis/llm.api.ts`) already use OpenAI-compatible APIs, the proxy is essentially URL + key swapping for most providers. Claude and Gemini may need response format translation or could be handled via OpenRouter.

No authentication needed — it's localhost-to-localhost.

### 2b. Cloud Mode — Firebase Function

New Firebase function endpoint that:

1. Authenticates the request using the Firebase auth token
2. Routes to the cloud LLM provider(s)
3. Returns OpenAI-format streaming responses

This is a new handler in `apps/firebase/functions` that speaks the OpenAI chat completions format.

### 2c. Enterprise Mode — Gateway Endpoint

New Express route on the existing enterprise gateway:

1. Authenticates using the enterprise JWT (existing auth middleware)
2. Calls existing `selectLlmProvider()` → `createLlmApi()` → retry logic
3. Translates between OpenAI chat completions format and the internal provider abstraction

The gateway already has all the provider routing, tier-based selection, round-robin, and key management. This endpoint just adds an OpenAI-compatible HTTP interface on top.

Suggested route: `POST /v1/chat/completions` on the gateway, or a new handler `ai/chatCompletions` that follows the existing handler pattern.

## 3. Tool Architecture

### Design Principle

Mastra tools are split into two execution models:

- **Declarative tools** (native actions): The tool function returns a structured instruction. The React frontend receives this via the chat stream, interprets it, and executes the actual action through Tauri commands.
- **Imperative tools** (API calls): The tool function executes the action directly (HTTP calls to external services) and returns the result.

### Native Tools (Declarative)

These interact with the OS and must go through Tauri:

| Tool | Returns | Frontend Executes |
|---|---|---|
| `paste_text` | `{ action: "paste", text: "..." }` | Tauri clipboard + paste command |
| `open_window` | `{ action: "open_window", target: "..." }` | Tauri window management |
| `close_window` | `{ action: "close_window" }` | Tauri window management |
| `type_text` | `{ action: "type", text: "..." }` | Tauri keyboard input |

The React chat component intercepts tool call parts from the stream and dispatches corresponding Tauri commands. This fits the existing pattern where TypeScript is the "brain" and Rust provides capabilities.

### API Tools (Imperative)

These run directly in the Mastra sidecar:

| Tool | Action |
|---|---|
| `search_transcriptions` | Call server API to search user's transcription history |
| `get_user_preferences` | Read user settings |
| `web_search` | Call a search API |

These tools make HTTP calls and return results to the agent. They can hit the same server the user is connected to (Firebase, enterprise gateway, etc.) using the auth token passed at startup.

## 4. Desktop App Frontend

### New Route

Add `/dashboard/ai` (or `/dashboard/assistant`) to the router. Follows the existing page pattern:

```
src/components/ai/
  AiPage.tsx            — main page component
  AiSideEffects.tsx     — subscriptions, sidecar health check
  AiChatMessages.tsx    — message list rendering
  AiChatInput.tsx       — input field
  AiToolHandler.tsx     — intercepts tool calls, dispatches Tauri commands
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

### Tool Call Handling

When a message contains tool call parts, the frontend handles them:

```tsx
for (const part of message.parts) {
  if (part.type === "tool-invocation" && part.toolInvocation.state === "result") {
    const result = part.toolInvocation.result;
    if (result.action === "paste") {
      await invoke("paste_text", { text: result.text });
    }
    // etc.
  }
}
```

## 5. Implementation Order

### Phase 1: Foundation
1. Create `apps/ai/` with a basic Mastra agent (no tools, just chat)
2. Add the OpenAI-compatible proxy in Tauri Rust (community mode)
3. Wire up the sidecar in Tauri config
4. Build the chat page in the desktop app
5. End-to-end: user can chat with the AI via the desktop app

### Phase 2: Server Proxies
6. Add `/v1/chat/completions` endpoint to the enterprise gateway
7. Add equivalent Firebase function for cloud mode
8. Desktop app selects the right `LLM_BASE_URL` based on mode

### Phase 3: Native Tools
9. Define native tool schemas in Mastra
10. Build the tool call handler in the React frontend
11. Implement Tauri commands for paste, window management, etc.

### Phase 4: API Tools
12. Add server-calling tools (search transcriptions, etc.)
13. Pass auth context to the sidecar for authenticated API calls

## Open Questions

- **Model selection**: Should the user be able to pick which model the agent uses, or is it always "default" (resolved by the proxy)? The enterprise tier system already handles this, but community users might want to choose.
- **Conversation persistence**: Should chat history be saved to SQLite? If so, new Tauri commands + migration needed.
- **Sidecar binary size**: Bun-compiled binaries can be 80-100MB+. Acceptable for a desktop app, but worth noting.
- **Claude/Gemini in community mode**: These aren't natively OpenAI-compatible. Route through OpenRouter, or add translation in the local proxy?
- **Streaming**: The local Rust proxy needs to support SSE streaming passthrough. Straightforward but needs to be implemented correctly.
- **Tool permissions**: Should the user approve native tool actions before they execute (e.g., "The AI wants to paste text. Allow?"), or auto-execute?
