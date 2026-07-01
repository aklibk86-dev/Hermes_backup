---
name: feishu-lark
category: productivity
description: "飞书/Feishu/Lark integration via lark-cli (@larksuite/cli). Covers installation, OAuth auth flow, document import/upload/permissions, knowledge base (wiki) management, and troubleshooting. Consolidates feishu-automation, feishu-cli, feishu-drive-cli, feishu-knowledge-base, and lark-wiki."
tags:
  - feishu
  - lark
  - lark-cli
  - 飞书
  - larksuite
  - wiki
  - knowledge-base
triggers:
  - feishu
  - lark
  - 飞书
  - lark-cli
  - 飞书文档
  - "feishu doc"
  - 飞书知识库
  - "feishu drive"
  - 飞书上传
  - 飞书权限
  - 飞书CLI
  - 创建飞书文档
  - larksuite
  - 飞书文档导入
---

# Feishu / Lark — lark-cli Integration Guide

Unified guide for integrating with Feishu (Lark) via the official `@larksuite/cli` tool (`lark-cli`). Covers setup, auth, document operations, wiki management, and known pitfalls.

## 0. When to Create a Feishu Doc vs Reply Inline

### Rule of Thumb

| Deliver as Feishu doc | Reply inline |
|----------------------|-------------|
| Analysis / comparison / evaluation | Quick answers |
| Development plans & outlines | Status updates |
| API documentation | Configuration snippets |
| Multi-section guides (3+ sections) | Short lists (under 5 items) |
| Research reports | Confirmations / acknowledgements |
| Any content the user may want to bookmark or share | One-shot questions |

### User Preference (Current User)

This user has explicitly stated: **"以后像这种文件直接以飞鼠文档的形式发给我"** — all structured analysis/comparison/plan/documentation content should be delivered as a Feishu document link, not as chat text. Only quick answers, confirmations, and single-step responses should be inline.

### Workflow Reference

See `references/analysis-doc-workflow.md` for the complete step-by-step implementation (write_file → SSH → docker cp → lark-cli import → send URL).

## 1. Overview

`lark-cli` (npm package `@larksuite/cli`) is Feishu's official CLI tool for interacting with Feishu Drive, Documents, Wiki, and other services via the Open API. It runs as a Node.js CLI binary.

**Capabilities:**
- Import local files (docx, sheets, markdown) as Feishu cloud documents
- Upload files to Feishu Drive
- Manage document permissions (public sharing, collaborators)
- Create and populate wiki/knowledge-base nodes
- Read and update document content (via `docs +update`)

**Limitations:**
- Only supports reading/replying to existing documents via the built-in `feishu_doc_read` / `feishu_drive_add_comment` tools — not via lark-cli
- Cannot update document content inline (must overwrite or append)
- `@file` paths only accept **relative** paths from the current working directory

## 2. Installation

### Prerequisites
- Node.js v18+ (`node --version`)
- npm (comes with Node.js)

### Install globally

```bash
npm install -g @larksuite/cli
```

**If EACCES (permission denied):**
```bash
npm config set prefix "$HOME/.npm-global"
mkdir -p "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g @larksuite/cli
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
```

### Verify installation
```bash
lark-cli --version
```

## 3. Configuration

### Option A: Bind to Existing Hermes Feishu App (Recommended)

If Hermes already has a Feishu connection (FEISHU_APP_ID in `.env`):

```bash
lark-cli config bind --source hermes --identity user-default --force
```

- `--identity user-default` — impersonates the user (needed for personal drive/docs)
- `--identity bot-only` — safer, bot can only access bot resources
- `--force` — required when switching from bot-only to user-default identity

Then authenticate (see Section 4).

### Option B: Configure with App ID + App Secret Directly

```bash
echo "<APP_SECRET>" | lark-cli config init \
  --app-id <APP_ID> \
  --app-secret-stdin \
  --force-init
```

Skips the browser setup page. The user must have already granted `drive:drive` and `docx:document` permissions in Feishu Open Platform console and published the app version.

### Option C: Create a New Feishu App

```bash
# Remove stale config first
rm -rf ~/.lark-cli/hermes

# Initialize — creates app on Feishu's backend, prints a URL
lark-cli config init --new --force-init
```

