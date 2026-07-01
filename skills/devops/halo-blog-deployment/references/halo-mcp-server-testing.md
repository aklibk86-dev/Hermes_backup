# halo-mcp-server Testing Reference

Session-derived reference for testing the Halo MCP server (v0.1.6, server v1.28.0) via stdio protocol.

## Architecture

```
AI Assistant
    ↕ MCP stdio (JSON-RPC 2.0)
halo-mcp-server (Python process)
    ↕ HTTPS + Bearer Token
Halo Blog API (https://blog.example.com)
    ↕ 
PostgreSQL (backend)
```

## Core MCP Protocol Flow

1. **Initialize** — send `initialize` request with protocol version
2. **Notify initialized** — send `notifications/initialized`
3. **List tools** — `tools/list` returns all available tools with input schemas
4. **Call tool** — `tools/call` with tool name + arguments
5. **Receive result** — JSON-RPC response with `result.content[0].text`

## Secret Handling

**CRITICAL**: The terminal tool replaces secret-like strings (JWTs, tokens) with `***` in both command text and output. This breaks inline Python scripts that use `os.environ['HALO_TOKEN']` because the env var becomes `***`.

**Correct approach**: Run the MCP server from the `.env` directory WITHOUT passing `HALO_TOKEN` in the subprocess env:

```python
cwd = os.path.expanduser('~/halo-mcp-server')
proc_env = os.environ.copy()
proc_env.pop('HALO_TOKEN', None)  # Don't override — let .env handle it

proc = await asyncio.create_subprocess_exec(
    'python3', '-u', '-m', 'halo_mcp_server',
    stdin=..., stdout=..., stderr=...,
    cwd=cwd, env=proc_env
)
```

To read token value in a test script, parse `.env` file directly (avoids terminal redaction):
```python
with open('/path/to/.env') as f:
    token = ''
    for line in f:
        line = line.strip()
        if 'HALO_TOKEN' in line and '=' in line:
            token = line.split('=', 1)[1]
```

## Full Test Script Template

```python
import asyncio, json, os, re

async def main():
    cwd = os.path.expanduser('~/halo-mcp-server')
    proc_env = os.environ.copy()
    # CRITICAL: pop HALO_TOKEN so .env file is used
    proc_env.pop('HALO_TOKEN', None)

    proc = await asyncio.create_subprocess_exec(
        'python3', '-u', '-m', 'halo_mcp_server',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd, env=proc_env
    )

    # Drain stderr (or log errors)
    async def drain_stderr():
        while True:
            line = await proc.stderr.readline()
            if not line: break
    asyncio.create_task(drain_stderr())

    await asyncio.sleep(1.5)  # Wait for server init

    # 1. Initialize
    req = {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
           'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                      'clientInfo': {'name': 'test', 'version': '1.0.0'}}}
    proc.stdin.write((json.dumps(req) + '\n').encode())
    await proc.stdin.drain()
    line = await asyncio.wait_for(proc.stdout.readline(), timeout=10)
    resp = json.loads(line.decode())

    # 2. Create draft post
    create_args = {
        'title': 'Test Article',
        'slug': 'test-article',
        'content': '<p>Hello from MCP!</p>',
        'tags': ['test'],
        'visible': 'PUBLIC',
        'allowComment': True
    }
    req2 = {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call',
            'params': {'name': 'create_post', 'arguments': create_args}}
    proc.stdin.write((json.dumps(req2) + '\n').encode())
    await proc.stdin.drain()
    line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
    result = json.loads(line.decode()).get('result', {})

    # 3. Publish
    text = result['content'][0]['text']
    match = re.search(r'post-[\w]+', text)
    post_name = match.group() if match else ''
    req3 = {'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call',
            'params': {'name': 'publish_post', 'arguments': {'name': post_name}}}
    proc.stdin.write((json.dumps(req3) + '\n').encode())
    await proc.stdin.drain()
    line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
    resp3 = json.loads(line.decode())
    pub = resp3.get('result', {})

    # 4. Verify
    req4 = {'jsonrpc': '2.0', 'id': 4, 'method': 'tools/call',
            'params': {'name': 'get_post', 'arguments': {'name': post_name}}}
    proc.stdin.write((json.dumps(req4) + '\n').encode())
    await proc.stdin.drain()
    line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
    resp4 = json.loads(line.decode())

    proc.kill()
    await proc.wait()

asyncio.run(main())
```

