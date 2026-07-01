# 2026-07-01: Noise Rule Cleanup

## Trigger

User said "关键词监控监控到现在 发给我的都是没有用的信息" — too many useless notifications.

## Diagnosis

22 rules total. 12 Monitor rules, of which 10 were for topics unrelated to the user's business (API relay / AI keys):

| Deleted Rules | Reason |
|---------------|--------|
| 43 机场_求助修复 | Airport/VPN — not the user's business |
| 44 机场_求购推荐 | Airport/VPN — not the user's business |
| 47 代付_求人做 | Payment proxy — not the user's business |
| 52 协议搭建_求助 | Protocol setup — too broad, catches casual tech talk |
| 53 协议_求推荐 | Protocol recs — matches every mention of anytls/hysteria/v2ray/trojan etc |
| 57 发卡系统_搭建需求 | Carding system — not the user's business |
| 58 发卡系统_源码教程 | Carding system source code |
| 59 独角发卡_泛聊 | Carding system chit-chat |
| 60 发卡系统_代挂代运维 | Carding system hosting |
| 61 发卡系统_求购推荐 | Carding system purchase |
| 64 (unnamed) | **Misconfigured!** Intended as Exclude but created with `keywordAction: "Monitor"` — was monitoring FOR exclusion patterns instead of filtering them out |

## Action

1. Deleted all 11 rules via `DELETE /api/keywords/{id}`
2. Kept only ID 45 (中转API_求购) and ID 46 (AI_买key)
3. All 9 existing Exclude rules retained (IDs 48-51, 63, 65-67, 69)

## Lesson

**Monitor rule count should stay under 3-5**. Each additional monitor rule beyond the user's core business generates proportional notification load with diminishing returns. Delete rules for adjacent industries entirely rather than trying to exclude every noise pattern.
