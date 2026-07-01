# AI API Official Pricing Reference (USD per 1M tokens)

Updated from LiteLLM model_prices_and_context_window.json (current as of June 2026).

## OpenAI
| Model | Input/1M | Output/1M | Avg/1M |
|-------|----------|-----------|--------|
| GPT-4o (2024-11-20) | $2.50 | $10.00 | $6.25 |
| GPT-4o (2024-05-13) | $5.00 | $15.00 | $10.00 |
| GPT-4o-mini | $0.15 | $0.60 | $0.38 |

## Anthropic Claude
| Model | Input/1M | Output/1M | Avg/1M |
|-------|----------|-----------|--------|
| Claude Sonnet 4 (20250514) | $3.00 | $15.00 | $9.00 |
| Claude Sonnet 4.5 (20250929) | $3.00 | $15.00 | $9.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $9.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 | $9.00 |
| Claude 3 Haiku | $0.25 | $1.25 | $0.75 |

## DeepSeek
| Model | Input/1M | Output/1M | Avg/1M |
|-------|----------|-----------|--------|
| DeepSeek V3 (Chat) | $0.28 | $0.42 | $0.35 |
| DeepSeek R1 (Reasoner) | $0.28 | $0.42 | $0.35 |

## Google Gemini
| Model | Input/1M | Output/1M | Avg/1M |
|-------|----------|-----------|--------|
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.25 |
| Gemini 2.0 Flash-Lite | $0.075 | $0.30 | $0.19 |
| Gemini 2.5 Pro | $1.25 | $10.00 | $5.62 |

## 闲鱼 Market Pricing (RMB per 1M tokens)

Typical 闲鱼 prices for API relay services (Chinese market, July 2026):
- GPT-4o: ¥2-4 per 1M
- Claude Sonnet: ¥3-6 per 1M
- DeepSeek V3: ¥0.2-0.4 per 1M
- GPT-4o-mini: ¥0.2-0.5 per 1M

Forumla: roughly 1/10 to 1/15 of official price after USD→CNY conversion.

## Recommended Pricing for Own Relay (New-API)

Universal quota model (simplest for buyers):
- ¥10 = 1,000,000 universal units
- Model multipliers in New-API backend:
  - GPT-4o: 1.0x
  - Claude Sonnet: 1.5x
  - DeepSeek V3: 0.1x
  - DeepSeek R1: 0.1x
  - GPT-4o-mini: 0.1x
  - Gemini 2.0 Flash: 0.1x
  - Gemini 2.5 Pro: 1.0x

This yields effective pricing of ~¥3/1M for GPT-4o vs official ~¥45 — about 1/15 the price, competitive and profitable.