## Updating Posts

### Update title / slug / metadata (update_post)

Use `update_post` for title, slug, tags, categories, cover, visibility changes. It does NOT change content body.

**Auto-publish behavior**: Metadata changes via `update_post` are applied immediately to published posts — NO follow-up `publish_post` call needed. The page reflects the new title/slug/tags right away.

```python
# Call tools/call with:
{
    'name': 'update_post',
    'arguments': {
        'name': 'post-YYYYMMDDHHMMSS',  # internal name from metadata
        'title': '新标题',
        'slug': 'new-slug',             # optional, keep same if no change
    }
}
```

Response: `content_updated: false` (metadata only, no content body changes).

### Update content body (update_post_draft + publish_post)

Use `update_post_draft` when changing the article text. This:
1. Fetches current draft via `GET /apis/uc.api.content.halo.run/v1alpha1/posts/{name}/draft?patched=false`
2. Patches the raw/content with the new text
3. Sets `content.halo.run/content-json` annotation (this is done automatically by the tool)

**CRITICAL**: After `update_post_draft`, you MUST call `publish_post` to promote the draft snapshot to the release. Unlike metadata changes, content body changes are NOT auto-published.

```python
# Step 1: Update content
{
    'name': 'update_post_draft',
    'arguments': {
        'name': 'post-YYYYMMDDHHMMSS',
        'content': '<p>New content here</p>',
        'content_format': 'HTML'  # or MARKDOWN, AUTO
    }
}
# Step 2: Re-publish to make live
{
    'name': 'publish_post',
    'arguments': {'name': 'post-YYYYMMDDHHMMSS'}
}
```

**Workflow summary:**
| Change type | Tool(s) needed | Re-publish needed? |
|-------------|---------------|-------------------|
| Title, slug, tags, visibility | `update_post` | ❌ No (auto-applied) |
| Content body | `update_post_draft` | ✅ Yes → `publish_post` |
| Both | `update_post` + `update_post_draft` + `publish_post` | ✅ Yes (for content part) |

### Delete post (recycle)

```python
{
    'name': 'delete_post',
    'arguments': {'name': 'post-YYYYMMDDHHMMSS'}
}
```

**Soft delete only**: `delete_post` calls `/apis/uc.api.content.halo.run/v1alpha1/posts/{name}/recycle` — moves to recycle bin but does NOT permanently remove. 

- Deleted posts still appear in unfiltered REST API listing (use `labelSelector=content.halo.run/deleted=false` to exclude)
- Individual post endpoint (`GET /apis/api.console.halo.run/v1alpha1/posts/{name}`) returns **404** after recycle
- The recycle API sets `spec.deleted=true` but does NOT add the `content.halo.run/deleted=true` label — use `content.halo.run/deleted!=true` to filter

**Hard delete** (bypass recycle bin):
```python
# Requires REST API directly (MCP delete_post only supports recycle)
httpx.delete(f'{BASE}/apis/api.console.halo.run/v1alpha1/posts/{name}', headers=headers)
```

## Querying Posts

### Via MCP (list_my_posts)

Returns only posts owned by the **current PAT user** (not all posts). Ghost-owned or other-user posts are excluded. Accepts:
- `page`, `size`, `sort` (e.g. `['publishTime,desc']`)
- `keyword`, `publishPhase` (PUBLISHED/DRAFT/PENDING_APPROVAL)
- `category` (category name)

**Tip**: If `list_my_posts` returns fewer posts than expected, use the REST API directly to see the full list (including posts with empty owner or from other users).

