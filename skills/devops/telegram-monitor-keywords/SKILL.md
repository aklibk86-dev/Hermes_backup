---
name: telegram-monitor-keywords
description: "Use when managing TelegramMonitor keyword rules (monitor/exclude) on VPS, or setting up daily analysis cron. Covers API interactions via SSH + Paramiko."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [telegram, monitoring, keywords, vps, cron]
    related_skills: [1panel-docker-deploy]
---

# TelegramMonitor Keyword Management

## Overview

TelegramMonitor runs in a Docker container (`telegram-monitor`) on the VPS at 149.104.8.237. It monitors a Telegram account (8619133439191 @htpnv) for keyword-matched messages and sends notifications via bot @aklibkbot.

## Access

SSH via paramiko to root@149.104.8.237:37926. API at `http://127.0.0.1:5005`.
- Login: admin / tgmonitor2024
- Bot token: 8325012304:***
- Target chat: 8288196655
- Cookie jar: /tmp/tc

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/auth/login | Get cookie (username/password) |
| GET | /api/keywords | List all rules |
| POST | /api/keywords | Add rule (use `keywordValue` in body) |
| PUT | /api/keywords/{id} | Update rule (405 - NOT SUPPORTED, use DELETE + POST instead) |
| DELETE | /api/keywords/{id} | Delete rule (200 - works) |
| GET | /api/bot/status | Check bot connection |
| POST | /api/bot/targets | Add notification target |
| GET | /api/messages?page=1&pageSize=N | Get captured messages |

### ⚠️ API Field Name Mismatch

The API uses **different field names in POST request vs GET response**:

| What you write (POST body) | What you get back (GET response) |
|---------------------------|-----------------------------------|
| `keywordValue` | `keywordPattern` |
| `keywordAction` | `keywordAction` (same) |
| `isEnabled` | `isEnabled` (same) |
| `isMatchUser` | `isMatchUser` (same) |
| `ruleName` | `ruleName` (same) |
| `matchMode` | `matchMode` (same) |

**Critical**: Never copy a GET response field as-is into a POST request body. The `keywordPattern` field from GET must be renamed to `keywordValue` for POST.

### ⚠️ PUT is NOT supported

`PUT /api/keywords/{id}` returns **405 Method Not Allowed**. To modify a rule:
- **DELETE** the old rule, then **POST** a new one with updated fields
- Or create a new rule with the correct settings and leave the old one disabled

### Internal API Access (Bypassing Cloudflare)

The API is behind Cloudflare which blocks direct API calls. Access it internally:

```bash
# Login via OpenResty (port 80 internal)
curl -s -c /tmp/tg_cookies.txt \
  -H "Host: telegram.wf1.one" \
  -H "Content-Type: application/json" \
  -X POST "http://172.17.0.1/api/auth/login" \
  -d '{"username":"admin","password":"tgmonitor2024"}'

# Use cookie for subsequent calls
COOKIE= # extract from /tmp/tg_cookies.txt
curl -s -b "telegrammonitor_admin=$COOKIE" \
  -H "Host: telegram.wf1.one" \
  "http://172.17.0.1/api/keywords"
```

Or use Python with cookie jar (see scripts/cleanup-rules.py for working example).

## Keyword Rule Payload

```python
{
    "id": 0,               # 0=new, existing id=update
    "accountId": None,     # None=global, or account id
    "ruleName": "name",
    "keywordValue": "pattern",   # text or regex
    "matchMode": "Regex",        # "Regex"|"Contains"|"Exact"|"Fuzzy"
    "isMatchUser": False,
    "userValue": None,
    "keywordAction": "Monitor",  # "Monitor"|"Exclude"
    "isCaseSensitive": False,
    "isEnabled": True,
    "priority": 20,              # higher = higher priority
    "remark": "备注"
}
```

## Rule Strategy

### Core Principle: Customer Intent vs Supplier Noise

The single most important lesson from real-world tuning: **single keywords catch noise, intent patterns catch customers**.

| Catching | Pattern type | Example | Outcome |
|----------|-------------|---------|---------|
| Suppliers/Ads | Product+price | "机场","VPN","API","U" | Catches ads, price lists, spam |
| Customers | Intent+need | "坏了","求推荐","想买","连不上" | Catches real requests |

### Monitor Rule Count: Less Is More

