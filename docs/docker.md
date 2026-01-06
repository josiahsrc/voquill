# Docker Development Setup

This guide covers the Docker Compose setup for running Ollama locally during development. The setup includes an optional Caddy reverse proxy for testing API key authentication.

## Overview

The Docker setup provides two ways to access Ollama:

| Port  | Service | Authentication | Use Case |
|-------|---------|----------------|----------|
| 11430 | Caddy → Ollama | Bearer token required | Testing API key auth (e.g., secured Ollama behind reverse proxy) |
| 11431 | Ollama direct | None | Standard local development |

## Quick Start

### 1. Start the services

```bash
# From the repository root
docker compose up -d
```

For Linux with NVIDIA GPU support:

```bash
docker compose -f docker-compose.yml -f docker-compose.linux-gpu.yaml up -d
```

### 2. Pull a model

```bash
# Small model for quick testing (~2GB)
docker compose exec ollama ollama pull llama3.2:1b

# Larger, more capable model (~4GB)
docker compose exec ollama ollama pull llama3.2:3b

# Even larger options
docker compose exec ollama ollama pull llama3.1:8b
docker compose exec ollama ollama pull mistral:7b
```

### 3. Configure Voquill

In Voquill settings, add an Ollama API key with:

- **URL**: `http://localhost:11430` (with auth) or `http://localhost:11431` (no auth)
- **API Key**: `test-api-key-12345` (only needed for port 11430)
- **Model**: Select from the dropdown (e.g., `llama3.2:1b`)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Host Machine                         │
│                                                         │
│  Voquill App                                            │
│      │                                                  │
│      ├──► :11430 ──► Caddy (auth) ──► Ollama (:11434)  │
│      │                                                  │
│      └──► :11431 ──────────────────► Ollama (:11434)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Caddy acts as a reverse proxy that validates the `Authorization: Bearer <token>` header before forwarding requests to Ollama. This mimics a production setup where Ollama is secured behind authentication.

## Managing Models

### List installed models

```bash
docker compose exec ollama ollama list
```

### Pull a new model

```bash
docker compose exec ollama ollama pull <model-name>
```

### Remove a model

```bash
docker compose exec ollama ollama rm <model-name>
```

### Model recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama3.2:1b` | ~2GB | Fast | Good | Quick testing, light post-processing |
| `llama3.2:3b` | ~4GB | Medium | Better | General use |
| `llama3.1:8b` | ~8GB | Slower | Best | High-quality post-processing |
| `mistral:7b` | ~7GB | Medium | Great | Alternative to Llama |
| `phi3:mini` | ~2GB | Fast | Good | Lightweight alternative |

Browse all available models at [ollama.com/library](https://ollama.com/library).

## Testing the Setup

### Verify Ollama is running

```bash
# Direct access (no auth)
curl http://localhost:11431/api/tags

# Through Caddy (requires auth)
curl http://localhost:11430/api/tags
# Returns: 401 Unauthorized

curl -H "Authorization: Bearer test-api-key-12345" http://localhost:11430/api/tags
# Returns: {"models": [...]}
```

### Test a completion

```bash
curl http://localhost:11431/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Hello!",
  "stream": false
}'
```

## Configuration

### Changing the API key

Edit the `API_KEY` environment variable in `docker-compose.yml`:

```yaml
caddy:
  environment:
    API_KEY: your-custom-api-key-here
```

Then restart:

```bash
docker compose down && docker compose up -d
```

### Caddy configuration

The Caddy reverse proxy configuration is located at `config/ollama/Caddyfile`. It accepts authentication via:

- `Authorization: Bearer <API_KEY>` header
- `X-API-Key: <API_KEY>` header

### Persistent data

Model data is stored in a Docker volume (`ollama_data`) and persists across container restarts. To completely reset:

```bash
docker compose down -v  # -v removes volumes
docker compose up -d
```

## Troubleshooting

### "Unable to connect to Ollama"

1. Check if containers are running: `docker compose ps`
2. Check logs: `docker compose logs ollama` or `docker compose logs caddy`
3. Verify the URL and port in Voquill settings
4. If using port 11430, ensure the API key is set

### Model not appearing in dropdown

1. Ensure the model is pulled: `docker compose exec ollama ollama list`
2. Check Ollama logs: `docker compose logs ollama`
3. Try refreshing the model picker in Voquill

### GPU not being used (Linux)

1. Ensure you're using the GPU compose file:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.linux-gpu.yaml up -d
   ```
2. Verify NVIDIA Container Toolkit is installed:
   ```bash
   nvidia-smi
   docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
   ```
3. Check Ollama logs for GPU detection: `docker compose logs ollama`

### Slow inference on macOS

Docker on macOS runs in a Linux VM and cannot access Apple Silicon GPU acceleration. For best performance on Mac, run Ollama natively:

```bash
brew install ollama
ollama serve
```

Then point Voquill to `http://localhost:11434`.

## Stopping the Services

```bash
# Stop containers (keeps data)
docker compose down

# Stop and remove volumes (deletes downloaded models)
docker compose down -v
```