This prints a URL like `https://open.feishu.cn/page/cli?user_code=XXXX-XXXX`. The user must open it in their browser and confirm/create the app. Then authenticate (Section 4).

### Config Locations

| What | Path |
|------|------|
| lark-cli workspace config | `~/.lark-cli/hermes/config.json` |
| Hermes Feishu gateway config | `~/.hermes/config.yaml` (feishu section) |
| Hermes Feishu app credentials | `~/.hermes/.env` (FEISHU_APP_ID, FEISHU_APP_SECRET) |

## 4. Authentication (OAuth Device Flow)

### Step 1: Get verification URL (non-blocking)

```bash
lark-cli auth login --no-wait --json
```

Returns JSON with `device_code`, `expires_in` (600s), and `verification_url`.

### Step 2: Generate QR code (mandatory)

```bash
lark-cli auth qrcode "<verification_url>" --output /tmp/feishu_auth_qr.png
```

### Step 3: Deliver URL + QR to user

Send both to the user. Tell them to open the URL or scan the QR code in their browser (NOT via Hermes browser tools — must be their own browser).

### Step 4: After user confirms

```bash
lark-cli auth login --device-code "<device_code>"
```

### Step 4B (alternative): Blocking flow

```bash
lark-cli auth login --recommend
```

Prints URL then blocks until user authorizes. For AI agents, run in background with `notify_on_complete=true` and generous timeout.

### Verify

```bash
lark-cli auth status
lark-cli auth whoami
```

### Critical Timing Rules

- **Do NOT** run `--no-wait --json` and `--device-code` in the same turn. Wait for the user to explicitly confirm authorization first.
- Each `--no-wait --json` call generates a **fresh** device_code. Previous one expires.
- Device code expires in 600 seconds (10 min).
- Do NOT cache verification_url or device_code across sessions — always run fresh.

## 5. Document Operations

### Create a New Feishu Document from Markdown (docs +create)

**Preferred method** for new documents — no file path needed, content piped via stdin.

```bash
# Markdown format: title MUST be <title>Title</title> as first line, body starts after
echo '<title>My Title</title>
# Body content starts here

## Section 1
Content...
' | lark-cli docs +create --api-version v2 --doc-format markdown --content -
```

**⚠️ CRITICAL: The `--title` flag is DEPRECATED in v2 API.** Passing it returns error: `legacy v1 flag(s) --title are no longer supported`. The title must be embedded in the content as `<title>Title</title>` (for Markdown) or `<title>Title</title>` (for XML).

**Parameters:**
| Flag | Required | Description |
|------|----------|-------------|
| `--api-version` | Yes | Always `v2` |
| `--doc-format` | No | `xml` (default) or `markdown` |
| `--content` | Yes | Content string or `-` for stdin |
| `--parent-token` | No | Parent folder/wiki node token |
| `--parent-position` | No | e.g. `my_library` for personal knowledge base |

**Create into a specific location (e.g., wiki knowledge base):**
```bash
(echo '<title>Title</title>' && cat content.md) | lark-cli docs +create --api-version v2 --doc-format markdown --parent-token <PARENT_NODE_TOKEN> --content -
```

**Response** returns JSON with `document_id`, `url`, and `revision_id`:
```json
{"ok":true,"data":{"document":{"document_id":"XXX","revision_id":1,"url":"https://xxx.feishu.cn/docx/XXX"}}}
```

**Make doc publicly readable after creation:**
```bash
lark-cli drive permission.public patch --token <DOC_TOKEN> --type docx --yes \
  --data '{"link_share_entity":"anyone_readable","external_access":true,"comment_entity":"anyone_can_view","security_entity":"anyone_can_view","share_entity":"only_full_access"}'
```

### Import a Local File as Feishu Cloud Document

```bash
# cd to the file's directory first (lark-cli requires relative paths)
cd /path/to/file/dir
lark-cli drive +import --file "./filename.docx" --type docx --name "Document Title" --format pretty
```

Supported types: `docx`, `sheet`, `bitable`, `slides`. Returns a `token` and `url`.

### Upload a File to Drive

```bash
cd /path/to/file/dir
lark-cli drive +upload --file "./file.pdf"
```