After 3 rounds of tuning, the final lesson is: **keep the absolute minimum number of monitor rules that match your business**. Rules that match adjacent topics (airport/VPN/carding/crypto) generate constant noise even with good exclusion layers.

Rule of thumb:
- **Your business monitors** (e.g. 中转API_求购, AI_买key) → Keep enabled
- **Competitor/cousin-industry monitors** (e.g. 机场, 代付, 发卡) → DELETE. The signal-to-noise ratio is too low to be worth it.
- **Universal monitors** (e.g. 协议_求推荐 which catches any mention of any protocol name) → DELETE. These are too broad and match noise from bot auto-replies, product announcements, and casual tech talk.

Checklist before adding a new monitor rule:
1. Does this rule match people who want YOUR specific product/service?
2. Can you write a regex that excludes 90%+ of noise? If not, the rule will generate too many false positives.
3. Is the total monitor rule count staying under 5? If you have 10+ monitor rules, the user will complain about notification overload.

**Iterative approach (learned from 3 rounds of refinement):**

1. **Round 1 — Broad keywords (FAIL)**: Single words like "机场","节点","VPN","代付". Result: 200 hits/day, 0 real customers. Catches airport channels, porn groups, gambling ads.
2. **Round 2 — Question patterns (BETTER)**: "谁会","有没有","求". Better but still catches suppliers who use these words.
3. **Round 3 — Intent-only + Ad-exclude (WINNING)**: Two-layer filter:
   - **Exclude layer** (priority 30): Ad patterns (价格表, 套餐, U/天, Gbps, 欢迎咨询, 联系购买, DDoS, 诚招代理)
   - **Monitor layer** (priority 20): Only demand-side patterns (坏了, 连不上, 求推荐, 想买, 收key, 需要代付)

### Priority System

- **Exclude rules**: priority 30 — evaluated first, messages matching any exclude rule are silently dropped
- **Monitor rules**: priority 20 — only messages that pass all exclude rules are checked against monitor patterns
- Higher number = evaluated first

### Rule Writing Guidelines

1. **Never use standalone single words** — "机场" catches airport chat groups, "节点" catches tech talk, "VPN" catches casino ads
2. **Always combine intent + product** — "求推荐+机场" not "机场" alone
3. **Exclude supplier language** — Price tables, packages, contact-info patterns are always ads
4. **Specificity wins** — "梯子用不了" is worth more than 10 vague terms
5. **Test against real data** — Run `curl -s -b /tmp/tc http://127.0.0.1:5005/api/messages?page=1&pageSize=20` to see what's being caught

### Known Noise Patterns (Auto-Exclude)

These should always be included in exclusion rules:
- **Porn/adult**: 小妹妹合集, 高中初中合集, 色情, av, porn, 裸聊, 约炮, 主播资源
- **Gambling**: 投注平台, 高端嫩模, PG电子, 赏金女王, 捕鱼, 真人百家, 存款彩金, 免实名, 免绑卡, 包出款, 博彩, 赌, 六合, 跑分
- **Bot auto-replies (YueBot, nmBot, LookOn, etc.)**: 先看下是哪种情况, 用密码获取的订阅节点, 输入密码即可获取, 悦通官网, 客户端推荐.*YueLink, 面板/购买/订阅都从官网进入, 原版Clash已停更, Clash Meta.*Stash.*Shadowrocket, 你的理解有误, 你这描述.*更像是, 先直接给你一套小火箭的有效排查, 连接方式切一下, 小火箭里把旧订阅删掉, 小火箭的有效排查, lookon是一个专注清除广告的机器人, LookOn支持两种模式
- **Relay/forwarding station ads**: 老转发收新人, 🎁.*专线, 🎁.*入口, 🎁.*转发, 🎁.*AWS, 专线.*/T, 穿透.*/T, 入口.*稳定机.*/T, /T$ (traffic pricing pattern), 转发.*自带.*IX, 无面板接入办法
- **Financial/crypto spam**: 抄底, 多空双吃, 提前布局多空, 市场恐慌, 区块链, 合约跟单, 量化交易
- **Supplier-side offers**: 接各种二道款, 我这边承兑, 出U, 老板.*需要u么 (U-exchange sellers, not customers)
- **Relay station pricing ads**: 老转发收新人, 🎁.*专线, 🎁.*/T (newer price format with 🎁 emoji + /T suffix replacing old U/天 format)
- **Bot auto-replies (per-bot)**: 悦通官网, 面板/购买/订阅都从官网进入, 原版 Clash 已停更, 你这描述.*更像是, 先直接给你一套小火箭的有效排查, lookon是一个专注清除广告的机器人 — add new patterns as new bot sources appear. Each bot has unique templates; key is to identify the signature phrase unique to that bot's auto-reply (not generic networking terms).
- **Scam/shady**: 灰产, 暗网, 假钞, 接码, 网赚, 日赚
- **Movie/resource sharing**: 短剧, 电影, 影视, 阿里云盘
- **Ad language**: 价格表, 套餐, 起售, 欢迎咨询, 联系购买, U/天, Gbps, 无视通报, 高防
- **Supplier self-intro**: 老玩家, 从业多年, 诚招代理, 一手货源

