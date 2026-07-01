# API Relay 市场定价 & 闲鱼文案参考

## 官方模型价格（美元/百万token，2026年）

| 模型 | 输入 | 输出 | 平均 |
|------|------|------|------|
| GPT-4o | $2.50 | $10.00 | $6.25 |
| GPT-4o-mini | $0.15 | $0.60 | $0.38 |
| Claude Sonnet 4/4.5/4.6 | $3.00 | $15.00 | $9.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 | $9.00 |
| Claude 3 Haiku | $0.25 | $1.25 | $0.75 |
| DeepSeek V3 | $0.28 | $0.42 | $0.35 |
| DeepSeek R1 | $0.28 | $0.42 | $0.35 |
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.25 |
| Gemini 2.5 Pro | $1.25 | $10.00 | $5.62 |

## 价格查询方法

```bash
# LiteLLM 聚合了几乎所有模型的官方价格
curl -sL "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"

# 筛选关键模型
curl -sL "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
targets = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4', 'claude-3.5-sonnet', 'claude-3-haiku',
           'deepseek-chat', 'deepseek-reasoner', 'gemini-2.0-flash', 'gemini-2.5-pro']
for model, info in data.items():
    for t in targets:
        if t in model.lower() and 'realtime' not in model.lower() and 'thinking' not in model.lower():
            inp = info.get('input_cost_per_token', 0)
            out = info.get('output_cost_per_token', 0)
            print('%s  input=$%.2f/1M  output=$%.2f/1M  avg=$%.2f/1M' % (
                model, inp*1e6, out*1e6, (inp+out)/2*1e6))
            break
"
```

## 闲鱼市场行情参考（人民币/百万token）

中转站卖家的普遍价位（2025-2026年闲鱼行情）：

| 模型 | 闲鱼常见价 |
|------|-----------|
| GPT-4o | ¥2~4/百万 |
| GPT-4o-mini | ¥0.2~0.5/百万 |
| Claude Sonnet | ¥3~6/百万 |
| DeepSeek V3 | ¥0.2~0.4/百万 |
| 通用额度（一口价） | ¥1~3/百万 |

闲鱼价位大约是官方美元价的 1/10 到 1/15（按汇率7.2折算）。

## 定价策略建议

### 方案A：通用额度一口价（推荐新手）
- 例：充10元=100万token通用额度
- 所有模型按倍率扣量：GPT-4o扣1倍，Claude扣1.5倍，GPT-4o-mini/DeepSeek扣0.1倍
- 买家好理解，你后台New-API直接配倍率就行
- 门槛低（10元起），容易转化

### 方案B：按模型单独定价
- 每个模型明码标价
- GPT-4o ¥3/百万、Claude Sonnet ¥5/百万、GPT-4o-mini ¥0.5/百万
- 利润模型卖贵点，走量模型卖便宜点

### 定价公式
```
你的利润率 = (售价 - 上游成本) / 售价
上游成本 ≈ 官方价格 × 汇率 ÷ (你的上游折扣)
```

如果通过OpenRouter/DeepSeek官方拿更低价的渠道，利润空间更大。

## 香港VPS卖点（你的优势）
- 大陆直连，不用梯子
- 延迟比美国中转低得多
- 香港节点稳定

## 闲鱼文案模板（纯文字版，适合闲鱼）

### 版本一：按量充值型

```
香港AI API中转 GPT4o Claude DeepSeek 长期稳定

香港节点直连 国内直接用 不需要梯子
支持GPT4o Claude Sonnet DeepSeek R1 Gemini等主流模型
和官方API格式完全一样 改个base_url就行
支持并发 支持流式 速度嘎嘎快
10元=100万token 量大优惠 新用户首充送50万
老店稳定运营 当天额度当天到账

#API中转 #OpenAI中转 #ChatGPT #AI接口 #大模型API
```

### 版本二：低价引流型

```
ChatGPT API中转 白菜价 香港直连

全网最低价 香港节点 延迟低
兼容OneAPI NewAPI LobeChat NextChat
GPT4o Claude DeepSeek Qwen全部能用
按量充值 自动到账 不用等

直接拍 付款后自动发key

#AI接口 #ChatGPT中转 #OpenAI中转 #大模型API
```

### 版本三：转卖个人剩余额度

```
转让OpenAI余额$XX 官方Key比官网便宜

OpenAI官方API Key 直接官网查余额
全模型通用 GPT4o GPT4turbo都能调
买了直接用自己的脚本接入 或者转发都行
一口价XX元 付款发Key 秒确认

#OpenAI额度 #GPT额度 #APIKey #ChatGPT
```

### 闲鱼文案要点
1. 前3行最值钱 — 搜索结果只展示标题+前两行，上来就抛核心利益点
2. 标题多堆关键词 — "API中转""OpenAI""ChatGPT额度"等全部覆盖
3. 虚拟商品措辞委婉 — 不说"虚拟商品不退不换"，改说"发卡自动发货，确认收货后不退"
4. 价格锚点 — 暗示官方原价，让人觉得赚了
5. 配图 — 后台额度截图/模型列表截图，转化率翻倍