### Set Public Sharing (anyone with link can read)

```bash
lark-cli drive permission.public patch \
  --token "<doc_token>" \
  --type docx \
  --yes \
  --data '{"link_share_entity":"anyone_readable","external_access":true,"comment_entity":"anyone_can_view","security_entity":"anyone_can_view","share_entity":"only_full_access"}'
```

`link_share_entity` options:
- `tenant_readable` — org members with link can read
- `tenant_editable` — org members with link can edit
- `anyone_readable` — internet with link can read (requires `external_access=true`)
- `anyone_editable` — internet with link can edit (requires `external_access=true`)
- `closed` — disable link sharing

### Add a Collaborator

```bash
lark-cli drive permission.members create \
  --token "<doc_token>" \
  --type docx \
  --yes \
  --data '{"member_id":"<app_id>","member_type":"appid","perm":"full_access"}'
```

`member_type` options: `email`, `openid`, `unionid`, `openchat`, `opendepartmentid`, `userid`, `groupid`, `wikispaceid`, `appid`
`perm` options: `view`, `edit`, `full_access`

## 6. Knowledge Base / Wiki Management

### Identity: `--as user` vs `--as bot`

**🚨 CRITICAL RULE: Wiki operations REQUIRE `--as user`.** The bot identity cannot:
- List wiki spaces (`wiki +space-list --as bot` returns 0 spaces)
- Move documents into a wiki (`wiki +move --as bot` fails with `permission denied: no destination parent node permission`)
- Create documents directly in a wiki (`docs +create --as bot --parent-token` fails with `3380002/Permission denied`)
- Add itself as a wiki member (`wiki +member-add --as bot` returns `permission denied: wiki space permission denied`)

All wiki mutations MUST use `--as user`. This requires the user to have authorized the necessary wiki scopes via the OAuth device flow (see Section 4).

### Auth Scopes Needed for Wiki

When running `lark-cli auth login --recommend` (or `--no-wait --json`), ensure these wiki scopes are included:
- `wiki:node:move` — move documents into wiki
- `wiki:node:create` — create docs directly in wiki
- `wiki:node:read` — read wiki node info
- `wiki:node:retrieve` — retrieve wiki node details
- `wiki:space:read` — read wiki space info
- `wiki:space:retrieve` — list wiki spaces
- `wiki:space:write_only` — write to wiki space (needed for creating docs in wiki)
- `wiki:member:create` — add members to wiki (if needed)

Using `--recommend` selects the relevant scopes automatically. If wiki operations still fail after auth, run `lark-cli auth status` to check which scopes were granted.

### Prerequisites

- lark-cli configured and authenticated (Sections 3 & 4)
- The user (not bot) must be authenticated with wiki scopes (see above)
- Know the wiki Space ID (get it via URL discovery, see below)

### List Wiki Spaces

```bash
lark-cli wiki +space-list --format pretty
```

**⚠️ Bot identity limitation**: `--as bot` returns 0 spaces if the bot app isn't a member of any wiki space. To get the space list, use `--as user` (requires user auth with `wiki:space:retrieve` scope). If user auth isn't available, use the URL discovery method below.

### Discover Wiki Space ID from a URL

When the user shares a knowledge base URL (e.g., `https://xxx.feishu.cn/wiki/TPVwwZlD6iTPjxk70qgc8oAanvf`), resolve it into a numeric `space_id` using `wiki +node-get`:

```bash
lark-cli wiki +node-get --node-token "https://xxx.feishu.cn/wiki/TPVwwZlD6iTPjxk70qgc8oAanvf" --as bot --format json
```

The response includes:
- `space_id` — the numeric integer needed for `wiki +move --target-space-id`
- `obj_token` — the document token (for `--parent-token` in `docs +create`)
- `node_token` — the wiki node token
- `parent_node_token` — parent node (empty string = root node)
- `has_child` — whether the node has children

**Example response:**
```json
{
  "space_id": "7654947950363217077",
  "node_token": "TPVwwZlD6iTPjxk70qgc8oAanvf",
  "obj_token": "PeOAdHfg5oq7KCxJUVic7RqDnDd",
  "parent_node_token": "",
  "has_child": false,
  "node_type": "origin",
  "title": "首页"
}
```

