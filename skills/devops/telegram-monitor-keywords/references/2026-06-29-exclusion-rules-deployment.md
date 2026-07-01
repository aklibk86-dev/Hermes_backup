# Exclusion Rules Deployment — 2026-06-29

## Context

Two false positives were caught by monitor rules:

1. **nyanpass relay station ad** (hit by `协议_求推荐` ID 53)
   - Source: nyanpass @nyanpass_fw
   - Content: pricing list with `🎁专线···/T` format, "老转发收新人"
   - Why missed: existing exclude rules had `中转面板` but only in group name, not content; pricing used `/T` format not `U/天`

2. **Yue.to bot auto-reply** (hit by `协议_求推荐` ID 53)
   - Source: Yue.to @yue_to, sender @yuetoo_bot
   - Content: service announcement mentioning "面板" (matched ID 53)
   - Why missed: existing bot auto-reply patterns didn't cover Yue.to's messages

## Rules Added/Updated

### Rule 69 — 排除_中转转发广告 (NEW, priority 30, Regex)

Targets relay/forwarding station ads with characteristic formatting:

```
pattern: 老转发收新人|转发收新人|收新人|🎁.*专线|🎁.*入口|🎁.*转发|🎁.*AWS|🎁.*聚合|🎁.*穿透|专线.*穿透.*/T|专线.*/T|穿透.*/T|入口.*稳定机.*/T|海外入口.*/T|转发.*自带.*IX|无面板接入办法|/T$|🎁.*/T
```

Covers:
- Recruiting language: `老转发收新人`, `转发收新人`
- 🎁-prefixed pricing lines: `🎁.*专线`, `🎁.*入口`, etc.
- Traffic pricing: `*/T` suffix patterns
- Specific relay terminology: `转发.*自带.*IX`, `无面板接入办法`

### Rule 64 — 排除_机器人自动回复 (UPDATED)

Added new patterns to existing bot auto-reply exclusion:

```
悦通官网|客户端推荐.*YueLink|面板/购买/订阅都从官网进入|原版 Clash 已停更|官网.*面板.*购买.*订阅|Clash Meta.*Stash.*Shadowrocket
```

Covers Yue.to / YueBot style service announcements that were previously missed.

## Key Lesson

**Bot announcements from service channels often look like normal content** — they lack the typical ad patterns (price tables, `/U` suffixes) that existing exclude rules catch. For bot-driven channels like @yue_to, add patterns that match their specific announcement templates rather than trying to block the group itself.

**Relay station ads have moved to 🎁-prefixed pricing format** with `/T` (per TB) instead of the older `U/天` pattern. The existing `排除_广告推销` (ID 49) didn't catch `/T` suffixes. New patterns must explicitly cover `/T$` and `🎁`-prefixed lines.
