# 闲鱼商品文案编写规范（虚拟/数字商品）

针对 API中转、Token、Key 等虚拟商品在闲鱼上架时的文案策略。

## 闲鱼平台规则要点

- 闲鱼明令禁止直接发布数字产品、API、Token、账号、充值类虚拟商品
- 标题和正文命中 API/Token/中转/充值/Key 等关键词 → 直接下架或降权
- 多次违规会限流甚至封号

## 安全上架策略

### 类目选择
- 选「数码闲置」类目，不要选虚拟商品
- 实物类目审核门槛更低

### 标题写法（模糊化）
- 不要出现: API、Token、中转、Key、充值、账号
- 推荐用: 「小东西」「自己搭的服务」「懂的来」「转个闲置」
- 例如: 「出个自己搭的小东西 懂的来」

### 正文写法
- 不要在正文直接写价格和交易方式
- 用隐晦表述: 「懂的都懂」「支持主流的那些模型」
- 引导私聊: 「怎么用私聊发教程」「直接拍xx元链接 可以先用着」
- 不写具体模型名，写「gpt claude deepseek gemini那些都有」

### 图片策略
- 主图放测速截图 / ping图 / 服务器后台截图
- 不要放模型列表截图（OCR也会检测）
- 私聊再发具体价格表和使用教程

### 交易建议
- 私聊再报价和发教程，不在商品页写
- 如果被下架，换标题和文案重新发，不要原样重复

## 定价参考（2026年中行情）

### 官方价格（美元/百万token）

| 模型 | 输入 | 输出 |
|------|------|------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o-mini | $0.15 | $0.60 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| DeepSeek V3 | $0.28 | $0.42 |
| Gemini 2.0 Flash | $0.10 | $0.40 |

### 闲鱼常见定价（人民币/百万token）

| 模型 | 闲鱼价 |
|------|--------|
| GPT-4o | ¥2~4 |
| GPT-4o-mini | ¥0.2~0.5 |
| Claude Sonnet | ¥3~6 |
| DeepSeek V3 | ¥0.2~0.4 |

闲鱼价格大约压到官方的 1/10 ~ 1/15。

### 推荐定价方案

**通用额度模式（最好卖）:**
- 充10元=100万通用额度
- 各模型按倍率扣量：GPT-4o 1倍, Claude 1.5倍, GPT-4o-mini 0.1倍, DeepSeek 0.1倍
- 买家不用算来算去，门槛低

**按模型单独定价:**
- GPT-4o-mini ¥0.5/百万（走量）
- GPT-4o ¥3/百万（高毛利）
- Claude Sonnet ¥5/百万（高毛利）
- DeepSeek ¥0.4/百万（接近成本）

## 查询官方价格的方法

官方站点通常有 Cloudflare 防护，可以使用 litellm 的定价数据:

```bash
curl -sL "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for model, info in data.items():
    if 'gpt-4o' in model.lower() and 'realtime' not in model.lower():
        print(f'{model}')
        print(f'  input_per_token: {info[\"input_cost_per_token\"]}')
        print(f'  output_per_token: {info[\"output_cost_per_token\"]}')
        print(f'  input_per_1M: \${info[\"input_cost_per_token\"]*1e6:.2f}')
        print(f'  output_per_1M: \${info[\"output_cost_per_token\"]*1e6:.2f}')
"
```

## 闲鱼文案示例（通用额度模式）

标题: 出个自己搭的小东西 懂的来

正文:
自己搞了个香港服务器 国内直连速度还不错
买来用的 现在多了用不完 转给需要的人

支持主流的那些模型 懂的都懂
gpt claude deepseek gemini那些都有
和官方的一样 改个地址就能用
随便并发 流式输出都支持

直接拍10元链接 可以先用着
怎么用私聊发教程
