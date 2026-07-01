# Exclusion Rules Deployment — 2026-06-29

## Context

Two new noise sources emerged after the initial round of exclusion rules:

1. **中转转发站 ads** — Relay/forwarding stations posting price lists in `🎁.../T` format
2. **Yue.to / 悦通 bot** — Official bot auto-replies containing "面板" keyword

## New Rules

### Rule 69 — 排除_中转转发广告 (priority 30, Regex)

Added to block relay/forwarding station supplier ads that use the `🎁.../T` pricing format.

```json
{
  "ruleName": "排除_中转转发广告",
  "keywordValue": "老转发收新人|转发收新人|收新人|🎁.*专线|🎁.*入口|🎁.*转发|🎁.*AWS|🎁.*聚合|🎁.*穿透|专线.*穿透.*/T|专线.*/T|穿透.*/T|入口.*稳定机.*/T|海外入口.*/T|转发.*自带.*IX|无面板接入办法|/T$|🎁.*/T",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30,
  "remark": "屏蔽中转转发站广告：专线/T定价、🎁前缀、收新人等"
}
```

**Match examples** against real message:
```
🎁专线-香港穿透 340/T  →  🎁.*专线, 🎁.*穿透, 🎁.*/T, 专线.*/T
🎁海外入口 稳定机 50/T  →  🎁.*入口, 🎁.*/T, 海外入口.*/T
🎁AWS聚合入口 25/T     →  🎁.*AWS, 🎁.*聚合, 🎁.*/T
🎁转发-自带前置IX 45/T →  🎁.*转发, 🎁.*/T, 转发.*自带.*IX
AWS出口 10/T           →  /T$
```

### Rule 64 — 排除_机器人自动回复 (updated)

Extended with patterns for Yue.to / 悦通 bot official announcements:

```json
{
  "ruleName": "排除_机器人自动回复",
  "keywordValue": "(先看下是哪种情况|用密码获取的订阅节点|输入密码即可获取|你的理解有误|悦通官网|客户端推荐.*YueLink|面板/购买/订阅都从官网进入|原版 Clash 已停更|官网.*面板.*购买.*订阅|Clash Meta.*Stash.*Shadowrocket)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

**Why they matched ID 53 (协议_求推荐):**
- Original captured message contained "高性能中转面板" → "面板" in the group name matched ID 53
- Yue.to message contained "面板/购买/订阅都从官网进入" → "面板" also matched ID 53

## Key Lesson

**Supplier ads use distinctive price formats** — newer relay stations use `🎁` emoji prefixes and `/T` (traffic pricing) suffixes instead of the older `U/天` or `元/月` formats. Monitor rules and exclude rules both need periodic updates as pricing language evolves.

**Bot auto-replies are per-bot specific** — each service bot (YueBot, nmBot, etc.) uses unique reply templates. Add patterns incrementally as each one appears in monitoring.
