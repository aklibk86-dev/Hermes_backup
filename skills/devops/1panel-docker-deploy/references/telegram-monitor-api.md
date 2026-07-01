# TelegramMonitor Admin API Reference

## Overview

[TelegramMonitor](https://github.com/Riniba/TelegramMonitor) is an ASP.NET Core (Furion) web app that monitors Telegram accounts via the MTProto protocol. It provides a REST admin API and web frontend for managing accounts, keywords, and bot notifications.

This reference covers API-based keyword rule management — useful when you need to bulk-configure monitoring rules without clicking through the web UI.

## Access

- Internal port: `127.0.0.1:5005`
- External domain (if configured): `https://telegram.wf1.one/`
- Auth: Cookie-based. Login once, pass cookie to subsequent requests.

## API Workflow

### 1. Login

```bash
curl -s -c /tmp/tg_cookie.txt -b /tmp/tg_cookie.txt \
  -X POST http://127.0.0.1:5005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"tgmonitor2024"}'
```

Response sets a `telegrammonitor_admin` cookie. Pass `-b /tmp/tg_cookie.txt` to all subsequent requests.

### 2. List All Keywords

```bash
curl -s -b /tmp/tg_cookie.txt http://127.0.0.1:5005/api/keywords
```

Response: `{"statusCode":200,"data":[...],"succeeded":true}`

### 3. Add a Keyword Rule (POST)

```bash
curl -s -b /tmp/tg_cookie.txt \
  -X POST http://127.0.0.1:5005/api/keywords \
  -H 'Content-Type: application/json' \
  -d '{
    "id": 0,
    "accountId": null,
    "ruleName": "Rule Name",
    "keywordValue": "keyword1|keyword2|keyword3",
    "matchMode": "Regex",
    "isMatchUser": false,
    "userValue": null,
    "keywordAction": "Monitor",
    "isCaseSensitive": false,
    "isEnabled": true,
    "priority": 10,
    "remark": "Optional description"
  }'
```

Field names extracted from the frontend's `buildPayload()` JS function.

### 4. Update a Rule (PUT)

Same body as POST but include the rule ID:

```bash
curl -s -b /tmp/tg_cookie.txt \
  -X PUT http://127.0.0.1:5005/api/keywords \
  -H 'Content-Type: application/json' \
  -d '{"id": 1, ...same fields...}'
```

### 5. Delete a Rule (DELETE)

```bash
curl -s -b /tmp/tg_cookie.txt \
  -X DELETE http://127.0.0.1:5005/api/keywords/{id}
```

### 6. List Accounts

```bash
curl -s -b /tmp/tg_cookie.txt http://127.0.0.1:5005/api/accounts
```

Returns connected Telegram accounts with phone, user ID, username, connection status.

## Keyword Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | 0 for new rules, existing ID for updates |
| `accountId` | int/null | Null for global rules, account ID for account-specific |
| `ruleName` | string | Human-readable rule name |
| `keywordValue` | string | The keyword text (format depends on matchMode, see below) |
| `matchMode` | string | One of: `Exact`, `Contains`, `Regex`, `Fuzzy` |
| `isMatchUser` | bool | If true, only match messages from specific users |
| `userValue` | string/null | Comma-separated user IDs/usernames (only if isMatchUser=true) |
| `keywordAction` | string | `Monitor` (log matched messages) or `Exclude` (skip matched) |
| `isCaseSensitive` | bool | Whether keyword matching is case-sensitive |
| `isEnabled` | bool | Whether the rule is active |
| `priority` | int | Rule priority (higher = evaluated first) |
| `remark` | string/null | Optional description |

## Match Mode Behaviors

### `Exact` (full string match)
- Server wraps the value in `^...$` regex anchors
- Message text must match the keyword exactly

### `Contains` (substring match) — DEFAULT
- Server applies `.*keyword.*` regex
- Message just needs to contain the keyword anywhere

### `Regex` (custom regex) — **RECOMMENDED FOR MULTI-KEYWORD**
- User provides a raw regex pattern
- For OR matching: `keyword1|keyword2|keyword3|...`
- This is the most powerful mode — any one of the alternatives triggers the rule
- Example: `机场修复|节点修复|机场推荐|节点维护|修复节点`

### `Fuzzy` (AND matching with `?` separator)
- **IMPORTANT**: Fuzzy mode generates `^(?=.*A)(?=.*B)(?=.*C).*$` — this is AND logic, meaning ALL keywords must be present in the message
- In the UI, keywords are separated by `?` (e.g., `机场?修复?节点` means: message must contain ALL of 机场 AND 修复 AND 节点)
- This is typically LESS useful for monitoring than Regex (OR) mode
- For most monitoring needs, prefer `Regx` with `|` separators instead

## Keyword Design Patterns

### Two-Layer Monitoring Strategy

Effective monitoring uses two layers with different priorities:

1. **Exclude rules (priority 30)** — filter out noise BEFORE matching. These run first due to higher priority.
2. **Monitor rules (priority 20)** — catch genuine demand signals.

The Exclude layer prevents ads, spam groups, and irrelevant chat rooms from triggering notifications, keeping the Monitor layer focused on real customer intent.

### Layer 1: Exclude Rules — Filter Noise

These rules use `keywordAction: "Exclude"` with `priority: 30` so they're evaluated before Monitor rules.

**Ad/price pattern exclusion** (message content level):
```
价格表|套餐|起售|欢迎咨询|联系购买|U/天|U/月|Gbps|DDoS|压力测试|无视报告|高防
```

**Supplier language exclusion**:
```
老玩家|从业多年|诚招代理|一手资源|源头|直营|自营
```

**Known noise group names** (group title level):
```
a片|色情|av|porn|三级|博彩|六合|跑分|灰产|假钞|出卡|暗网|网赚|刷单
```

**Exclude rules are `Contains` mode rules** that match against group names and message content. They never trigger notifications — they just suppress matches.

### Layer 2: Monitor Rules — Catch Demand

**Pattern: Question/Request phrases** (Regex mode):
```
谁会|谁能|有人会|有没有|求推荐|求个|哪个(机场|梯子|节点)好用|想买|想收|坏了|用不了|挂了|怎么修
```

**Pattern: Protocol/panel names** (Regex mode — standalone occurrence):
```
anytls|hysteria|v2ray|trojan|xray|xui|3x-ui|s-ui|singbox|v2board|xboard|reality|tuic
```

**For best results: combine question phrases with product names:**
```
(谁会|谁能|有人会)(搭建|配置|装|搞|弄)(anytls|hysteria|v2ray|xui|v2board)
(求|收|买|想买)(中转|API|key|中转站|节点|机场|梯子)
```

### Practical JSON Payloads

**Exclude rule example:**
```json
{
  "id": 0, "accountId": null,
  "ruleName": "排除_广告价格套餐",
  "keywordValue": "价格表|套餐|起售|欢迎咨询",
  "matchMode": "Regex",
  "isMatchUser": false, "userValue": null,
  "keywordAction": "Exclude",
  "isCaseSensitive": false, "isEnabled": true,
  "priority": 30,
  "remark": "屏蔽广告用语"
}
```

**Monitor rule example (intent-based):**
```json
{
  "id": 0, "accountId": null,
  "ruleName": "机场_求购推荐",
  "keywordValue": "(求推荐机场|哪个机场稳|想买个梯子|推荐个节点)",
  "matchMode": "Regex",
  "isMatchUser": false, "userValue": null,
  "keywordAction": "Monitor",
  "isCaseSensitive": false, "isEnabled": true,
  "priority": 20,
  "remark": "精准需求:机场求购"
}
```

### Key Design Principle

**Never use standalone short keywords** like just `机场`, `节点`, `VPN`, `代付` — they match too broadly and flood you with noise from airport channels, gambling groups, and general chat.

**Always require intent signals**: pair a need indicator (求/买/收/修/坏了) with a product term.

**Always add exclude rules** for known noise groups and ad language patterns before adding monitor rules. The two-layer design is what separates useful monitoring from spam.

When configuring from a paramiko SSH session:

```python
import paramiko, json

ssh = paramiko.SSHClient()
ssh.connect(host, port, username, password, timeout=10)

# 1. Login
stdin, stdout, stderr = ssh.exec_command("""curl -s -c /tmp/tg.cookie -b /tmp/tg.cookie \
  -X POST http://127.0.0.1:5005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ADMIN_PASSWORD"}' """)

cookie = "/tmp/tg.cookie"

# 2. Prepare keywords
rules = [
    ("Rule Name 1", "keyword1|keyword2|keyword3", "Regex", "remark 1"),
    ("Rule Name 2", "otherkeyword|other2", "Regex", "remark 2"),
]

# 3. Add each rule
for name, kw, mode, remark in rules:
    payload = json.dumps({
        "id": 0, "accountId": None,
        "ruleName": name, "keywordValue": kw,
        "matchMode": mode,
        "isMatchUser": False, "userValue": None,
        "keywordAction": "Monitor",
        "isCaseSensitive": False, "isEnabled": True,
        "priority": 10, "remark": remark
    })
    stdin, stdout, stderr = ssh.exec_command(
        f"curl -s -b {cookie} -X POST http://127.0.0.1:5005/api/keywords "
        f"-H 'Content-Type: application/json' -d '{payload}'"
    )
    print(stdout.read().decode())

ssh.close()
```

## Discovery Method

The API fields were discovered by:
1. Reading `/app/wwwroot/keywords.html` from inside the container
2. Finding the `buildPayload()` JavaScript function in the inline `<script>` tag
3. Extracting field names and their default values

This pattern works for any web app without swagger docs:
```bash
docker exec <container> cat /app/wwwroot/<page>.html | grep -A 30 'function buildPayload'
```

## See Also

- Account management: `/api/accounts` (GET)
- Bot notification status: `/api/bot/status` (GET)
- Bot targets: `/api/bot/targets` (GET)
- Messages: `/api/messages?page=1&pageSize=50` (GET)
