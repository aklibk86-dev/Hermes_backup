---
name: halo-mcp-server
description: Integrate Halo 2.x blog with AI assistants via halo-mcp-server (MCP protocol). Covers installation, authentication, post management, and known PAT limitations.
category: software-development
---

# Halo MCP Server

Integrate [Halo 2.x](https://github.com/halo-dev/halo) blogs with AI assistants via the [halo-mcp-server](https://pypi.org/project/halo-mcp-server/) MCP server.

## Installation

```bash
# Create venv and install
python3 -m venv ~/halo-mcp-env
source ~/halo-mcp-env/bin/activate
pip install halo-mcp-server

# Create config directory
mkdir -p ~/halo-mcp-server
```

## Configuration

Create `~/halo-mcp-server/.env`:

```env
HALO_BASE_URL=https://your-blog.example.com
HALO_TOKEN=pat_your_personal_access_token
MCP_SERVER_NAME=halo-mcp-server
MCP_LOG_LEVEL=INFO
```

### Getting a Personal Access Token (PAT)

1. Visit `https://your-blog.example.com/console`
2. Log in as admin → Personal Access Tokens → Create
3. Copy the full token (it starts with `pat_`)

### Alternative: Password Authentication

If PAT is insufficient for some operations, configure username/password in `.env`:

```env
HALO_USERNAME=admin
HALO_PASSWORD=your_password
```

## MCP Server Tools

The server provides these tools (auto-discovered on initialize):

| Tool | Description |
|:----|:----|
| `list_my_posts` | List posts by current user |
| `get_post` | Get post details |
| `create_post` | Create a new post |
| `update_post` | Update post metadata |
| `publish_post` | Publish a draft |
| `unpublish_post` | Unpublish a published post |
| `delete_post` | Move to recycle bin (UC API) |
| `get_post_draft` | Get draft content/snapshot |
| `update_post_draft` | Update post content |
| `list_categories` / `create_category` | Category management |
| `list_tags` / `create_tag` | Tag management |
| `upload_attachment` / `upload_attachment_from_url` | File management |

## Starting the Server

```bash
cd ~/halo-mcp-server
source ~/halo-mcp-env/bin/activate
python3 -m halo_mcp_server
```

The server listens on **stdio** (MCP stdio transport). Connect via subprocess.

> **Important:** Always run from the `.env` directory so pydantic-settings picks up the config. If you pass env vars from the shell, the terminal may redact secret values — rely on the `.env` file instead.

## Known PAT Limitations

**Personal Access Tokens (PATs) in Halo 2.x have significant limitations.**

### What PAT CAN do:

| Operation | API | Works? |
|:----------|:----|:------:|
| List all posts | Console API | ✅ |
| Create draft post | Console API | ✅ |
| Get content/UC API | UC API | ✅ |
| Recycle (soft-delete) | UC API | ⚠️ (returns 200, doesn't mark deleted) |
| **Hard delete** | Content API | ✅ |

### What PAT CANNOT do properly:

| Operation | Issue | Workaround |
|:----------|:------|:-----------|
| **Publish (make public)** | Post has no owner → never enters PUBLISHED phase | Set owner + content-json annotation |
| **Update/Delete** via Console API | Returns 500 (null owner) | Use Content API directly |
| **Delete via MCP `delete_post`** | MCP uses UC API → returns "success" but not deleted | Use Content API DELETE |

## The Three Halo API Layers

| Layer | Endpoint Prefix | Used For | PAT Works? |
|:------|:----------------|:---------|:----------:|
| **Console API** | `/apis/api.console.halo.run/v1alpha1/` | Listing, creating, dashboard stats | ✅ List/Create ❌ Update/Delete |
| **UC API** (User Center) | `/apis/uc.api.content.halo.run/v1alpha1/` | Per-user operations, recycle | ✅ Get/Recycle ❌ Update |
| **Content API** (Core REST) | `/apis/content.halo.run/v1alpha1/` | Direct CRUD on resources | ✅ All operations |

## Single Page Management

Single pages use the same snapshot system as posts. List via `GET /apis/api.console.halo.run/v1alpha1/singlepages`, update via PUT with `{page, content}` structure, and publish via `PUT .../singlepages/{name}/publish?async=false`.

## Debugging Common Issues

### Cloudflare 403 blocking Halo API calls

Add `User-Agent: Mozilla/5.0 (compatible)` header to all requests. Without it, Cloudflare blocks curl/python scripts with error 1010.

### 409 Conflict on Content API PUT (version mismatch)

**Cause:** Post's internal revision counter changed between GET and PUT. Including the read-only `status` field in the PUT payload also triggers this.

**Fix:**
```python
# Re-fetch the latest state
post = GET /apis/content.halo.run/v1alpha1/posts/{name}
# Apply changes
post["spec"]["headSnapshot"] = new_snapshot_id
# CRITICAL: remove status field before PUT
post.pop("status", None)
# Retry
PUT /apis/content.halo.run/v1alpha1/posts/{name}
```

### Post created but 404/500 on public URL

Checklist (in order):
1. Does `post.spec.owner` have a value?
2. Does `content.halo.run/content-json` annotation exist?
3. Are `releaseSnapshot`/`headSnapshot`/`baseSnapshot` all set to valid snapshot UUIDs?
4. Does `spec.contributors` exist and include the owner? (Emptiness → HTTP 500)
5. Are archive labels set (`archive-year`, `archive-month`, `archive-day`)?
6. Has the Console API publish endpoint been called after Content API changes?

### Reading Existing Post Content (Extracting Article Body)

Content lives in the **Snapshot**, not the post itself:
```python
# Step 1: Find post by slug
GET /apis/api.console.halo.run/v1alpha1/posts?page=1&size=50
→ match items[].post.spec.slug
# Step 2: Get snapshot UUID
GET /apis/content.halo.run/v1alpha1/posts/{name}
→ post.spec.headSnapshot
# Step 3: Read the actual content
GET /apis/content.halo.run/v1alpha1/snapshots/{headSnapshot}
→ snapshot.spec.rawPatch = full HTML content
```
The Console API listing's `content.raw` may be truncated for PAT-created posts. Always fall back to direct snapshot access.

### Updating an Existing Post (Content Replacement)

Different from creating a new post. **Must update ALL of these:**

| Field | Why |
|:------|:----|
| `baseSnapshot` | Must point to new snapshot (not just head/release) |
| `headSnapshot` | Current working snapshot |
| `releaseSnapshot` | Published snapshot for public rendering |
| `spec.contributors` | Must be `["owner_username"]` or post returns 500 |
| `content.halo.run/content-json` annotation | Must contain updated escaped HTML |
| `content.halo.run/last-released-snapshot` | Must match releaseSnapshot |

**Complete workflow:**
```python
# Step 1: Create new snapshot
POST /apis/content.halo.run/v1alpha1/snapshots
{spec: {contentPatch, rawPatch, rawType:"HTML", owner, contributors:[owner], subjectRef: {group, kind:"Post", name, version}}}

# Step 2: Get current post state (re-fetch to avoid stale version)
post = GET /apis/content.halo.run/v1alpha1/posts/{name}

# Step 3: Update ALL snapshot links + metadata
post["spec"]["baseSnapshot"] = new_snapshot    # ← CRITICAL
post["spec"]["headSnapshot"] = new_snapshot
post["spec"]["releaseSnapshot"] = new_snapshot
post["spec"]["contributors"] = [owner]          # ← CRITICAL: prevents 500
post["spec"]["publish"] = True

# Update content-json annotation
post["metadata"]["annotations"]["content.halo.run/content-json"] = json.dumps({
    "raw": html, "content": html, "rawType": "HTML"
})
post["metadata"]["annotations"]["content.halo.run/last-released-snapshot"] = new_snapshot

# CRITICAL: remove status field to avoid 409 conflict
post.pop("status", None)

PUT /apis/content.halo.run/v1alpha1/posts/{name}

# Step 4: Trigger publish workflow to populate status/phase
PUT /apis/api.console.halo.run/v1alpha1/posts/{name}/publish?async=false
```

**Pitfall — empty status/phase after Content API update:**
After Content API PUT, `status.phase` and `status.inProgress` may be `None` → public page returns HTTP 500. **Always call the Console API publish endpoint** after Content API changes to kick Halo's state machine.

**Pitfall — stale Cloudflare cache:** Even after successful publish, CF may serve cached 500. Clear CF cache or wait 5 min.

### Editor crashes / white screen

The post's `content-json` annotation is `"true"` (telling Halo "content is HTML") but the snapshot actually contains Markdown. The ProseMirror editor can't parse it and never loads. Fix: delete the broken post + its ghost snapshots via Content API, then recreate with proper HTML snapshot.

### Browser console double-escape pitfall

When building HTML in browser JS console, escaped quotes (`\"`) in JS strings become literal `\"` in stored data. Use single quotes for JS strings or build HTML externally with Python's `json.dumps`.

### Console API POST requires extra fields

Halo 2.25+ requires `deleted: false`, `pinned: false`, `priority: 0` in the spec when creating drafts via Console API. Missing these triggers 400 validation errors.

## References

See `references/halo-api-endpoints.md` for complete endpoint reference.
See `references/mcp-protocol-pattern.md` for MCP interaction patterns.
See `references/env-var-redaction.md` for terminal token redaction workaround.
See `references/api-referral-content-strategy.md` for writing API relay tutorial articles.
See `references/browser-api-access.md` for browser JS console API access when Cloudflare blocks curl.
