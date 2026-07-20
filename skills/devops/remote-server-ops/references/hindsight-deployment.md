# Hindsight Deployment (Docker)

Hindsight is an agent memory system by Vectorize.io (18.6k ⭐). It provides long-term semantic memory for AI agents, achieving SOTA on LongMemEval.

## Quick Deploy (Single Docker Container)

```bash
# Pull and run (embedded PostgreSQL + local embeddings)
docker run -d --name hindsight \
  --restart unless-stopped \
  -p 127.0.0.1:8888:8888 \
  -p 127.0.0.1:9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=<provider> \
  -e HINDSIGHT_API_LLM_MODEL=<model> \
  -e HINDSIGHT_API_LLM_API_KEY=<api-key> \
  -e HINDSIGHT_API_LLM_BASE_URL=<base-url> \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## Configuration

### LLM Provider Examples

| Provider | ENV Values |
|---|---|
| DeepSeek | `HINDSIGHT_API_LLM_PROVIDER=deepseek`, `HINDSIGHT_API_LLM_MODEL=deepseek-v4-flash`, `HINDSIGHT_API_LLM_BASE_URL=https://api.deepseek.com/v1` |
| OpenAI | `HINDSIGHT_API_LLM_PROVIDER=openai`, `HINDSIGHT_API_LLM_MODEL=gpt-4o-mini` |
| Anthropic | `HINDSIGHT_API_LLM_PROVIDER=anthropic`, `HINDSIGHT_API_LLM_MODEL=claude-sonnet-4-20250514` |

### Embeddings (Default: Local)

Default uses `BAAI/bge-small-en-v1.5` locally — no external API needed. ~500MB download on first start.

### Database (Default: Embedded pg0)

Built-in PostgreSQL is auto-configured. For external PostgreSQL:
```bash
HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@host:5432/db
```

## Ports

| Port | Service | Purpose |
|---|---|---|
| 8888 | API | `/health`, `/memories`, `/recall`, `/reflect` |
| 9999 | UI | Control plane dashboard |

## 1Panel OpenResty Nginx Config

```nginx
server {
    listen 80;
    server_name hindsight.aklibk.wiki;
    charset utf-8;
    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

## Verification

```bash
# Health check (API)
curl -s http://127.0.0.1:8888/health
# → {"status":"healthy","database":"connected"}

# UI
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9999/
# → 307 (redirect to /dashboard)
```

## Hermes Integration

Add `hindsight` as the memory provider in Hermes config.yaml:
```yaml
memory:
  memory_enabled: true
  provider: hindsight
  hindsight:
    api_url: http://hindsight.aklibk.wiki
    # api_key: optional if authenticated
```

## API Usage

### Create a Memory Bank

```bash
curl -s -X PUT http://127.0.0.1:8888/v1/default/banks/hermes \
  -H "Content-Type: application/json" \
  -d '{"profile":{"name":"Bank Name","mission":"Bank mission statement"}}'
```

Banks use `PUT /v1/default/banks/{bank_id}` — the bank_id is chosen at creation time.

### Retain Memories (Store)

```bash
curl -s -X POST http://127.0.0.1:8888/v1/default/banks/hermes/memories \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"content": "Alice works at Google", "document_id": "doc-1"},
      {"content": "Bob went hiking yesterday", "document_id": "doc-2"}
    ],
    "async": false
  }'
```

**Requirements:**
- Each item MUST have a unique `document_id` within a batch — duplicates cause a 422 error
- A valid LLM API key is required (Hindsight uses the LLM to extract facts during retain)
- Without a working LLM API key, retain returns `"Fact extraction failed: AuthenticationError"`

### Recall Memories (Query)

```bash
curl -s -X POST http://127.0.0.1:8888/v1/default/banks/hermes/memories/recall \
  -H "Content-Type: application/json" \
  -d '{"query": "What does Alice do?"}'
```

### Check Bank Stats

```bash
curl -s http://127.0.0.1:8888/v1/default/banks/hermes/stats
# Shows: total_nodes (memories), total_documents, total_observations
```

### List Available API Endpoints

Full API documentation at `http://127.0.0.1:8888/docs` (Swagger UI) or `http://127.0.0.1:8888/openapi.json`.

Key endpoints under `/v1/default/banks/{bank_id}/`:
- `POST /memories` — batch retain
- `POST /memories/recall` — query memories
- `POST /documents` — document-based retain
- `GET /stats` — bank statistics
- `GET /profile` / `PUT /profile` — bank profile CRUD
- `PUT /config` / `PATCH /config` — bank configuration
- `GET /entities` / `GET /entities/{id}` — entity exploration
- `GET /memories/list` — browse stored memories
- `GET /operations` — background task status
- `POST /consolidate` — trigger consolidation
- `POST /reflect` — agentic reasoning loop

### Pitfall: LLM API Key Required for Memory Import

Hindsight needs an LLM call during retain to extract facts from raw text. If the LLM key is invalid or exhausted, the retain operation fails with `AuthenticationError` even if all other services (health, UI) work fine.

```json
{"detail":"Fact extraction failed: AuthenticationError: Error code: 401 - {'error': {'message': 'Authentication Fails...'}}"}
```

**Fix**: Verify the LLM key is valid by checking the provider's own API, then restart the container with the correct key:
```bash
docker rm -f hindsight
# Re-run docker run with corrected env vars
```
