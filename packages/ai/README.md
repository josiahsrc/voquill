# @voquill/ai

Mastra AI agent sidecar for Voquill. The sidecar exposes a local HTTP chat endpoint, but it now resolves tools and LLM calls through newline-delimited stdio messages to its parent process.

## Scripts

```bash
# Build the package
pnpm --filter @voquill/ai build

# Start the sidecar process directly
# Expects a parent process to answer stdio requests
pnpm --filter @voquill/ai dev

# Interactive CLI harness
# Spawns the sidecar, answers stdio requests, exposes mock tools, and proxies LLM HTTP
pnpm --filter @voquill/ai cli
```

## Local development

1. Copy `.env.sample` to `.env` and add your API key:

```bash
cp packages/ai/.env.sample packages/ai/.env
```

2. Run the interactive harness:

```bash
# One command: spawns the sidecar and handles its stdio protocol
pnpm --filter @voquill/ai cli
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `MASTRA_PORT` | `4111` | Port for the Mastra agent server |
| `SIDECAR_API_KEY` | random UUID | Session API key for the sidecar HTTP server |
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
  dev-server.ts     — Sidecar runner with HTTP chat endpoint + stdio IPC
  cli.ts            — Interactive harness that supervises the sidecar
```

## Mock tools (CLI harness)

The CLI harness registers these tools with all permissions auto-approved:

- **get-selected-text** — Returns mock selected text
- **paste** — Logs the text that would be pasted
- **type** — Logs the text that would be typed
- **web-search** — Returns mock search results
