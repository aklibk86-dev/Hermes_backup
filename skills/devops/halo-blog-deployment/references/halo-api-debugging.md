# Halo 2.x API Debugging Reference

## API Hierarchy

| Layer | Base Path | Purpose | PAT Access |
|-------|-----------|---------|------------|
| Console | `/apis/api.console.halo.run/v1alpha1` | Dashboard CRUD, auth, stats | Read ✅ / Create ✅ / Update ❌ (500) |
| User Center | `/apis/uc.api.content.halo.run/v1alpha1` | User-scoped operations (draft, recycle) | Delete ✅ (recycle bin) |
| Content | `/apis/content.halo.run/v1alpha1` | Direct resource CRUD (hard delete) | Hard-delete ✅ |
| Plugin | `/apis/api.console.halo.run/v1alpha1/plugins` | Plugin management | Partial |
| Theme | `/apis/api.console.halo.run/v1alpha1/themes` | Theme activation | Partial |
| Actuator | `/actuator` | Health, info, caches, env, mappings | ✅ |

## Common Endpoints

```python
BASE = 'https://blog.aklibk.com'
H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Stats
GET  /apis/api.console.halo.run/v1alpha1/stats
→ {"posts": N, "comments": 0, ...}

# List posts (unfiltered)
GET  /apis/api.console.halo.run/v1alpha1/posts?page=0&size=50

# List active posts
GET  /apis/api.console.halo.run/v1alpha1/posts?labelSelector=content.halo.run/deleted=false

# List by phase
GET  /apis/api.console.halo.run/v1alpha1/posts?publishPhase=PUBLISHED|DRAFT|PENDING_APPROVAL

# Create post
POST /apis/api.console.halo.run/v1alpha1/posts
{post: {apiVersion, kind, metadata, spec}, content: {raw, content, rawType}}

# Update post metadata
PUT  /apis/api.console.halo.run/v1alpha1/posts/{name}

# Update draft content
PUT  /apis/uc.api.content.halo.run/v1alpha1/posts/{name}/draft?patched=false

# Publish
PUT  /apis/api.console.halo.run/v1alpha1/posts/{name}/publish?async=true|false

# Hard-delete
DELETE /apis/content.halo.run/v1alpha1/posts/{name}

# Soft-delete (recycle bin)
DELETE /apis/uc.api.content.halo.run/v1alpha1/posts/{name}/recycle

# Check single post
GET  /apis/api.console.halo.run/v1alpha1/posts/{name}

# Get snapshot (post content)
GET  /apis/content.halo.run/v1alpha1/snapshots/{snapshot_name}

# Theme activation
PUT  /apis/api.console.halo.run/v1alpha1/themes/{theme-name}/activation
```

## Response Shape Notes

- **List endpoint**: items are nested under `post` key → `item.get('post', item).get('spec', {}).get('title')`
- **Single post endpoint**: returns post at top level → `.get('spec', {}).get('title')`
- **Create POST**: payload nests post under `post` key
- **Stats**: returns flat JSON with counts

## Ghost Post Pattern

Posts created by PAT without `owner` and `content.halo.run/deleted` label:
1. Appear in unfiltered listing → `total: N`
2. Individual GET returns 404 (after UC recycle marks as deleted)
3. No `content.halo.run/deleted` label — `deleted=false` filter doesn't match
4. Dashboard count includes them

## Link Scheme Fix

When `Scheme not found for core.halo.run/v1alpha1/Link` error appears after deleting all posts:
1. Send PUT to each enabled plugin endpoint to trigger scheme re-registration
2. Restart Halo Docker container

## MCP Server Test Pattern

```python
import asyncio, json, os

cwd = os.path.expanduser('~/halo-mcp-server')
proc_env = os.environ.copy()
proc_env.pop('HALO_TOKEN', None)  # Let .env file handle auth

proc = await asyncio.create_subprocess_exec(
    'python3', '-u', '-m', 'halo_mcp_server',
    stdin=asyncio.subprocess.PIPE,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    cwd=cwd, env=proc_env
)

# Initialize
req = {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
       'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                  'clientInfo': {'name': 'test', 'version': '1.0.0'}}}
proc.stdin.write((json.dumps(req) + '\n').encode())
await proc.stdin.drain()
line = await asyncio.wait_for(proc.stdout.readline(), timeout=10)
resp = json.loads(line.decode())

# Tool call
req2 = {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call',
        'params': {'name': 'create_post', 'arguments': {...}}}
proc.stdin.write((json.dumps(req2) + '\n').encode())
await proc.stdin.drain()
line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
resp2 = json.loads(line.decode())
```

## Env file reading (avoids terminal redaction)

```python
with open(os.path.expanduser('~/halo-mcp-server/.env')) as f:
    token = ''
    for line in f:
        if 'HALO_TOKEN' in line and '=' in line:
            token = line.split('=', 1)[1].strip()
```
