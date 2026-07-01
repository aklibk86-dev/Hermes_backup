# Lark Wiki Workflow — Session Notes

## Initial Setup (One-Time)

This VPS has a Hermes agent container (`1Panel-hermes-agent-UZQ9`) that has lark-cli installed and authenticated.

### Verify lark-cli is available

```bash
# From the VPS, check inside the container
docker exec 1Panel-hermes-agent-UZQ9 bash -c \
  "export HOME=/opt/data/home; export PATH=/opt/data/home/.npm-global/bin:\$PATH; lark-cli --version"
# Expected: lark-cli version 1.0.57
```

### Verify authentication

```bash
docker exec 1Panel-hermes-agent-UZQ9 bash -c \
  "export HOME=/opt/data/home; export PATH=/opt/data/home/.npm-global/bin:\$PATH; lark-cli auth whoami"
```

### Check existing config

The lark-cli config file is at: `/opt/data/home/.lark-cli/hermes/config.json`

```json
{
  "apps": [{
    "appId": "cli_aabc5fb2af38dccd",
    "brand": "feishu",
    "users": [{
      "userOpenId": "ou_1671478684d215bae21a91fbdfd29157",
      "userName": "吴艳彬"
    }]
  }]
}
```

## VPS Connection Details

- Host: 149.104.8.237
- SSH Port: 37926
- User: root
- Password: ecwoVMLX4252
- Container: 1Panel-hermes-agent-UZQ9
- lark-cli path: /opt/data/home/.npm-global/bin/lark-cli (symlink)

## Wiki Space Info

### 飞鼠知识库 (飞书知识库)

- Space name: 飞鼠知识库
- Space ID: 7654947950363217077
- Space type: team (public)
- Home page URL: https://rcn4xp25thz3.feishu.cn/wiki/TPVwwZlD6iTPjxk70qgc8oAanvf
- Home page obj_token: PeOAdHfg5oq7KCxJUVic7RqDnDd
- Home page node_token: TPVwwZlD6iTPjxk70qgc8oAanvf
- Home page title: 首页
- Creator open_id: ou_1671478684d215bae21a91fbdfd29157

### Bot Permission Status

**The bot app (`cli_aabc5fb2af38dccd`) is NOT a member of this wiki space.** This means:
- `wiki +space-list --as bot` returns 0 spaces
- `wiki +move --as bot` fails with `permission denied: no destination parent node permission`
- `docs +create --as bot --parent-token` fails with `3380002/Permission denied`
- `wiki +member-add --member-type appid` fails with `permission denied: wiki space permission denied` (chicken-and-egg)

### User Auth — Successful Wiki Access (2026-06-30)

The user authorized wiki scopes via OAuth device flow:

```bash
# Step 1: Get verification URL (non-blocking)
lark-cli auth login --recommend --no-wait --json
# Returns device_code + verification_url

# Step 2: Generate QR code
lark-cli auth qrcode "<verification_url>" --output /tmp/feishu_auth_qr.png

# Step 3: User scans QR code with Feishu app, authorizes

# Step 4: Complete authorization
lark-cli auth login --device-code "<device_code>"
# Output: 授权成功! 用户: 吴艳彬 (ou_1671478684d215bae21a91fbdfd29157)
# Scopes granted include: wiki:node:move, wiki:node:create, wiki:node:read, wiki:node:retrieve,
#   wiki:space:read, wiki:space:retrieve, wiki:space:write_only, wiki:member:create, etc.
```

After auth, `--as user` can perform wiki operations that `--as bot` cannot:

```bash
# Create doc directly in wiki (SUCCESS with --as user)
(echo '<title>Title</title>' && cat content.md) | \
  lark-cli docs +create --api-version v2 --parent-token TPVwwZlD6iTPjxk70qgc8oAanvf \
    --as user --doc-format markdown --content -
# Returns: document_id, url
```

## Known Parent Node Tokens

| Title | Node Token |
|-------|-----------|
| 飞鼠知识库 (首页/root) | TPVwwZlD6iTPjxk70qgc8oAanvf |
| 运维文档 (root) | M6VIwuMnXiPOVzkXvt6ceSvZnZf |

## Known Document Tokens