## Exclusion Rules History

New exclusion rules added in the 2026-06-28 tuning session (IDs 63-67):

| ID | Rule | Purpose | Pattern Highlights |
|----|------|---------|-------------------|
| 63 | 排除_不良内容 | Block child exploitation & adult content | `小妹妹合集\\|高中初中合集\\|色情\\|主播资源` |
| ~64~ | ~~排除_机器人自动回复~~ | ~~Deleted 2026-07-01 — was created with `keywordAction: "Monitor"` instead of `"Exclude"`, causing the opposite of intended behavior~~ |
| 65 | 排除_金融广告 | Block crypto/finance spam | `抄底\\|多空双吃\\|提前布局多空\\|合约跟单` |
| 66 | 排除_供应侧代付 | Block supplier-side U exchange offers | `接各种二道款\\|我这边承兑\\|出U\\|出u` |
| 69 | 排除_中转转发广告 | Block relay/forwarding station supplier ads | `老转发收新人\\|🎁.*专线\\|专线.*/T\\|穿透.*/T\\|入口.*稳定机.*/T\\|/T$\\|转发.*自带.*IX\\|无面板接入办法` |

These were added because the 协议_求推荐(53) and 代付_求人做(47) monitor rules were catching noise from...
- **暗网AI搜索** group (@GHClone3Bot / @sooo) — repeated abusive/gambling/spam content
- **Yue.to** (@yuetoo_bot) — bot auto-reply templates containing protocol names (2026-06-29: ID 64 expanded with 悦通官网 patterns)
- **nyanpass / 高性能中转面板** — relay station supplier ads with 🎁/T pricing (2026-06-29: new ID 69)
- **橘子复读机群** (@nmnmfunbot) — subscription link ads
- **halocloud/东南亚暗网** — crypto/finance spam ("抄底", "多空双吃")
- **柬埔寨西港聊天群** — supplier-side U exchange offers

New rules use intent-first exclusion patterns, consistent with the "customer intent vs supplier noise" strategy.

## Daily Cron Job

Script: `/opt/tg_daily.py` on VPS
Schedule: `0 9 * * *` (daily 9:00 UTC = 17:00 Beijing)
Function: Fetches 24h messages, sends report via bot, identifies noise groups
Log: `/var/log/tg_daily.log`

## Bot Token Configuration

The bot token lives in the container's `appsettings.json`. It is NOT accessible via the web API — you must edit the config file and restart.

### Procedure

1. **Read current config** on the VPS host, modify `Bot.Tokens` and `Bot.Enabled`, then write it back:

```python
import paramiko, json, base64

ssh = paramiko.SSHClient()
ssh.connect(host, port, username, password)

# Read from container
stdin, stdout, stderr = ssh.exec_command("docker exec telegram-monitor cat /app/appsettings.json")
config = json.loads(stdout.read().decode())

# Set bot token and enable
bot_id = "1234567890"         # numeric bot ID
bot_secret = "ABCdef123..."   # secret from BotFather
config['Bot']['Enabled'] = True
config['Bot']['Tokens'] = [f"{bot_id}:{bot_secret}"]

# Write via base64 to avoid shell escaping
encoded = base64.b64encode(json.dumps(config, indent=2).encode()).decode()
ssh.exec_command(f"echo '{encoded}' | base64 -d > /tmp/bt.json && docker cp /tmp/bt.json telegram-monitor:/app/appsettings.json")

# Restart
ssh.exec_command("docker restart telegram-monitor")
time.sleep(5)
```

