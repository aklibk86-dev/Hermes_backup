# TelegramMonitor: Keyword + Bot Setup via REST API

## Overview

Self-hosted TelegramMonitor (ghcr.io/riniba/telegrammonitor:latest) runs as a Docker container behind OpenResty. Configuration is done via its REST API (ASP.NET Core / Kestrel on port 5005). This reference covers: finding credentials, authenticating to the API, adding keyword rules, and setting up bot notifications.

## Finding Credentials

The admin password is stored in a container environment variable, NOT in appsettings.json:

```bash
docker exec telegram-monitor printenv | grep PASSWORD
# Auth__AdminPassword=tgmonitor2024
```

Default login username is `admin`. The password in appsettings.json is `__CHANGE_ME__` and is overridden by the env var.

## Authentication

The API uses a cookie-based auth. Login via POST:

```bash
curl -s -c /tmp/cookie.txt -X POST http://127.0.0.1:5005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"THE_PASSWORD"}'
```

Use `-b /tmp/cookie.txt` on subsequent calls.

## Keyword Rules API

### List all keywords

```bash
curl -s -b /tmp/cookie.txt http://127.0.0.1:5005/api/keywords
```

Response: `{"statusCode":200,"data":[...],"succeeded":true}`

### Add a keyword rule (POST /api/keywords)

Required payload fields (from JavaScript `buildPayload()` function in keywords.html):

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | 0 for new rules |
| `accountId` | int\|null | null for global rules, account ID for per-account |
| `ruleName` | string | Human-readable name |
| `keywordValue` | string | The keyword pattern |
| `matchMode` | string | `Exact`, `Contains`, `Regex`, or `Fuzzy` |
| `isMatchUser` | bool | Whether to filter by specific users |
| `userValue` | string\|null | Comma-separated usernames/IDs when `isMatchUser=true` |
| `keywordAction` | string | `Monitor` or `Exclude` |
| `isCaseSensitive` | bool | Case sensitivity |
| `isEnabled` | bool | Whether rule is active |
| `priority` | int | Priority order |
| `remark` | string\|null | Optional note |

Example — Regex rule with OR matching (any keyword triggers):

```bash
curl -s -b /tmp/cookie.txt -X POST http://127.0.0.1:5005/api/keywords \
  -H 'Content-Type: application/json' \
  -d '{
    "id": 0,
    "accountId": null,
    "ruleName": "机场节点修复",
    "keywordValue": "机场修复|节点修复|机场推荐|节点掉|机场挂",
    "matchMode": "Regex",
    "isMatchUser": false,
    "userValue": null,
    "keywordAction": "Monitor",
    "isCaseSensitive": false,
    "isEnabled": true,
    "priority": 10,
    "remark": "机场-节点修复类"
  }'
```

**Important**: The `Fuzzy` mode generates `^(?=.*A)(?=.*B)...$` which is AND (ALL keywords must match). For OR matching (any keyword triggers), use `Regex` mode with pipe `|` separators.

### Update a rule (PUT /api/keywords)

Same payload as POST but with `id` set to the existing rule's ID.

### Delete a rule (DELETE /api/keywords/{id})

```bash
curl -s -b /tmp/cookie.txt -X DELETE http://127.0.0.1:5005/api/keywords/1
```

## Accounts API

### List accounts

```bash
curl -s -b /tmp/cookie.txt http://127.0.0.1:5005/api/accounts
```

Response contains phone, userId, username, connection status, monitoring state.

## Bot Notification Setup

### Check bot status

```bash
curl -s -b /tmp/cookie.txt http://127.0.0.1:5005/api/bot/status
```

Response includes `enabled`, `botCount`, `connectedCount`, `botUsernames`.

### Configure bot token (edit appsettings.json)

The bot token is NOT set via API — it goes in `/app/appsettings.json` on the container:

```json
{
  "Bot": {
    "Enabled": true,
    "Tokens": ["YOUR_BOT_TOKEN"]
  }
}
```

Update via:

```bash
# Read current config
docker exec telegram-monitor cat /app/appsettings.json > /tmp/bot_config.json
# Edit locally, then
docker cp /tmp/bot_config.json telegram-monitor:/app/appsettings.json
docker restart telegram-monitor
```

Verify bot connected:
```bash
curl -s -b /tmp/cookie.txt http://127.0.0.1:5005/api/bot/status
# Should show: botCount=1, connectedCount=1, botUsernames=["@botname"]
```

