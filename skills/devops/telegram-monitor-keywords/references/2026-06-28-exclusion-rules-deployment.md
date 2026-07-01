# Exclusion Rules Deployment — 2026-06-28

## Context

Protocol-related keywords `协议_求推荐` (ID 53) were catching too much noise.
Analysis of ~30 hits showed ~40% noise from known bot/spam sources.

## Noise Sources Identified

| Source | Sender | Noise Type | Exclude Rule |
|--------|--------|-----------|-------------|
| 暗网AI搜索 | @GHClone3Bot | Child exploitation links (高中初中合集, 小妹妹合集) | 排除_不良内容 (63) |
| 暗网AI搜索 | @sooo | Gambling ads (182体育, 投注平台) | 排除_赌博广告 (67) |
| Yue.to 悦通 | @yuetoo_bot | Auto-reply templates (先看下是哪种情况) | 排除_机器人自动回复 (64) |
| 橘子复读机 | @nmnmfunbot | Subscription link ads | 排除_机器人自动回复 (64) |
| halocloud / 东南亚暗网 | — | Crypto spam (抄底, 多空双吃) | 排除_金融广告 (65) |
| 柬埔寨西港聊天群 | Kevin Evans | Supplier-side U exchange (接各种二道款) | 排除_供应侧代付 (66) |

## Rules Added

### Rule 63 — 排除_不良内容 (priority 30, Regex)
```json
{
  "ruleName": "排除_不良内容",
  "keywordValue": "(小妹妹合集|高中初中合集|初中合集|色情|主播资源|高中资源|初中资源)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

### Rule 64 — 排除_机器人自动回复 (priority 30, Regex)
```json
{
  "ruleName": "排除_机器人自动回复",
  "keywordValue": "(先看下是哪种情况|用密码获取的订阅节点|输入密码即可获取|你的理解有误)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

### Rule 65 — 排除_金融广告 (priority 30, Regex)
```json
{
  "ruleName": "排除_金融广告",
  "keywordValue": "(抄底|多空双吃|提前布局多空|市场恐慌|区块链|合约跟单|量化交易|带单)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

### Rule 66 — 排除_供应侧代付 (priority 30, Regex)
```json
{
  "ruleName": "排除_供应侧代付",
  "keywordValue": "(接各种二道款|我这边承兑|出U|出u|老板.*需要u么|需要U可以找我|大量收u|大量收U)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

### Rule 67 — 排除_赌博广告 (priority 30, Regex)
*Added separately after user reported more noise from 暗网AI搜索*

```json
{
  "ruleName": "排除_赌博广告",
  "keywordValue": "(投注平台|高端嫩模|无风控|零审核|包出款|U存U提|存款彩金|真人百家|电子真人|PG电子|赏金女王|捕鱼|棋牌|劳力士手表|奔驰E300|大额出款|日存彩金|周流水彩金|签到彩金|双重签到|免实名|免绑卡|免绑手机)",
  "matchMode": "Regex",
  "keywordAction": "Exclude",
  "priority": 30
}
```

## Key Lesson

**Cannot exclude by group/source.** The TelegramMonitor API only supports content-based exclusion rules. For consistently noisy groups like 暗网AI搜索 that post multiple types of spam (child exploitation, gambling, crypto), you need separate exclude rules for each content category targeting that group. Add rules iteratively as new noise types appear.