### Move an Existing Document into a Wiki Knowledge Base

Use `wiki +move` to move a Drive document (docx) into a wiki space:

```bash
lark-cli wiki +move --obj-token <DOC_TOKEN> --obj-type docx --target-space-id <NUMERIC_SPACE_ID> --as bot --format json
```

**⚠️ Permission requirement**: The caller (bot or user) must already be a member of the target wiki space. Without membership, you get:
- `permission denied: no destination parent node permission` (move)
- `Permission denied: you do not have permission to create the document under the target wiki node` (create with --parent-token)

**⚠️ space_id must be numeric**: The `--target-space-id` must be the numeric integer ID (e.g., `7654947950363217077`), NOT the alphanumeric node token from the URL (e.g., `TPVwwZlD6iTPjxk70qgc8oAanvf`). Using the wrong format returns `param err: space_id is not int`.

### Create a Document Directly in a Wiki

```bash
echo '<title>Title</title>' | lark-cli docs +create --api-version v2 --doc-format markdown --parent-token <WIKI_NODE_TOKEN> --as user --content -
```

The `--parent-token` must be the wiki **`node_token`** — the alphanumeric token from the wiki URL (e.g., `TPVwwZlD6iTPjxk70qgc8oAanvf`). This is NOT the `obj_token` (the underlying document token). Using the `obj_token` returns `3380002: Parent node not found`.

**⚠️ CRITICAL: Use `--as user`.** The `--as bot` identity cannot create documents in a shared wiki (returns `Permission denied`). The user must have completed `auth login --recommend` with wiki scopes before this works.

**Complete working example:**
```bash
(echo '<title>工作周报</title>' && cat /tmp/weekly-summary.md) | \
npx @larksuite/cli docs +create --api-version v2 \
  --parent-token TPVwwZlD6iTPjxk70qgc8oAanvf \
  --as user --doc-format markdown --content -
```
This creates a new document inside the wiki node specified by `--parent-token`. The response includes the `url` and `document_id`.

If the caller lacks wiki member permissions, returns error `3380002: Parent node not found` (even though the node exists) or `3380004: Permission denied: you do not have permission to create the document under the target wiki node`.

### Add a Bot as a Wiki Member

```bash
lark-cli wiki +member-add --space-id <SPACE_ID> --member-type appid --member-id <APP_ID> --member-role admin --as bot
```

**⚠️ Prerequisite**: The caller must already have admin permission on the wiki space. If not, returns `permission denied: wiki space permission denied`. The user must manually add the bot via Feishu UI: 知识库 → 设置 → 成员管理 → 添加机器人.

### Fallback When Bot Lacks Wiki Access

If the bot can't be added to the wiki (UI limitation, no admin available):

1. Create the document externally (omit `--parent-token`): it lands in the bot's personal space
2. Set public permissions (anyone_readable)
3. Share the URL with the user
4. User manually moves it: open doc → ... → Move to → 知识库 → select target wiki

This is the workable workaround when bot identity can't write to a shared wiki space.

### Write Content to a Document (stdin pipe)

**Recommended method** — avoids file path issues and shell escaping problems:

```bash
lark-cli docs +update --api-version v2 \
  --doc <DOC_TOKEN> \
  --command overwrite \
  --doc-format markdown \
  --content -
```

The `-` tells lark-cli to read from stdin. Pipe content in:

```bash
echo "# My Document\n\nContent here..." | lark-cli docs +update ...
```

### Write Content via @file

The `@file` path must be **relative** to the container's working directory. Absolute paths fail with `unsafe file path`.

```bash
# Copy file to container first
docker cp /tmp/content.md container-name:/opt/hermes/
# Then use relative path
cd /opt/hermes && lark-cli docs +update ... --content @content.md
```

### Document Update Commands

| Action | Command |
|--------|---------|
| Overwrite content | `docs +update --command overwrite --doc-format markdown --content -` |
| Append content | `docs +update --command append --content "new content"` |
| Insert after block | `docs +update --command block_insert_after --block-id X --content -` |
| Read content | `docs +fetch --api-version v2 --doc TOKEN --doc-format markdown` |

### Running Inside Docker Container

When lark-cli lives inside a Docker container on a remote VPS (e.g., Hermes agent container):

