# @voquill/ai

Mastra AI agent sidecar for Voquill. Runs as a standalone process that the desktop app communicates with over HTTP.

## Scripts

```bash
# Build the package
pnpm --filter @voquill/ai build

# Start the Mastra agent dev server (port 4111)
pnpm --filter @voquill/ai dev

# Start the mock desktop API server (port 4112)
# Reads OPENAI_API_KEY from .env, proxies LLM calls, serves mock tools
pnpm --filter @voquill/ai dev:server

# Interactive CLI chat (talks to the agent directly, no HTTP)
pnpm --filter @voquill/ai cli
```

## Local development

1. Copy `.env.sample` to `.env` and add your API key:

```bash
cp packages/ai/.env.sample packages/ai/.env
```

2. Run the mock desktop API and either the Mastra dev server or the CLI:

```bash
# Terminal 1 — mock desktop API (LLM proxy + tools)
pnpm --filter @voquill/ai dev:server

# Terminal 2 — interactive CLI
pnpm --filter @voquill/ai cli
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DESKTOP_API_URL` | `http://localhost:4112` | Desktop API server base URL |
| `DESKTOP_API_KEY` | `dev` | Shared session API key |
| `MASTRA_PORT` | `4111` | Port for the Mastra agent server |
| `OPENAI_API_KEY` | — | API key for LLM proxy (dev server) |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | Upstream LLM endpoint (dev server) |
| `LLM_MODEL` | `gpt-4o` | Model name sent upstream (dev server) |

## Structure

```
src/
  mastra/
    index.ts        — Mastra instance (entry point for mastra dev)
    agents/
      index.ts      — Agent definition with system prompt
  index.ts          — Package exports
scripts/
  dev-server.ts     — Mock desktop API server with tools + LLM proxy
  cli.ts            — Interactive terminal chat
```

## Mock tools (dev server)

The dev server registers these tools with all permissions auto-approved:

- **get-selected-text** — Returns mock selected text
- **paste** — Logs the text that would be pasted
- **type** — Logs the text that would be typed
- **web-search** — Returns mock search results
