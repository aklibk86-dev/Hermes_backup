---
name: telegram-monitor-management
description: Manage TelegramMonitor keyword rules via web UI and API — add, edit, delete Monitor/Exclude rules, understand match modes, troubleshoot API issues.
category: devops
triggers:
  - "telegrammonitor|TelegramMonitor|关键词监控|keyword monitor"
  - "telegram.wf1.one"
  - "add keyword rule|manage keyword rules|监控规则"
---

# TelegramMonitor Keyword Rule Management

## Overview

TelegramMonitor is a self-hosted Telegram group chat monitoring system. It listens to Telegram groups/channels and matches keywords, then notifies via Bot.

- **Web UI**: https://telegram.wf1.one
- **Default login**: admin / tgmonitor2024
- **Monitoring account**: 8619133439191 (@htpnv)
- **Internal API port**: 127.0.0.1:5005 (Docker container)

## Rule Types

| Action | Purpose |
|--------|---------|
| **Monitor** | Notify when keywords match |
| **Exclude** | Suppress notifications for matching messages (filter noise) |

## Match Modes — Critical Distinction ⚠️

THIS IS THE #1 SOURCE OF ERRORS. Read carefully.

| Mode | Separator | Logic | Example | Matches | Does NOT Match |
|------|-----------|-------|---------|---------|----------------|
| **正则匹配 (Regex)** | `\|` (pipe) | **OR** — any keyword triggers | `(机场修复\|搬瓦工)` | "机场修复" or "搬瓦工" | — |
| **模糊匹配多个关键词 (Fuzzy)** | `?` (question mark) | **AND** — ALL keywords must appear | `机场修复?搬瓦工` | Message must contain BOTH "机场修复" AND "搬瓦工" | Only one of them |
| **包含匹配 (Contains)** | (none) | Substring match on the whole string | `机场修复` | Contains "机场修复" | — |
| **全部匹配 (All)** | (none) | Exact match on the whole string | `机场修复` | Exactly "机场修复" | Any variation |

**Default rule**: For monitoring keywords you care about, ALWAYS use **正则匹配 (Regex)** with `|` (pipe) as the OR separator. Fuzzy mode with `?` is almost never what you want — it silently generates an AND regex that requires ALL keywords in the same message.

## Adding a Rule via Web UI

1. Go to **关键词设置** tab
2. Leave **规则所属账号** as "全局规则"
3. Fill in:
   - **规则名称**: descriptive name, e.g. `代付_需求`
   - **关键词内容**: regex pattern, e.g. `(代付|找人代付|找代付)`
   - **匹配方式**: select **正则匹配** (Regex)
   - **命中动作**: **监控** (Monitor) or **排除** (Exclude)
   - **优先级**: `20` for Monitor rules, `30` for Exclude rules
4. **备注**: add a note for identification
5. Click **新增规则**

> **Pitfall**: After selecting match mode, the combobox dropdown options may not be clickable via browser automation (CDP `DOM.getBoxModel` error). Use keyboard: click the combobox, press ArrowDown to navigate, Enter to select. Or use JavaScript:
> ```js
> // Click the edit button for a specific rule ID via JS
> document.querySelectorAll('table tr').forEach(tr => {
>   let tds = tr.querySelectorAll('td');
>   if (tds.length > 1 && tds[0].textContent.trim() === '72') {
>     tr.querySelector('button').click();
>   }
> });
> ```

## API Reference

All API calls go through Cloudflare proxy to the internal container (port 5005).

### Authentication

```bash
# Login, saves cookie to file
curl -4 -s -c /tmp/tgcookie -X POST https://telegram.wf1.one/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"tgmonitor2024"}'
```

### List Rules

```bash
curl -4 -s -b /tmp/tgcookie https://telegram.wf1.one/api/keywords
```

### Get Single Rule

```bash
curl -4 -s -b /tmp/tgcookie https://telegram.wf1.one/api/keywords/{id}
```

### Create Rule

```bash
curl -4 -s -X POST -b /tmp/tgcookie -H 'Content-Type: application/json' \
  -d '{"ruleName":"代付_需求","keywordPattern":"(代付|找人代付|找代付)","matchMode":"Regex","keywordAction":"Monitor","priority":20,"isEnabled":true,"remark":"监控代付需求"}' \
  https://telegram.wf1.one/api/keywords
```

**Pitfall**: The JSON field name is `keywordPattern` (not `keywordContent`). Using the wrong field name causes error `关键词内容不能为空`.

**Pitfall — POST endpoint broken on the VPS1 deployment (TelegramMonitor as of 2026-07)**: Despite the JSON payload being valid and matching the web UI form exactly, the POST endpoint returns `{"statusCode":500,"succeeded":false,"errorMessage":"A server error occurred"}`. GET (list rules) works, DELETE works, but POST (create) fails — even with a known-good payload copied from a UI-submitted request. PUT/update also fails. **Workaround**: Use the web UI form-fill workflow below; the POST code path is broken on this build regardless of payload.

### Delete Rule

```bash
curl -4 -s -X DELETE -b /tmp/tgcookie https://telegram.wf1.one/api/keywords/{id}
```

### API Response Structure

```json
{
  "statusCode": 200,
  "data": {...},
  "succeeded": true,
  "errors": null
}
```

## Common Workflow: Keyword Refinement

When the user says keyword monitoring is sending useless info:

> **⚠️ CRITICAL PITFALL**: Before deleting ANY Monitor rule, ALWAYS describe the proposed deletions to the user and confirm. What looks like "noise" to you may be a keyword the user actively needs. Example: "机场维护", "代付", "代搭建" may look like irrelevant ads but the user uses them to find business opportunities. Never delete without confirmation.

1. **Audit existing rules**: GET /api/keywords, list all rules
2. **Identify noise sources**:
   - Rules matching irrelevant topics (airport, carding, betting, etc.)
   - Rules with wrong match mode (Fuzzy instead of Regex)
   - Rules where keywords are too broad
3. **Delete noise rules**: DELETE /api/keywords/{id}
4. **Add precision rules**: Create Monitor rules with Regex mode and `|` OR syntax
5. **Keep Exclude rules**: Filter out ads, gambling, and other spam regardless of Monitor rules

## Key Field Names (from API JSON)

- `id`: rule ID
- `ruleName`: rule name
- `keywordPattern`: the keyword regex pattern
- `matchMode`: "Regex" | "Fuzzy" | "Contains" | "All"
- `keywordAction`: "Monitor" | "Exclude"
- `isEnabled`: true/false
- `priority`: 20 (Monitor), 30 (Exclude)
- `remark`: notes/description
- `isCaseSensitive`: true/false