```python
import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username='root', password=PASSWORD, timeout=15)

lark_env = 'export HOME=/opt/data/home; export PATH=$HOME/.npm-global/bin:$PATH'

# Create wiki node
stdin, stdout, stderr = ssh.exec_command(
    f'docker exec 1Panel-hermes-agent bash -c "{lark_env}; lark-cli wiki +node-create --space-id SPACE --title \\\\"Title\\\\" --obj-type docx"',
    timeout=15
)

# Write content via stdin pipe
transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command(
    f'docker exec -i 1Panel-hermes-agent bash -c "{lark_env}; lark-cli docs +update --api-version v2 --doc TOKEN --command overwrite --doc-format markdown --content -"'
)
channel.send(md_content.encode())
channel.shutdown_write()
time.sleep(2)
print(channel.recv(4096).decode())
```

### Import a File from Inside a Remote Docker Container

For `drive +import` (which needs a file path, not stdin), the file must exist on the VPS host first:

```python
# STEP 1: Write file content to VPS host via SSH stdin
stdin, stdout, stderr = ssh.exec_command("cat > /tmp/my-doc.md")
stdin.write(md_content.encode())
stdin.close()

# STEP 2: Copy from VPS host into the Docker container
stdin, stdout, stderr = ssh.exec_command(
    "docker cp /tmp/my-doc.md 1Panel-hermes-agent:/tmp/my-doc.md"
)

# STEP 3: Use lark-cli from inside the container with relative path
stdin, stdout, stderr = ssh.exec_command(
    f'docker exec 1Panel-hermes-agent bash -c "cd /tmp && {lark_env}; lark-cli drive +import --file ./my-doc.md --type docx --name \\"Doc Title\\" --format pretty"'
)
```

**⚠️ CRITICAL**: `write_file()` and the local terminal tool create files on the Hermes execution machine, NOT on the remote VPS. A `docker cp` that references a path like `/tmp/file.md` on the VPS will fail with `lstat: no such file or directory` unless you first pipe the content to the VPS host. Always use SSH stdin piping (STEP 1 above) before `docker cp`.

## 7. Reference Files

| File | Source | Contents |
|------|--------|----------|
| `references/error-patterns.md` | feishu-cli | Exact error messages and recovery recipes for lark-cli |
| `references/hermes-integration.md` | feishu-cli | Hermes-specific config paths and profile considerations |
| `references/analysis-doc-workflow.md` | feishu-lark | Step-by-step workflow for creating analysis documents as Feishu docs from markdown, including Python code for SSH → docker cp → lark-cli import |
| `references/lark-wiki-workflow.md` | lark-wiki | Full session transcript with VPS connection details and error recovery |

**Note about lark-cli skills**: The `npx -y skills add https://open.feishu.cn --skill -y` command installs 27 lark-* skills covering drive, doc, IM, calendar, sheets, etc. into `.agents/skills/`. These are separate from this skill and cover Feishu-specific tool capabilities.

## 7. Weekly Cron Job Pattern — Auto-Create Docs in Wiki

When a user wants weekly summaries auto-generated and placed in a knowledge base, use the following pattern:

### Cron Job Prompt Structure

```yaml
name: "每周工作总结 → 知识库"
schedule: "0 9 * * 1"   # Monday 9:00 UTC
prompt: |
  1. Use session_search to collect past week's work sessions
  2. Organize into the agreed structure (e.g., 6 sections: infrastructure, deployments, SEO, monitoring, memory, other)
  3. Save markdown to /tmp/weekly-summary.md
  4. Create Feishu document directly in the wiki:
     (echo '<title>Title</title>' && cat /tmp/weekly-summary.md) | \
     npx @larksuite/cli docs +create --api-version v2 \
       --parent-token <WIKI_NODE_TOKEN> --as user \
       --doc-format markdown --content -
  5. Deliver the document URL to the user
```

### Key Requirements

- **`--as user`** is mandatory — bot identity cannot write to shared wikis
- The user must have completed `auth login --recommend` at least once before the cron runs, so the token persists
- The `--parent-token` should be the wiki node's `obj_token` (from `wiki +node-get`), or the `node_token` from the wiki URL
- If the user hasn't authorized wiki scopes, the cron will fail with permission errors