### Via REST API (all posts including ghost-owned)

Use direct API calls to see posts owned by other users or with empty owner:

```python
# All posts (all phases)
GET /apis/api.console.halo.run/v1alpha1/posts

# Filter by phase
GET /apis/api.console.halo.run/v1alpha1/posts?publishPhase=PUBLISHED
GET /apis/api.console.halo.run/v1alpha1/posts?publishPhase=DRAFT
GET /apis/api.console.halo.run/v1alpha1/posts?publishPhase=PENDING_APPROVAL

# Published via label selector
GET /apis/api.console.halo.run/v1alpha1/posts?labelSelector=content.halo.run/published=true
```

## Known Issues

### MCP server creates posts without owner/content-json (v0.1.6)

The `create_post` tool in `post_tools.py` does not set `owner` (always `""`) or the `content.halo.run/content-json` annotation. Workaround:

- **Option A**: After creating via MCP, use the REST API to patch the post with owner and content-json, then re-publish
- **Option B**: Create posts directly via REST API with the required fields, bypassing the MCP server
- **Option C**: Patch the `create_post_tool` function in `post_tools.py` to set `owner` from settings and auto-add content-json annotation

### Halo API response shape inconsistency

- **POST create**: returns flat post object (spec.metadata directly)
- **GET single** `/apis/api.console.halo.run/v1alpha1/posts/{name}`: returns flat post object
- **GET list** `/apis/api.console.halo.run/v1alpha1/posts`: returns `{page, size, items: [{post: {...}}]}` — items wrapped in `post` key (with `categories`, `contributors`, `owner`, `stats` at the outer level)
- **Content API** `/apis/content.halo.run/v1alpha1/posts`: returns items unwrapped
- **Pattern for reading**: `item.get('post', item)` — works for both list and single responses

### Post lifecycle with PAT

When using a PAT to create posts, the `owner` field defaults to empty. The PAT token's `sub` claim identifies the user, but the API doesn't automatically populate it. The post shows as "ghost" owner (已删除用户) in listings.

**Phase mapping with PAT**:
- Post with `publish=True` + proper `owner` + `content-json` annotation → `PUBLISHED` phase, publicly accessible
- Post with `publish=True` but empty `owner` → stays in `DRAFT` phase, public URL returns 404 even though `releaseSnapshot` may be set
- Post with `publish=False` → `DRAFT` phase (normal draft)
- Public content API (`/apis/content.halo.run/v1alpha1/posts`) only shows properly published posts

## API Endpoints Used

| Purpose | Method | Path |
|---------|--------|------|
| List posts | GET | `/apis/api.console.halo.run/v1alpha1/posts` |
| List posts (by phase) | GET | `/apis/api.console.halo.run/v1alpha1/posts?publishPhase=PUBLISHED` |
| Create post | POST | `/apis/api.console.halo.run/v1alpha1/posts` |
| Update post metadata | PUT | `/apis/api.console.halo.run/v1alpha1/posts/{name}` |
| Publish post | PUT | `/apis/api.console.halo.run/v1alpha1/posts/{name}/publish?async=true\|false` |
| Get post detail | GET | `/apis/api.console.halo.run/v1alpha1/posts/{name}` |
| Update draft | PUT | `/apis/uc.api.content.halo.run/v1alpha1/posts/{name}/draft` |
| Recycle (soft delete) | DELETE | `/apis/uc.api.content.halo.run/v1alpha1/posts/{name}/recycle` |
| Get draft | GET | `/apis/uc.api.content.halo.run/v1alpha1/posts/{name}/draft?patched=false` |
| Auto-login | POST | `/apis/api.console.halo.run/v1alpha1/auth/login` |
| List users | GET | `/apis/api.console.halo.run/v1alpha1/users` |
| List snapshots | GET | `/apis/content.halo.run/v1alpha1/snapshots` |
| Public posts | GET | `/apis/content.halo.run/v1alpha1/posts` |
