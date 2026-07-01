---
name: halo-blog-deployment
category: devops
description: Deploy, configure, and manage Halo 2.x blog platform via Docker with PostgreSQL or MySQL in production.
triggers:
  - "install halo"
  - "halo blog"
  - "deploy halo"
  - "halo with postgresql"
  - "halo database"
  - "halo mcp server"
  - "halo reverse proxy"
  - "halo cloudflare dns"
  - "halo openresty"
  - "halo pat token"
  - "halo postgresql setup"
---

# Halo 2.x Blog Deployment

Deploy Halo 2.x (currently 2.25.x) blog with PostgreSQL in production via Docker.

## Supported Databases

| Database | URL Format | SQL Init Platform | Status |
|----------|-----------|-------------------|--------|
| PostgreSQL | `r2dbc:pool:postgresql://host:5432/db` | `postgresql` | ✅ Production |
| MySQL 8.x | `r2dbc:pool:mysql://host:3306/db` | `mysql` | ✅ Production |
| H2 (embedded) | (default) | (none) | ❌ Dev/testing only |

## Docker Deployment

### One-container (H2 — dev/testing only)

```bash
docker run -d --name halo --restart unless-stopped \
  -p 8090:8090 \
  -v ./halo2:/root/.halo2 \
  -e HALO_WORK_DIR=/root/.halo2 \
  halohub/halo:2
```

### Two-container (PostgreSQL — production)

```bash
# 1. Create network
docker network create halo-net

# 2. Start PostgreSQL
docker run -d --name halo-postgres --network halo-net \
  --restart unless-stopped \
  -e POSTGRES_DB=halo \
  -e POSTGRES_USER=halo \
  -e POSTGRES_PASSWORD=<password> \
  -v halo-pg-data:/var/lib/postgresql \
  postgres:18-alpine

# 3. Start Halo with PostgreSQL
docker run -d --name halo --network halo-net \
  --restart unless-stopped \
  -p 8090:8090 \
  -v ./halo2:/root/.halo2 \
  -e HALO_WORK_DIR=/root/.halo2 \
  halohub/halo:2 \
  --spring.r2dbc.url=r2dbc:pool:postgresql://halo-postgres:5432/halo \
  --spring.r2dbc.username=halo \
  --spring.r2dbc.password=<password> \
  --spring.sql.init.platform=postgresql
```

## Critical Pitfalls

### 1. `spring.sql.init.platform=postgresql` is MANDATORY

Without this flag, Halo generates DDL with the H2-specific `BLOB` type, which PostgreSQL rejects with:
```
ERROR: type "blob" does not exist
CREATE TABLE extensions(..., DATA BLOB, ...)
```

**Always set** `--spring.sql.init.platform=postgresql` (or `mysql`).

### 2. URL format: `r2dbc:pool:postgresql://`

Use the **pool** prefix. `r2dbc:postgresql://` (without pool) may also work but is not the official recommended format.

### 3. PostgreSQL 18+ on Alpine — volume mount

PostgreSQL 18+ Docker images require the volume to be mounted at `/var/lib/postgresql` (the **parent** directory), not `/var/lib/postgresql/data`. The container manages the subdirectory internally.

✔ Correct: `-v halo-pg-data:/var/lib/postgresql`
❌ Wrong: `-v halo-pg-data:/var/lib/postgresql/data`

### 4. Proxy headers

When behind a reverse proxy (OpenResty, nginx, Caddy), pass these headers:
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### 5. Image tags

- `halohub/halo:2` — latest Halo 2.x
- `halohub/halo:2.25` — latest 2.25.x
- `halohub/halo:2.25.3` — specific version
- `:latest` — ⚠️ May point to Halo 1.x! Use `:2` for latest 2.x.

### 6. PAT-created posts need `owner` + `content-json` annotation

**Root cause**: Halo 2.x Personal Access Tokens (PATs) create posts with `owner=""` (empty), which prevents the post from properly transitioning to the `PUBLISHED` phase. Additionally, the `content.halo.run/content-json` annotation is required in the post metadata for the content snapshot system.

**Symptoms**:
- `POST /apis/api.console.halo.run/v1alpha1/posts` returns 200 (draft created)
- `PUT .../publish?async=true` returns 200 (claims published)
- But the public URL (`/archives/<slug>`) returns **404**
- Post appears in DRAFT phase listing (not PUBLISHED), even though `publish: true`
- `releaseSnapshot` may be empty despite a `headSnapshot` existing

**Fix — always pass these in the create payload:**

```python
# 1. Set owner to the actual admin username
'spec': {
    'owner': 'wufeng',  # NOT empty string!
    ...
}

# 2. Add content-json annotation in metadata
'metadata': {
    'name': post_name,
    'annotations': {
        'content.halo.run/content-json': json.dumps({
            'raw': '<html>...</html>',
            'content': '<html>...</html>',
            'rawType': 'HTML'
        })
    },
    ...
}
```

