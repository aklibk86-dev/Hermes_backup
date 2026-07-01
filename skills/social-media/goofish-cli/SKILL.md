---
name: goofish-cli
category: social-media
description: Xianyu (闲鱼/Goofish) automation CLI with MCP support — item CRUD, message IM, search, WebSocket push. MCP-ready for AI Agent integration.
triggers:
  - "闲鱼"
  - "xianyu"
  - "goofish"
  - "咸鱼 CLI"
  - "xianyu automation"
  - "闲鱼自动化"
  - "闲鱼商品管理"
  - "goofish-cli"
  - "闲鱼文案"
  - "咸鱼文案"
  - "闲鱼卖"
  - "咸鱼卖"
  - "转卖token"
  - "API中转"
  - "闲鱼合规"
  - "闲鱼禁售"
---

# goofish-cli — 闲鱼 CLI · MCP-ready

Python CLI tool that wraps Xianyu (Goofish) core operations into structured commands. Outputs JSON/YAML/table/md/csv — built for both human terminal use and AI Agent MCP integration.

## Installation

```bash
# Via pip
pip install goofish-cli

# Via uv (recommended for speed)
uv pip install goofish-cli

# Binary location (Hermes venv default)
/opt/hermes/.venv/bin/goofish

# Add to PATH (if not found after install)
sudo ln -sf /opt/hermes/.venv/bin/goofish /usr/local/bin/goofish
# Or add alias to ~/.bashrc:
echo 'alias goofish="/opt/hermes/.venv/bin/goofish"' >> ~/.bashrc
```

## Authentication

goofish-cli uses browser cookies (not OAuth). Import your Xianyu login session:

```bash
# Auto-detect from local browser (Chrome/Edge/Brave/Safari/Firefox)
goofish auth login

# Or import from exported cookies JSON
goofish auth login ~/Downloads/goofish-cookies.json

# Check login status
goofish auth status
# → {"unb":"2214350705775","tracknick":"xy...","nick":"...","valid":true}
```

### Getting Cookies from Browser

1. Open Chrome → Login to `goofish.com` (闲鱼网页版)
2. F12 DevTools → Application → Cookies → `goofish.com`
3. Export cookies JSON (or use `browser-cookie3` auto-detect which works on same-machine browsers)

## Available Commands

### `auth` — Login State Management

| Command | Description |
|---------|-------------|
| `login` | Import login state (auto-detect from browser or from file) |
| `status` | Check if login is valid (returns unb, tracknick, nick) |
| `reset-guard` | Manually reset rate-limit fuse state |

### `item` — Product Management

| Command | Description |
|---------|-------------|
| `get <item_id>` | Query item details (read-only) — returns structured data |
| `view <item_id>` | Browser-view item details (more fields than `get`, anti-WAF) |
| `publish` | Publish item (auto-detect category + default address). Price in CNY. |
| `delete <item_id>` | Delete/remove item (write op, rate-limited) |

### `message` — IM (Internal Messaging)

| Command | Description |
|---------|-------------|
| `list-chats` | Fetch chat list (left sidebar): session.sync baseline + optional WS delta |
| `history <cid>` | Fetch message history for a conversation (scrolls to end) |
| `send <cid> <toid> --text "..."` | Send text/image message. `--image` takes url+wh |
| `watch` | Persistent WebSocket connection. Events output as JSONL to stdout. |

### `search` — Search

| Command | Description |
|---------|-------------|
| `items <query>` | Search Xianyu items (browser path, anti-WAF) |

### Other

| Command | Description |
|---------|-------------|
| `category auto-detect` | Auto-detect product category |
| `location default` | Query default shipping address |
| `media` | Image upload |
| `version` | Print version |

## Rate Limiting & Risk Controls

- **Token bucket rate limiter**: 1 write operation per minute
- **RGV587 auto-fuse**: Built-in mechanism that detects and auto-melts on rate-limit signals
- `reset-guard` command to manually clear the fuse state

## MCP Integration

goofish-cli ships an MCP server binary (`goofish-mcp`) that registers all CLI commands as MCP tools:

```bash
# Run as MCP server (stdio transport)
goofish-mcp
```

