# Exclusion Rules Deployment — 2026-06-29

## Context

Two false positives reported by user:
1. **nyanpass relay station ad** — caught by `协议_求推荐` (ID 53) via keyword "面板" in sender name. Content was a pricing table with 🎁 prefixes and `/T` unit pricing.
2. **Yue.to bot auto-reply** — caught by `协议_求推荐` (ID 53) via keyword "面板" in content. Bot message from @yuetoo_bot recommending clients.

## New Rule

### Rule 69 — 排除_中转转发广告 (priority 30, Regex)

Targets relay/forwarding station supplier ads with characteristic formatting:
- 🎁-prefixed pricing lines
- `/T` unit pricing (instead of `U/天` already covered by Rule 49)
- Recruitment language ("收新人")
- Specific phrases ("无面板接入办法")

```json
{
  "ruleName": "排除_中转转发广告",
  "keywordValue": "老转发收新人|转发收新人|收新人|🎁.*专线|🎁.*入口|🎁.*转发|🎁.*AWS|🎁.*聚合|🎁.*穿透|专线.*穿透.*/T|专线.*/T|穿透.*/T|入口.*稳定机.*/T|海外入口.*/T|转发.*自带.*IX|无面板接入办法|/T$|🎁.*/T",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

## Updated Rule

### Rule 64 — 排除_机器人自动回复 (priority 30, Regex)

Added patterns for Yue.to / YueBot official channel auto-replies:

```json
{
  "ruleName": "排除_机器人自动回复",
  "keywordValue": "(先看下是哪种情况|用密码获取的订阅节点|输入密码即可获取|你的理解有误|悦通官网|客户端推荐.*YueLink|面板/购买/订阅都从官网进入|原版 Clash 已停更|官网.*面板.*购买.*订阅|Clash Meta.*Stash.*Shadowrocket)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

### Rule 45 — 中转API_求购 (priority 20, Regex)

Expanded from 125→312 chars. Added 30 new keywords covering:
- API selling/buying: `api售卖`, `卖api`, `api出售`, `出售api`, `api分销`, `分销api`
- API proxy: `api代理`, `api代理站`, `接口转发`, `转发站`, `转发平台`, `中转平台`
- AI model forwarding: `ai转发`, `gpt转发`, `claude转发`, `模型转发`, `模型api`, `模型接口`
- Aggregation: `聚合api`, `api聚合`, `api渠道`, `接口站`
- Deploy references: `newapi搭建`, `new-api搭建`, `oneapi搭建`, `one-api搭建`
- Usage/quota: `api用量`, `api额度`, `充值api`, `api充值`

## Key Lessons

**🎁 + /T pricing format**: Relay/forwarding station ads often use 🎁 emoji plus `/T` unit (e.g. `🎁专线-香港穿透 340/T`). This format is distinct from VPN/airport pricing (`U/天`, `Gbps` covered by Rule 49), so it needed a dedicated exclude rule.

**Sender name ≠ message content**: Some matches come from sender/group display names (e.g. "高性能中转面板" contains "面板" matching ID 53). The API matches against content only — exclude rules can't filter by sender name.

**Bot auto-reply evolution**: Each bot platform has unique message templates. When a new bot notification triggers false positives, extract its distinctive phrases and add them to the existing bot-exclude rule (ID 64) rather than creating a new rule.