**Note on publish mode**:
- `async=true` — returns quickly but may leave `releaseSnapshot` empty. Works if `owner` and annotation are set.
- `async=false` — blocks until snapshot is fully committed (can timeout at 15s+). More reliable but slower.

**Bug in halo-mcp-server v0.1.6**: The `create_post` tool does NOT set `owner` or the `content-json` annotation. Workaround: create posts with a wrapper that sets these values, or patch the MCP server source.

### 7. Hard-delete vs soft-delete

Three deletion levels exist:

| Method | Endpoint | Effect | Can be undone? |
|--------|----------|--------|---------------|
| Soft-delete (recycle) | `DELETE .../uc.api.content.halo.run/v1alpha1/posts/{name}/recycle` | Trashes post | ✅ Yes (recoverable) |
| Label-delete | `PUT .../content.halo.run/v1alpha1/posts/{name}` with `labels: {'content.halo.run/deleted': 'true'}` | Hides from `deleted=false` filter | ✅ Yes |
| Hard-delete | `DELETE .../content.halo.run/v1alpha1/posts/{name}` | Permanently removes from DB | ❌ No |

**PAT permissions**: PAT can CREATE and soft-delete, but cannot UPDATE posts (returns 500 on console API PUT). Hard-delete via content API always works with PAT.

### 8. Ghost post detection and cleanup

Posts created by PAT without `owner` and `content.halo.run/deleted` label become "ghost" posts:
- They appear in the unfiltered console listing (`/apis/api.console.halo.run/v1alpha1/posts`) 
- They cannot be fetched individually (`GET .../posts/{name}` returns 404 after UC recycle)
- They lack the `content.halo.run/deleted` label, so `labelSelector=content.halo.run/deleted!=true` matches them

**To properly remove ghost posts:**

```python
# Step 1: Add the deleted label via content API
r = httpx.put(f'{BASE}/apis/content.halo.run/v1alpha1/posts/{name}',
    headers=headers, json={
        'apiVersion': 'content.halo.run/v1alpha1',
        'kind': 'Post',
        'metadata': {'name': name, 'labels': {'content.halo.run/deleted': 'true'}},
        'spec': {'title': '(deleted)'}  # 'spec' is required by schema validation
    })

# Step 2: Hard-delete via content API
r = httpx.delete(f'{BASE}/apis/content.halo.run/v1alpha1/posts/{name}', headers=headers)
```

### 9. Stats API and dashboard count

The dashboard's post count comes from:
```
GET /apis/api.console.halo.run/v1alpha1/stats
→ {"posts": N, "comments": 0, "upvotes": 0, "users": 1, "visits": 0}
```

This endpoint counts **ALL posts including deleted ones** (both soft-deleted via recycle and label-deleted). The only way to reduce this count is true hard-delete via the content API (`DELETE /apis/content.halo.run/v1alpha1/posts/{name}`).

### 10. Link scheme corruption (homepage 500)

**Symptoms**: After hard-deleting all posts including the default "Hello Halo" post, the homepage (and all pages) return 500 with:
```json
{"detail": "Scheme not found for core.halo.run/v1alpha1/Link"}
```

**Root cause**: The initial Halo setup registers a `Link` extension scheme. When all data including the default post is hard-deleted via the content API, the scheme registration is lost. This affects ALL themes (both Serenity and Earth).

**Fix — re-enable plugins to trigger scheme re-registration**:
```python
# The PUT to plugin endpoints with enabled=true triggers 
# Halo to re-scan extension registrations
for plugin in plugins:
    httpx.put(f'{BASE}/apis/api.console.halo.run/v1alpha1/plugins/{plugin_name}',
        json={'plugin': {
            'apiVersion': 'plugin.halo.run/v1alpha1', 'kind': 'Plugin',
            'metadata': {'name': plugin_name},
            'spec': {'enabled': True}
        }})

# Then restart the Halo container:
SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w ssh ... 'docker restart halo'
```

