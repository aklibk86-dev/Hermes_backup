# Dujiao-Next Site Config Field Reference

## Settings Table — `site_config` Key

Full JSON structure of the `site_config` setting:

### Brand
```json
{
  "brand": {
    "site_name": "站点名称",
    "site_description": {
      "zh-CN": "中文描述",
      "en-US": "English description",
      "zh-TW": "繁體描述"
    },
    "site_icon": "/uploads/common/2026/06/xxx.png",
    "site_url": "https://shop.aklibk.com"
  }
}
```

### SEO
```json
{
  "seo": {
    "title": {"zh-CN": "", "en-US": "", "zh-TW": ""},
    "keywords": {"zh-CN": "", "en-US": "", "zh-TW": ""},
    "description": {"zh-CN": "", "en-US": "", "zh-TW": ""}
  }
}
```

### Contact
```json
{
  "contact": {
    "telegram": "https://t.me/MTBTQ",
    "whatsapp": ""
  }
}
```

### Legal
```json
{
  "legal": {
    "terms": {"zh-CN": "", "en-US": "", "zh-TW": ""},
    "privacy": {"zh-CN": "", "en-US": "", "zh-TW": ""}
  }
}
```

### Scripts (analytics/verification)
```json
{
  "scripts": [
    {
      "code": "<script ...></script>",
      "enabled": true,
      "name": "umami",
      "position": "head"
    }
  ]
}
```

## Shop Config — Typical Values for API Relay Shop

- **site_name**: `WF API中转站` / `NewAPI 中转站`
- **currency**: `CNY`
- **site_description.zh-CN**: `专业的 AI 模型 API 中转服务平台，提供 OpenAI GPT、Claude Opus/Sonnet 等主流模型余额充值兑换，稳定高效，即买即用。`
- **seo.title.zh-CN**: `WF API中转站 | AI模型API余额兑换商城`
- **seo.keywords.zh-CN**: `API中转站, NewAPI, AI模型充值, 余额兑换, OpenAI, Claude, ChatGPT, API密钥, 开发者工具, 人工智能, GPT充值, Sonnet`
- **seo.description.zh-CN**: `WF API中转站提供OpenAI GPT、Claude Opus/Sonnet、DeepSeek等主流AI模型余额兑换充值服务。稳定可靠的API中转平台，开发者首选，即买即用。`

## Products Table — Key Columns

| Column | Type | Example |
|--------|------|---------|
| slug | text | `zzzcz`, `100dao`, `50dao` |
| title_json | json | `{"zh-CN":"20刀余额兑换码","en-US":"","zh-TW":""}` |
| description_json | json | Short blurb shown under DESCRIPTION heading |
| content_json | json | Rich HTML for Details section |
| instructions_json | json | Delivery instructions (shown after purchase) |
| seo_meta_json | json | `{"description":{"zh-CN":"..."},"keywords":{"zh-CN":"..."}}` |
| tags | json | `[]` |

## Database Connection

```bash
docker exec -i dujiaonext-postgres psql -U dujiao -d dujiao_next < /path/to/query.sql
```
