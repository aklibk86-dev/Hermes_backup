# Feishu / Lark Platform Setup

Configuring Hermes Agent to connect with Feishu (飞书) / Lark bot.

## Prerequisites

- A Feishu app created at [open.feishu.cn](https://open.feishu.cn/) with WebSocket enabled
- App ID and App Secret from the Feishu Open Platform

## Setup Steps

### 1. Enable the Plugin

```bash
hermes plugins enable feishu-platform
```

### 2. Set Credentials

```bash
hermes config set FEISHU_APP_ID "cli_xxxxx"
hermes config set FEISHU_APP_SECRET "secret_xxxxx"
hermes config set FEISHU_DOMAIN feishu    # 'feishu' (China) or 'lark' (International)
```

Also set in config.yaml:
```yaml
platforms:
  feishu:
    enabled: true
```

### 3. Restart Gateway

```bash
hermes gateway run --replace
```

### 4. Authorize Users

Two approaches:

**A. Set allowed users in config (preferred):**
```bash
hermes config set FEISHU_ALLOWED_USERS "user_id1,user_id2"
```
⚠️ **CRITICAL**: Feishu authorization uses `user_id` format (e.g., `5d59g4a1`), NOT `open_id` format (e.g., `ou_1671478684d...`). Check the gateway error log if auth fails — the log shows the user ID format the platform expects.

**B. Pairing flow (interactive):**
The user sends a message to the bot on Feishu. A pending pairing file is created at `/opt/data/platforms/pairing/feishu-pending.json`. Approve via `hermes pairing approve <code>`.

### 5. Restore Lark CLI Config (optional)

The `lark-cli` config files live at `~/.lark-cli/hermes/` and contain:
```json
// config.json
{
  "apps": [{
    "appId": "cli_aabc5fb2af38dccd",
    "appSecret": { "source": "keychain", "id": "appsecret:..." },
    "brand": "feishu",
    "users": [{
      "userOpenId": "ou_1671478684d215bae21a91fbdfd29157",
      "userName": "吴艳彬"
    }]
  }]
}
```

Other files: `cache/remote_meta.meta.json`, `update-state.json`

Also restore `feishu_seen_message_ids.json` at the root `~/.hermes/` level.

### 6. Restore Channel Directory

The `channel_directory.json` at `~/.hermes/` maps Feishu chat IDs. After the gateway connects, channels auto-register here. Restoring from backup can pre-populate known channels.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Gateway shows "connected" but user message gets no response | User not authorized → log says `Unauthorized user` | Set `FEISHU_ALLOWED_USERS` with the correct `user_id` |
| "Pairing file exists but is not readable" | Root-owned pairing files (uid 0) | `sudo chown hermes:hermes /opt/data/platforms/pairing/feishu-*.json` or delete them |
| Bot connected but channel_directory stays empty | No message received from user yet | Ask user to send any message to the bot on Feishu |
| "cannot attach stdin to a TTY-enabled container" | Docker compose command used `-it` flag over non-TTY SSH | Drop `-it` from docker compose commands |
| env vars not picked up | `hermes config set` writes to config.yaml but plugin reads from env | Gateway restart required after config changes |

## Verification

Check gateway state:
```bash
cat /opt/data/gateway_state.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('platforms',{}).get('feishu',{}).get('state'))"
```
Expected: `connected`

Check channels:
```bash
cat /opt/data/channel_directory.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('platforms',{}).get('feishu',[])))"
```
Expected: `> 0` after user has sent at least one message.