**Note**: The plugin PUT returns 404 for each individual call (Halo plugin API doesn't expose direct update), but the aggregate effect of sending these requests triggers the scheme re-registration.

## Initial Setup

After deployment, visit `https://<domain>/console` for the initialization wizard (creates first admin user).

## Management

```bash
# Logs
docker logs halo -f

# Restart
docker restart halo

# PG health
docker exec halo-postgres pg_isready -U halo

# Verify access
curl -s https://blog.example.com/actuator/health
```

## Authentication — Personal Access Token (PAT)

Generate PAT in Halo admin: **Console → Avatar → Personal center → Personal tokens → Create**

Tokens are JWTs starting with `pat_` (~960 chars). Halo signs them with its internal RSA key.

Verify:
```bash
curl -s -H "Authorization: Bearer *** https://<domain>/actuator/info
```
Response `200` = valid.

## halo-mcp-server (AI Integration)

[MCP server](https://pypi.org/project/halo-mcp-server/0.1.6/) connects Halo to AI tools (Claude Desktop, Cursor, etc.):

```bash
python3 -m venv ~/halo-mcp-env && \
  ~/halo-mcp-env/bin/pip install halo-mcp-server==0.1.6
```

Create `.env`:

```env
HALO_BASE_URL=https://blog.aklibk.com
HALO_TOKEN=pat_**...

MCP_SERVER_NAME=halo-mcp-server
MCP_LOG_LEVEL=INFO
```

Run (stdio mode):
```bash
cd ~/halo-mcp-server
~/halo-mcp-env/bin/python3 -m halo_mcp_server
```

MCP config for Claude Desktop:
```json
{
  "mcpServers": {
    "halo-mcp-server": {
      "command": "/path/to/halo-mcp-env/bin/python3",
      "args": ["-m", "halo_mcp_server"],
      "env": {
        "HALO_BASE_URL": "https://blog.aklibk.com",
        "HALO_TOKEN": "pat_***"
      }
    }
  }
}
```

### Post Management via MCP

**Lifecycle workflow** (tested and verified against Halo 2.25.x + halo-mcp-server v0.1.6):

| Step | MCP Tool | Notes |
|------|----------|-------|
| Create draft | `create_post` | Returns post name e.g. `post-YYYYMMDDHHMMSS` |
| Update title/slug | `update_post` | Metadata only (title, slug, tags, visibility) — returns `content_updated: false` |
| Update body | `update_post_draft` | Changes article text. **Must** call `publish_post` after. |
| Publish | `publish_post` | Promotes draft to public. Returns `published: true` |
| Unpublish | `unpublish_post` | Pulls back to draft |
| Soft-delete | `delete_post` | Moves to recycle bin (`POST /apis/uc.api.content.halo.run/v1alpha1/posts/{name}/recycle`) |
| List | `list_my_posts` | Only shows posts owned by the **PAT user** (scope-limited) |
| Read | `get_post` | Single post metadata. Content via `get_post_draft`. |

**Edit → Publish workflow:**
```python
# 1. Change title (metadata only)
call('update_post', {'name': post_name, 'title': '新标题'})

# 2. Change content body (creates new snapshot)
call('update_post_draft', {'name': post_name, 'content': '<p>New HTML</p>', 'content_format': 'HTML'})

# 3. Re-publish to make live
call('publish_post', {'name': post_name})
```

**Reading all posts** (including ghost-owned): `list_my_posts` filters by PAT owner. To see ALL posts (including those with empty owner or from other users), use the REST API directly:

```python
GET /apis/api.console.halo.run/v1alpha1/posts
   ?page=0&size=50
# Filter active only:
GET ...?labelSelector=content.halo.run/deleted=false
# Filter by phase:
GET ...?publishPhase=PUBLISHED|DRAFT|PENDING_APPROVAL
```

The list endpoint wraps items under a `post` key: `item.get('post', item).get('spec', {}).get('title')`.

### Testing MCP Server via stdio Protocol

Use Python asyncio to test the server interactively. The server speaks JSON-RPC 2.0 over stdio:

```python
import asyncio, json

proc = await asyncio.create_subprocess_exec(
    'python3', '-u', '-m', 'halo_mcp_server',
    stdin=asyncio.subprocess.PIPE,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    cwd='/path/to/.env/dir',  # MUST be dir containing .env
    env=proc_env               # Do NOT pass HALO_TOKEN in env — let .env file handle it
)

# Initialize
req = {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
       'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                  'clientInfo': {'name': 'test', 'version': '1.0.0'}}}
proc.stdin.write((json.dumps(req) + '\n').encode())
await proc.stdin.drain()
line = await asyncio.wait_for(proc.stdout.readline(), timeout=10)
resp = json.loads(line.decode())
print(resp["result"]["serverInfo"])  # {'name': 'halo-mcp-server', 'version': '1.28.0'}

# Call a tool
req2 = {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call',
        'params': {'name': 'create_post', 'arguments': {'title': 'Test', ...}}}
proc.stdin.write((json.dumps(req2) + '\n').encode())
await proc.stdin.drain()
line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
resp2 = json.loads(line.decode())
```

### Secret Redaction Workaround

The Hermes terminal tool replaces secret-like strings (tokens, JWTs) with `***` in command output. This means:

- **Do NOT pass `HALO_TOKEN=pat_...` as a shell env var** — the token gets replaced with `***` before the process runs
- **Do read the token from the `.env` file** at runtime in your test script, or
- **Run the MCP server from its own directory** (cwd where `.env` lives) without overriding `HALO_TOKEN` in env
- The `.env` file itself stores the full token (confirmed via byte count: 962 chars for a typical PAT)

❌ Wrong:
```python
# In subprocess — HALO_TOKEN will be '***' (redacted)
env = {**os.environ, 'HALO_TOKEN': pat_string}
```

✅ Correct:
```python
# Let server read from .env in its own directory
env = os.environ.copy()
env.pop('HALO_TOKEN', None)  # Don't override
proc = await asyncio.create_subprocess_exec(
    ..., cwd='/opt/data/home/halo-mcp-server', env=env
)
```

### Available halo-mcp-server Tools (v0.1.6 / server v1.28.0)

| Tool | Purpose |
|------|---------|
| `create_post` | Create draft post |
| `publish_post` | Publish draft → public |
| `unpublish_post` | Pull back to draft |
| `update_post` | Edit post metadata |
| `update_post_draft` | Edit post content + snapshots |
| `delete_post` | Trash post |
| `list_my_posts` | List posts (phases: PUBLISHED/DRAFT) |
| `get_post` | Get single post detail |
| `get_post_draft` | Get draft with content |
| `create_category` / `list_categories` | Category CRUD |
| `create_tag` / `list_tags` | Tag CRUD |
| `upload_attachment` / `list_attachments` | Attachment management |

## OpenResty Full Config Example

Drop a `.conf` file in the 1Panel OpenResty default directory:
`/usr/local/openresty/nginx/conf/default/halo.conf`

```nginx
server {
    listen 80;
    server_name blog.aklibk.com;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:40034;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload: `docker exec <openresty-container> nginx -t && docker exec <openresty-container> nginx -s reload`

## Cloudflare DNS + SSL

Add proxied A record:
```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api_key>" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"blog","content":"<vps_ip>","ttl":1,"proxied":true}'
```

Set Cloudflare SSL to **Flexible** (OpenResty listens on port 80 only).

## Connecting to Existing PostgreSQL (e.g., 1Panel-managed)

1Panel PostgreSQL containers use random suffixes (e.g., `1Panel-postgresql-qqLl`).

### Find the correct user and database
```bash
docker exec <pg-container> psql -U user_k6xnnP -c "\l"
docker exec <pg-container> psql -U user_k6xnnP -c "\du"
```

### Create Halo DB and user
```bash
docker exec <pg-container> psql -U user_k6xnnP -d postgres -c \
  "CREATE DATABASE halo_db OWNER \"user_k6xnnP\";"
docker exec <pg-container> psql -U user_k6xnnP -d postgres -c \
  "CREATE USER halo_user WITH PASSWORD '***';"
docker exec <pg-container> psql -U user_k6xnnP -d postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE halo_db TO halo_user;"
```

> Note: 1Panel masks PG passwords as `***` in `printenv`. Use trust auth via `docker exec` instead.

### Connect via Docker network
Create a bridge network and connect **both** the existing PG and Halo to it:
```bash
docker network create halo-net
docker network connect halo-net <existing-pg-container>
```

## Container Management

```bash
# Full cleanup
docker rm -f halo halo-postgres
docker volume rm halo-pg-data
docker network rm halo-net

# Verify access
curl -s https://blog.example.com/actuator/health
```

### Content Creation via Direct API (Snapshot system)

Halo 2.x stores post body content in **Snapshot** resources, not directly in the post's `htmlContent` field. The three-step workflow:

1. **POST** `/apis/content.halo.run/v1alpha1/snapshots` — create Snapshot with `owner`, `subjectRef`, `contentPatch`, `rawPatch`, `rawType=HTML`, `contributors`
2. **POST** `/apis/api.console.halo.run/v1alpha1/posts` — create post shell (with `publish: True` and `content-json` annotation)
3. **PUT** `/apis/content.halo.run/v1alpha1/posts/{slug}` — link post to Snapshot via `baseSnapshot`/`headSnapshot`/`releaseSnapshot` + set archive labels (year/month/day)

See `references/halo-content-creation-via-api.md` for full code and common pitfalls.

## SEO Configuration

Halo blog SEO (site title, meta description, keywords, verification, per-article optimization) is NOT auto-configured. See:

📄 [`references/halo-seo-configuration.md`](references/halo-seo-configuration.md) — full guide covering admin console settings, search engine verification (Baidu/Bing/Google), sitemap/robots.txt, OG tags, JSON-LD, and SEO health checklist.

**Key fact**: Halo's default meta tags are set in Console → Settings → Basic. They must be manually updated to reflect the blog's actual content.

## References

- Official docs: https://docs.halo.run/getting-started/install/docker-compose/
- Docker Hub: https://hub.docker.com/r/halohub/halo
- GitHub: https://github.com/halo-dev/halo
- MCP Server PyPI: https://pypi.org/project/halo-mcp-server/0.1.6/
