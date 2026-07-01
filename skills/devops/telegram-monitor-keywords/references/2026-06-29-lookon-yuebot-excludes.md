# 2026-06-29: ID 64 Expanded — YueBot Troubleshooting + LookOn Bot Patterns

## Trigger

Two YueBot (@yuetoo_bot) auto-replies and one LookOn bot (@Lookonbot)
intro message hit `协议_求推荐` (ID 53) monitor rule as false positives.

### YueBot New Template (17:17, 2026-06-29)

Message content was a Shadowrocket troubleshooting guide starting with:
"你这描述，其实更像是**订阅/连接被你这边网络干扰了**..."

Key phrases unique to this template:
- `你这描述.*更像是`
- `先直接给你一套小火箭的有效排查`
- `连接方式切一下`
- `小火箭里把旧订阅删掉`
- `小火箭的有效排查`

### LookOn Bot (17:28, 2026-06-29)

Bot intro message advertising LookOn's anti-spam features:
"lookon是一个专注清除广告的机器人..."

Key phrases:
- `lookon是一个专注清除广告的机器人`
- `LookOn支持两种模式`

## Action

Updated **排除_机器人自动回复** (ID 64) — added 7 new patterns to the regex.

## Pattern After Update

```regex
(先看下是哪种情况|用密码获取的订阅节点|输入密码即可获取|你的理解有误|悦通官网|客户端推荐.*YueLink|面板/购买/订阅都从官网进入|原版 Clash 已停更|官网.*面板.*购买.*订阅|Clash Meta.*Stash.*Shadowrocket|lookon是一个专注清除广告的机器人|LookOn支持两种模式|你这描述.*更像是|先直接给你一套小火箭的有效排查|连接方式切一下|小火箭里把旧订阅删掉|小火箭的有效排查)
```

## Verification

Successful PUT response: `{"statusCode":200,"succeeded":true}`

## Key Takeaway

Each new bot template type needs a unique sub-pattern added to the same
umbrella rule (ID 64). The patterns should capture the **signature
opening phrase** unique to that bot's template — not generic networking
terms ("节点", "连接", "模式") that would over-match.