2. **Verify** via the bot status API:
```bash
curl -s -b /tmp/tc http://127.0.0.1:5005/api/bot/status
# Expected: {"enabled":true,"botCount":1,"connectedCount":1,"botUsernames":["@yourbot"]}
```

### ⚠️ Token Masking Pitfall

When writing the token in code, ALWAYS build from parts:
```python
# ✅ CORRECT
bot_token = "8325012304:" + "AAGZLRFiPM1PcMLVzN2YYDRkr6DRoQNXPi8"

# ❌ WRONG — writes literal asterisks to the config file
bot_token = "8325012304:***"   # file has: "8325012304:***" (invalid!)
```

The `***` in conversation output is a display mask — never use it in executable code.

### Known Config

| Setting | Value |
|---------|-------|
| Admin UI | https://telegram.wf1.one |
| Username | admin |
| Password | tgmonitor2024 |
| Bot token | 8325012304:*** |
| Bot username | @aklibkbot |
| Notification target | 8288196655 (private chat @MTBTQ) |

## Match Mode Behavior

| Mode | Behavior | Example input | Example match |
|------|----------|---------------|---------------|
| `Contains` | Substring match | `"机场"` | Matches any message containing "机场" |
| `Exact` | Full string match | `"求机场"` | Only matches "求机场" alone |
| `Regex` | Regex match (OR by default) | `"坏了\|连不上"` | Matches if **ANY** pattern is found |
| `Fuzzy` | **ALL keywords must match** (AND) | `"机场?修复?节点"` | Message must contain ALL of: 机场 AND 修复 AND 节点 |

⚠️ **Fuzzy mode is often NOT what you want.** The `?` separator creates an AND condition (`^(?=.*A)(?=.*B)(?=.*C).*$`), meaning the message must contain EVERY keyword. To match ANY keyword, use `Regex` mode with `|` separator instead.

## User Preferences

This user has expressed clear preferences for TelegramMonitor management:

- **DO NOT send daily reports or unsolicited notifications.** The cron-based daily report was disabled after the user said "不要给我发这个". If monitoring insights are needed, provide them on request only, not on a schedule.
- **Focus on customer intent, not keyword density.** Rule tuning should prioritize question patterns (坏了/求/想买/连不上) over product mentions (机场/节点/VPN), which produce too many false positives from ads and noise groups.
- **Iterate in conversation, not via cron.** Present rule changes and ask for feedback before deploying. Do not auto-generate exclusion rules.

## Useful Commands

```bash
# Check bot status
curl -s -b /tmp/tc http://127.0.0.1:5005/api/bot/status

# List all rules
curl -s -b /tmp/tc http://127.0.0.1:5005/api/keywords

# Run daily report manually (only if user asks)
python3 /opt/tg_daily.py

# View container logs
docker logs telegram-monitor --tail 30

# Restart after config change
docker restart telegram-monitor

# Login (re-auth after restart)
curl -s -c /tmp/tc -X POST http://127.0.0.1:5005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"tgmonitor2024"}'
```

## Verifying Exclusion Patterns Before Deploying

Before submitting a new exclusion rule, verify which patterns in the regex actually match the offending message:

```python
import re

# The offending message
test_msg = "your message content here"

# The exclusion pattern you plan to submit
pattern = "(老转发收新人|🎁.*/T|/T$)"

# Find which sub-patterns match
matches = [p for p in pattern.split("|") 
           if re.search(p.strip(), test_msg, re.IGNORECASE)]
print(f"Matched patterns: {matches}")
```

This helps confirm the new rule will catch the intended messages and avoids submitting rules that don't actually match. Run this locally (in execute_code or terminal) before sending the API call.

## Reference Files

| `references/2026-06-28-exclusion-rules-deployment.md` | Real-world deployment record of 5 exclusion rules (IDs 63-67) targeting 赌博广告/不良内容/机器人回复/金融广告/供应侧代付. Consult this for concrete exclusion pattern examples and known noise groups. |
| `references/2026-06-29-exclusion-rules-deployment.md` | Exclusion rules added on 2026-06-29: relay/forwarding station ads (ID 69: 🎁-prefixed /T pricing), Yue.to bot auto-reply patterns (ID 64 update). Shows the iterative exclusion pattern for newly observed ad formats. |
| `references/2026-06-29-relay-bot-exclusion-rules.md` | Follow-up deployment of relay station ad exclusion (ID 69) and Yue.to bot auto-reply patterns (updated ID 64). Covers 🎁/T pricing format and per-bot template exclusion. |
- `references/2026-06-29-relay-ads-and-bot-excludes.md` — Session update: ID 45 expanded (30 new API relay keywords), ID 69 created (relay station ads), ID 64 expanded (Yue.to bot patterns). Full deployment record with rule payloads.
- `references/2026-06-29-lookon-yuebot-excludes.md` — Follow-up: ID 64 expanded again with YueBot troubleshooting templates (Shadowrocket debug guides) and LookOn bot intro patterns. Documents the iterative pattern: each new bot template requires a new exclusion sub-pattern added to the same umbrella rule.