### Add notification target (POST /api/bot/targets)

```bash
curl -s -b /tmp/cookie.txt -X POST http://127.0.0.1:5005/api/bot/targets \
  -H 'Content-Type: application/json' \
  -d '{"chatIdentifier":"8288196655","remark":"通知备注"}'
```

`chatIdentifier` accepts either numeric chat ID or @username.

### List targets

```bash
curl -s -b /tmp/cookie.txt http://127.0.0.1:5005/api/bot/targets
```

### Delete target (DELETE /api/bot/targets/{id})

### Toggle target (PUT /api/bot/targets/{id}/toggle?enabled=true|false)

## Practical Keyword Patterns for Business Monitoring

### VPN/Node/Airport business monitoring

```json
{"ruleName":"梯子VPN翻墙","keywordValue":"梯子|VPN|翻墙|科学上网|Clash|V2Ray|Trojan|Hysteria","matchMode":"Regex","keywordAction":"Monitor"}
{"ruleName":"机场节点修复","keywordValue":"机场修复|节点修复|节点维护|节点掉|机场挂|流媒体解锁|Netflix解锁","matchMode":"Regex","keywordAction":"Monitor"}
{"ruleName":"机场买卖","keywordValue":"买机场|卖机场|收机场|出机场|IPLC|IEPL|中转机场","matchMode":"Regex","keywordAction":"Monitor"}
```

### AI API Relay monitoring

```json
{"ruleName":"AI中转API","keywordValue":"中转API|API中转|New-API|中转站|AI中转|中转key|API余额|API代理","matchMode":"Regex","keywordAction":"Monitor"}
{"ruleName":"大模型买卖","keywordValue":"大模型|OpenAI|Claude|GPT|deepseek|卖API|卖key|GPT4|AI代充","matchMode":"Regex","keywordAction":"Monitor"}
```

### Payment proxy monitoring

```json
{"ruleName":"代付代充","keywordValue":"代付|代购|代充|代支付|代收|代挂","matchMode":"Regex","keywordAction":"Monitor"}
{"ruleName":"USDT虚拟币","keywordValue":"USDT|U兑换|U出|U入|买U|卖U|U商|加密货币","matchMode":"Regex","keywordAction":"Monitor"}
{"ruleName":"换汇汇率","keywordValue":"换汇|汇率|汇兑|货币兑换|外汇|换钱","matchMode":"Regex","keywordAction":"Monitor"}
```

## Full Automation Pattern (execute_code + paramiko)

```python
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("host", port=port, username="root", password="pass", timeout=10)

# Step 1: Login
stdin, stdout, stderr = ssh.exec_command("""
  COOKIE=$(mktemp)
  curl -s -c "$COOKIE" -X POST http://127.0.0.1:5005/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"tgmonitor2024"}'
  echo "$COOKIE"
""")
cookie_path = stdout.read().decode().strip().split('\n')[-1]

# Step 2: Add keyword
ssh.exec_command(f"""
  curl -s -b {cookie_path} -X POST http://127.0.0.1:5005/api/keywords \
    -H 'Content-Type: application/json' \
    -d '{json.dumps(keyword_payload)}'
""")

# Step 3: Update bot config
ssh.exec_command("docker exec telegram-monitor cat /app/appsettings.json > /tmp/bot.json")
# ... modify bot.json ...
ssh.exec_command("docker cp /tmp/bot.json telegram-monitor:/app/appsettings.json")
ssh.exec_command("docker restart telegram-monitor")
```

## Pitfalls

- **Fuzzy mode uses AND logic**: `^(?=.*A)(?=.*B)...$` requires ALL keywords. Use Regex with `|` for OR.
- **Bot token in appsettings.json**: NOT configurable via API. Must edit file + restart container.
- **Container has no python3**: Can't run Python scripts inside it. Use `sh` or `cat` for file operations.
- **API returns 500 on empty keywordValue**: Error "关键词内容不能为空" means the JSON field name is `keywordValue`, not `keyword` or `content`.
- **BotCount stays 0 after adding token**: Check if the token string is correct (not masked/wrong). The app reads tokens from `Bot.Tokens[]` at startup.
- **Restart required for config changes**: appsettings.json is read once at startup.
- **No Swagger/OpenAPI**: `InjectSpecificationDocument: false` — must discover API endpoints from HTML/JS.
