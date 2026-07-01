# TelegramMonitor API Reference

Deployed at telegram.wf1.one, backed by container `telegram-monitor` on the VPS.

## API Base

`http://127.0.0.1:5005` (internal container port, mapped via 1Panel OpenResty)

## Auth

```
POST /api/auth/login
{"username": "admin", "password": "tgmonitor2024"}
```
Returns `Set-Cookie: telegrammonitor_admin=...` — send this cookie in subsequent requests.

## Keywords

### List
`GET /api/keywords`

### Create
`POST /api/keywords`
```json
{
  "id": 0,
  "accountId": null,
  "ruleName": "名称",
  "keywordValue": "词1|词2|词3",
  "matchMode": "Regex|Contains|Exact|Fuzzy",
  "isMatchUser": false,
  "userValue": null,
  "keywordAction": "Monitor|Exclude",
  "isCaseSensitive": false,
  "isEnabled": true,
  "priority": 10,
  "remark": "备注"
}
```

### Update / Delete
- `PUT /api/keywords` — same body as POST with `id` set
- `DELETE /api/keywords/{id}`

### Match Modes
- **Regex**: OR match — any pattern in the `|`-separated list triggers
- **Contains**: substring match
- **Exact**: exact match (wraps value in `^...$`)
- **Fuzzy**: AND match — ALL `?`-separated tokens must be present

## Bot

### Status
`GET /api/bot/status` — returns botCount, connectedCount, botUsernames

### Config
Stored in container's `/app/appsettings.json` under `Bot.Tokens`. Must restart container after editing.

### Targets (Notification Recipients)
`GET /api/bot/targets` — list all
`POST /api/bot/targets` — add target
```json
{"chatIdentifier": "8288196655", "remark": "备注"}
```
`DELETE /api/bot/targets/{id}`
`PUT /api/bot/targets/{id}/toggle?enabled=true`

## Messages

`GET /api/messages?page=1&pageSize=200`

Response:
```json
{
  "data": {
    "total": 1520,
    "items": [
      {
        "id": 1520,
        "chatTitle": "群名",
        "chatId": 123456,
        "chatType": "Group|Private|Channel",
        "text": "消息内容",
        "senderId": 123,
        "senderTitle": "发送者",
        "messageDate": "2026-06-27T18:53:20"
      }
    ]
  }
}
```

## Account (Monitored Telegram Account)

`GET /api/accounts` — list monitored accounts

The account is configured via the app's web UI at telegram.wf1.one, using QR code login with a Telegram user session.