### MCP Config for Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "goofish": {
      "command": "/opt/hermes/.venv/bin/goofish-mcp",
      "args": []
    }
  }
}
```

## Output Formats

All commands support `--format` flag:

```bash
goofish item get 12345 --format json    # default for LLM consumption
goofish item get 12345 --format table   # human-readable
goofish item get 12345 --format yaml
goofish item get 12345 --format md
goofish item get 12345 --format csv
```

## WebSocket Real-time IM

`goofish message watch` maintains a persistent WS connection. Events are classified:

- `event=message` — received a message
- `event=read` — read receipt
- `event=new_msg` — lightweight notification

Each event line is JSON — pipe to jq or log file:

```bash
goofish message watch | tee -a xianyu-messages.log
```

## Listing Compliance & Copywriting Strategy

闲鱼 strictly restricts virtual/digital goods listings. API tokens, keys, relay services, and充值 are flagged and removed on keyword detection. Use these strategies to stay compliant:

### Keywords to Avoid in Title & Body
- API, Token, Key, 中转, 中转站, 充值, 余额, 额度, 套餐, 包月, 按量
- Use vague alternatives: "小东西", "自己搭的", "懂的都懂", "私聊发教程"

### Category Selection
- DO: Select "闲置数码" (Used Electronics) category
- DO NOT: Select "虚拟商品" or "充值" categories — triggers immediate review

### Listing Copy Principles
1. Title: vague + curiosity-driven, not descriptive of what it actually is
2. Body: mention the benefit (香港直连/速度快) without naming the product type
3. Price: never put pricing/tiers in the listing. Use a ¥10 placeholder link and explain in DMs
4. Images: server ping/speedtest screenshots only — no model lists, no pricing tables
5. Communication: move all details (model list, pricing, usage instructions) to private chat

### Sample Listing for API Relay Service
Title: 出个自己搭的小东西 懂的来

Body: 自己搞了个香港服务器 国内直连速度还不错. 买来用的 现在多了用不完 转给需要的人. 支持主流的那些模型 懂的都懂. gpt claude deepseek gemini那些都有. 和官方的一样 改个地址就能用. 随便并发 流式输出都支持. 直接拍10元链接 可以先用着. 怎么用私聊发教程

### Pricing Reference
- Official USD/1M tokens: GPT-4o ~$6.25 avg, Claude Sonnet ~$9 avg, DeepSeek ~$0.35, Gemini Flash ~$0.25
- 闲鱼 market: typically 1/10 to 1/15 of official price
- Recommended: "通用额度" model — ¥10 per 1M universal units, set model multipliers in New-API
- Multiplier example: GPT-4o=1x, Claude Sonnet=1.5x, GPT-4o-mini=0.1x, DeepSeek=0.1x, Gemini Flash=0.1x

### Enforcement Notes
- Taken down? Rephrase + republish with different wording, never same title
- Private chat is also scanned — avoid sensitive words there too
- Repeat violations can lead to account restriction

## Pitfalls

1. **Cookie dependency**: Requires Xianyu browser session. Cookies expire; re-run `auth login` when `status` returns `valid: false`.
2. **Rate limits**: Write ops (publish, delete, send) throttled to 1/min. Exceeding triggers RGV587 fuse — use `reset-guard` to clear.
3. **Environment-specific**: Only tested with real Xianyu accounts. Anti-bot measures may differ by region/account history.
4. **No headless mode for auth**: Must login via real browser first (cannot automate the login step).
5. **Output format note**: `--format json` wraps single object results; arrays for lists. Pipe to `jq` for extraction.

## References

- GitHub: https://github.com/fancyboi999/goofish-cli
- PyPI: https://pypi.org/project/goofish-cli/
- License: Apache-2.0

## 闲鱼商品上架文案

闲鱼对虚拟/数字商品审核严格。参考 `references/listing-copy-compliance.md` 获取:

- 闲鱼平台规则要点与安全上架策略
- 标题/正文/图片的规避写法
- API中转/Tokens 的闲鱼行情定价参考
- 推荐定价方案（通用额度模式 vs 按模型定价）
- 官方价格查询方法（litellm 数据源）
- 可直接使用的闲鱼文案示例