## Pitfalls

1. **Bot token must be written correctly** — build from parts, never use `***` in source code.
2. **Fuzzy mode is AND, not OR** — `?` separator creates all-must-match regex. Use `Regex` mode with `|` for OR.
3. **Messages API shape**: response data is nested: `msgs.get("data", {}).get("items", [])`.
4. **POST field name != GET field name**: The POST `/api/keywords` endpoint expects `keywordValue`, but the GET response returns the field as `keywordPattern`. Copying the GET field name into your POST payload results in `"关键词内容不能为空"` (keyword content cannot be empty). Always use `keywordValue` in POST/PUT payloads.
5. **Cron container may lack cron binary** — install with `apt-get install -y cron && systemctl enable --now cron`.
6. **Script on VPS runs python3, container does NOT have python3** — config edits must copy files in.
7. **Time zones matter** — cron runs in UTC (0 9 * * * = 09:00 UTC = 17:00 Beijing).
8. **Daily report includes historical data** — after changing rules, the report shows messages captured BEFORE the change. New rules only affect future messages.
9. **Old data doesn't get re-filtered** — messages already in the DB stay in the DB. Only new messages go through new rules.
10. **DO NOT setup unsolicited cron notifications** without explicit user approval — the user will complain.
11. **Shell quoting in curl** — use single quotes for JSON payloads to avoid shell expansion of variables like `$cookie`.
12. **Exclude rules are additive, not subtractive** — you cannot exclude a specific group/sender via the API. You must add content-based patterns to filter noisy sources. Multiple exclude rules for the same noisy source are expected (e.g. 暗网AI搜索 needs separate rules for child exploitation content and gambling ads).

13. **"面板" in protocol rules (ID 53) catches official bot announcements** — The keyword "面板" in `协议_求推荐` (ID 53) matches any message containing "高性能中转面板", "面板/购买/订阅", "面板售卖" etc. This causes false positives from:
    - Official relay station channels posting their URL/welcome messages
    - Bot auto-replies that mention their panel (e.g. "panel/购买/订阅都从官网进入")
    - Group admin messages about their service panel
    **Fix**: Expand the `排除_机器人自动回复` (ID 64) exclude rule to cover these specific announcement patterns. The group/sender info ("from: ... @nyanpass_fw") is NOT checked by the keyword rules — only message content is matched.

14. **`/T` pricing pattern is NOT caught by existing exclude rules** — Relay station ads often use `专线 340/T` (price per TB traffic) instead of `U/天` or `月付` formats. The existing `排除_广告价格套餐` (ID 48) and `排除_广告推销` (ID 49) patterns do NOT cover `/T` pricing. Always add `/T$` as a separate exclude pattern when tuning for relay station noise.

15. **Always verify `keywordAction` after creating an exclude rule** — The POST `/api/keywords` endpoint accepts `keywordAction` in the body. If you set `"keywordAction": "Exclude"` but make a typo or the field is ignored, the rule defaults to `"Monitor"` action, causing the EXACT OPPOSITE of intended behavior (it will monitor FOR those patterns instead of excluding them). Always verify by GET after creation:
    ```python
    # CORRECT verification flow:
    resp = opener.open(req, timeout=10)
    created = json.loads(resp.read())
    assert created.get("keywordAction") == "Exclude", f"Rule created with wrong action: {created.get('keywordAction')}"
    ```
    The misconfigured rule 64 (intended as Exclude, created as Monitor) was the cause of a major noise problem — it was monitoring FOR bot auto-reply templates instead of filtering them out.

16. **POST create returns 500 even when successful** — The `/api/keywords` POST endpoint may return HTTP 500 error even though the rule was created successfully. Always verify with GET after a POST, even on error responses. If the rule count increased by 1, the POST succeeded.