| Title | obj_token | URL |
|-------|-----------|-----|
| Komari API 文档 | P5RPdkcEIomOuRxp3g1c6unyndb | https://rcn4xp25thz3.feishu.cn/wiki/UaDSwIwo3iG1zSkze62cPKbBnLK |
| Komari Agent 开发文档 | VtXYdAHRgo2kdSxm7zQcA8pen4e | https://rcn4xp25thz3.feishu.cn/wiki/JLAFwwJNhiHnM2knB5GcOoUWnVf |
| VPS 服务清单与配置 | Q3oOdXeeKopIKJxlEU4cBDD5nAf | https://rcn4xp25thz3.feishu.cn/wiki/GkUiw1uk4isMk6keuutc7wQbnkd |

## Weekly Summary Workflow (2026-06-30)

This session created a weekly work summary document using this process:

1. **Write content to temp file** → `write_file` on Hermes agent host
2. **Create Feishu doc in wiki directly** → using `--as user --parent-token`:
   ```bash
   (echo '<title>工作周报（2026-06-24 ~ 2026-06-30）</title>' && cat /tmp/weekly-summary.md) | \
     lark-cli docs +create --api-version v2 --parent-token TPVwwZlD6iTPjxk70qgc8oAanvf \
       --as user --doc-format markdown --content -
   ```
3. **Deliver URL to user** — doc is already in the wiki, no move needed
4. **Set up cron job** for weekly auto-generation:
   - Schedule: Monday 9:00 UTC (`0 9 * * 1`)
   - Uses session_search to gather past week's work
   - Creates doc with `--as user --parent-token <WIKI_NODE_TOKEN>`
   - User must have completed `auth login --recommend` at least once before cron runs

### Template: Weekly Summary Structure

```
1. **基础架构 & 服务器管理** — new VPS, DNS changes, server migrations
2. **Docker 服务部署与维护** — new deployments, fixes, config changes
3. **SEO & 内容优化** — search engine submissions, content updates
4. **关键词监控规则优化** — new monitor/exclude rules, tuning
5. **内存管理** — diagnostics, fixes, service removals
6. **其他** — skills created, reports generated, misc tasks
```

### Cron Job Design for Weekly Summary

```yaml
name: "每周工作总结 → 飞鼠知识库"
schedule: "0 9 * * 1"  # Monday 9:00 UTC
prompt: |
  生成上周工作总结报告（六大板块），创建飞书文档放入知识库。
  使用 --as user --parent-token TPVwwZlD6iTPjxk70qgc8oAanvf 创建文档。
```

## Error Recovery

### "not configured" error

```
{"ok": false, "error": {"type": "config", "subtype": "not_configured", "message": "not configured"}}
```

**Fix**: Run `lark-cli config init --new` to generate an authentication URL. Open the URL in a browser and complete the OAuth flow. This was already done in a previous session for this environment.

### "@file cannot read file"

```
error: "--content: cannot read file \"file.md\": open /opt/hermes/file.md: no such file or directory"
```

**Fix**: The `@file` path must be relative to the container's working directory. Either:
1. Copy the file to the cwd: `docker cp /tmp/file.md 1Panel-hermes-agent-UZQ9:/opt/hermes/` then use `@file.md`
2. Use stdin pipe: `--content -` and pipe content through `channel.send()`
3. Change to the file's directory first: `cd /tmp && lark-cli ... --content @file.md`

### JSON parsing error on response

When a command returns valid JSON embedded inside other text (like "Creating wiki node..." prefix), strip the non-JSON prefix or use `grep -o '{.*}'` before parsing.

### `--title` flag deprecated (v2 API)

```
error: "legacy v1 flag(s) --title are no longer supported"
```

**Fix**: Don't use `--title`. Embed title in content as `<title>My Title</title>` as the first line.

### Wiki: "no destination parent node permission"

```
"permission denied: no destination parent node permission"
```

**Fix**: This means the caller (bot) is not a wiki member. Switch to `--as user` — use the OAuth device flow to authorize the user with wiki scopes, then retry.

### Wiki: "space_id is not int"

```
"param err: space_id is not int"
```

**Fix**: The `--target-space-id` must be the numeric ID (e.g., `7654947950363217077`), not the alphanumeric node token from the URL. Resolve it by running `wiki +node-get --node-token "<full-wiki-url>"`.

### Wiki: "Parent node not found"

```
"Parent node not found. Verify parent_token refers to an existing node..."
```

**Fix**: The `--parent-token` node exists but the caller doesn't have access. Use `--as user` instead of `--as bot`. If it still fails, the user may not have authorized the wiki scopes.