## 8. Pitfalls (Consolidated)

1. **auth login with --recommend blocks forever** — Always use `--no-wait --json` to get the URL as non-blocking JSON, then `--device-code` after user confirms.
2. **Device code expires** — 600-second expiry. If the user takes too long, run `--no-wait --json` again for a fresh one.
3. **Verification URL is opaque** — Do NOT modify, URL-encode, or add punctuation to the URL string.
4. **QR code is mandatory** — The lark-cli auth flow requires generating and displaying a QR code.
5. **Relative paths only** — `--file` for import/upload requires a relative path. `cd` first.
6. **@file path restriction** — `--content @file.md` only accepts relative paths. Absolute paths fail with `unsafe file path`.
7. **Absolute paths not accepted** — `--file` never accepts absolute paths.
8. **Wrong token type** — `wiki +node-create` returns both `node_token` and `obj_token`. Use `obj_token` for `docs +update --doc`.
9. **Directory mismatch** — Docker `docker exec` default cwd is `/opt/hermes`, not `$HOME` (`/opt/data/home`). Always set both `HOME` and `PATH`.
10. **Old config blocks new init** — Always `rm -rf ~/.lark-cli/hermes` before re-initiating.
11. **Bash history expansion** — Do NOT use `!` in passwords when passing through bash — it interprets as history expansion.
12. **Node.js required** — lark-cli is a Node.js script. Container must have `node`.
13. **Multiple DevOps tools may conflict** — The Feishu app used by Hermes gateway may not have Open API scopes enabled. The app needs `drive:drive`, `docx:document`, and `docs:permission.member:create` scopes.
14. **lark-cli config vs Hermes config** — The lark-cli workspace is separate from Hermes config. Changes to one don't update the other — re-run `config bind` if Hermes credentials change.
15. **App must have permissions published** — In Feishu Open Platform, the app needs the relevant scopes added in "Permissions" → publish the app version.
16. **Identity choice** — Wiki knowledge base operations typically use `--as user`; bot identity doesn't support `my_library` personal knowledge base.
17. **Document titles** — `# Title` must be the only first-level heading in Markdown content, otherwise the doc displays as "Untitled".
18. **Stdin pipe cleanup** — After `channel.shutdown_write()`, wait at least 2 seconds before reading response.
21. **`--target-space-id` must be numeric** — The space ID from `wiki +node-get` is a string of digits (e.g., `"7654947950363217077"`). Using the wiki node token (e.g., `TPVwwZlD6iTPjxk70qgc8oAanvf`) instead gives `param err: space_id is not int`.
22. **Bot can't see or write to shared wikis** — `wiki +space-list --as bot` returns 0 spaces unless the bot app is explicitly added as a wiki member. Even with the space ID known, `wiki +move --as bot` fails with `permission denied: no destination parent node permission`.
23. **Wiki URL resolution** — Pass the full wiki URL (not just the token) to `wiki +node-get --node-token` so the CLI auto-infers the object type. Raw tokens without `--obj-type` fail.
24. **Wiki member-add requires existing admin** — Adding a bot (`--member-type appid`) to a wiki requires the caller to already be a wiki admin. Without admin, returns `permission denied: wiki space permission denied`. This is a chicken-and-egg problem: the user must add the bot via Feishu UI.
25. **`--as user` is required for all wiki operations** — bot identity cannot list, create, move, or write to shared wiki spaces. Always use `--as user` when the target is a knowledge base.
26. **Wiki space ID resolution** — The `wiki +node-get` command needs the FULL wiki URL (e.g., `https://xxx.feishu.cn/wiki/TPVwwZlD6iTPjxk70qgc8oAanvf`) passed to `--node-token`. A bare token without `--obj-type` will fail. The response returns both a numeric `space_id` (for `wiki +move`) and a node-level `obj_token` (for `docs +create --parent-token`).
27. **User "can't add bot" in wiki UI** — Some Feishu tenant configurations don't expose the "add bot/robot" option in knowledge base member management. Workaround: create docs outside the wiki using bot identity, share the link, ask the user to manually move them into the knowledge base via the Feishu web UI (doc → ... → Move to → Knowledge Base).
