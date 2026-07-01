# 2026-06-29 — Rule Updates

## Summary

Three changes applied after session review:

1. **ID 45 (中转API_求购) expanded** — Added 30 keywords for API relay station monitoring
2. **ID 69 (排除_中转转发广告) created** — New exclusion rule for relay station supplier ads
3. **ID 64 (排除_机器人自动回复) expanded** — Added Yue.to / 悦通 bot announcement patterns

---

## 1. ID 45 — Monitor: 中转API_求购

**Action**: Added 30 new keywords to existing pattern (125 → 312 chars)

**New keywords**:
```
api售卖|卖api|api出售|出售api|api代理|api代理站|ai转发|gpt转发|
claude转发|模型转发|模型api|聚合api|api聚合|api分销|分销api|
api用量|api额度|充值api|api充值|转发站|转发平台|api渠道|
接口转发|模型接口|接口站|中转平台|newapi搭建|new-api搭建|
oneapi搭建|one-api搭建
```

**Categories**: API selling, proxy stations, AI model forwarding, aggregation, reselling, usage/quota, top-up, platform refs, setup discussions.

---

## 2. ID 69 — Exclude: 排除_中转转发广告

**Pattern**:
```
老转发收新人|转发收新人|收新人|🎁.*专线|🎁.*入口|🎁.*转发|🎁.*AWS|
🎁.*聚合|🎁.*穿透|专线.*穿透.*/T|专线.*/T|穿透.*/T|入口.*稳定机.*/T|
海外入口.*/T|转发.*自带.*IX|无面板接入办法|/T$|🎁.*/T
```

**Why needed**: Existing exclude rules (IDs 48-51) didn't catch relay station ads because:
- Pricing uses `/T` (per TB) not `U/天` or `月付` → ID 49 missed
- Ads use `🎁` prefix emoji → not in any pattern
- Recruitment language ("收新人") → not in any pattern

**Triggered by**: nyanpass channel message hitting ID 53 via "面板" keyword

**Common message format caught**:
```
🎁专线-香港穿透 340/T
🎁海外入口(TLS入站)稳定机 50/T
🎁AWS聚合入口 25/T
🎁转发-自带前置IX （无面板接入办法） 45/T
```

---

## 3. ID 64 — Exclude: 排除_机器人自动回复 (expanded)

**Added patterns**:
```
悦通官网|客户端推荐.*YueLink|面板/购买/订阅都从官网进入|
原版Clash已停更|Clash Meta.*Stash.*Shadowrocket|
官网.*面板.*购买.*订阅
```

**Why needed**: The `协议_求推荐` (ID 53) monitor rule has "面板" as a keyword, which catches official bot announcements from Yue.to and similar services. These are not customer demand signals — they're automated service info.

**Triggered by**: Yue.to official channel message:
```
🌐 悦通官网 官网：https://yue.to 面板/购买/订阅都从官网进入。
客户端推荐 YueLink；第三方客户端请使用 Clash Meta / Stash / Shadowrocket，
原版 Clash 已停更不推荐。
```
