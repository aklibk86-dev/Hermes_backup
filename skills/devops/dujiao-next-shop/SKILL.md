---
name: dujiao-next-shop
description: Manage Dujiao-Next self-hosted shop — admin panel access, site-wide SEO config, product editing, and database-level modifications when the Vue admin SPA does not cooperate with browser automation.
model: deepseek-v4-flash
---

# Dujiao-Next Shop Management

Manages the Dujiao-Next shop (e.g. shop.aklibk.com) — a headless Vue.js e-commerce SPA that sells digital products (API relay balance codes).

## Architecture

| Component | Container Name | Internal Port | Domain |
|-----------|---------------|---------------|--------|
| Customer frontend | `dujiaonext-user` | 8081 → 80 | shop.aklibk.com |
| Admin panel | `dujiaonext-admin` | 8082 → 80 | **shop-admin.aklibk.com** |
| API backend | `dujiaonext-api` | 8080 | (internal) |
| Database | `dujiaonext-postgres` | 5432 | (internal) |
| Cache | `dujiaonext-redis` | 6379 | (internal) |

## Getting Admin Credentials

The admin credentials are NOT in the `.env` file — they are defined as env overrides in the docker-compose file. Extract them with:

```bash
# From the compose project directory:
cd /opt/dujiao-next
docker compose -f docker-compose.postgres.yml config 2>/dev/null | grep -A2 ADMIN

# Result: DJ_DEFAULT_ADMIN_USERNAME=admin, DJ_DEFAULT_ADMIN_PASSWORD=<hash>
```

**Default login**: `admin` / `<from docker compose config>`

## Admin Panel Access

- **URL**: `https://shop-admin.aklibk.com` (separate subdomain from the customer frontend)
- The login page has fields: 用户名 / 密码 → 登录

## SEO Configuration

### Method A: Admin Panel (Site Settings)

Navigate: 系统设置 → 站点设置 → 基础配置 (Basic) tab

Key fields on **基础配置** tab:
- **站点名称** (`brand.site_name`) — displayed in nav bar, footer, and `<title>` tag
- **网站介绍** (`brand.site_description.zh-CN`) — footer description text
- **SEO 标题** (`seo.title.zh-CN`) — meta title
- **SEO 关键词** (`seo.keywords.zh-CN`) — meta keywords
- **SEO 描述** (`seo.description.zh-CN`) — meta description
- **联系方式**: Telegram / WhatsApp
- **前台脚本**: Umami analytics, Bing verification, etc.

### Method B: Direct Database (Falls back when Vue SPA tabs don't respond)

The admin panel is a Vue 3 SPA. Browser automation clicks on tabs and submenus often fail to trigger Vue Router navigation. Use this method when clicks don't produce page changes.

```sql
-- SSH into the VPS, then write SQL to temp file and execute:

cat > /tmp/update_site_config.sql << 'SQLEOF'
UPDATE settings SET value_json = jsonb_set(
  jsonb_set(
    value_json::jsonb,
    '{brand,site_name}',
    '"WF API中转站"'
  ),
  '{seo,title,zh-CN}',
  '"WF API中转站 | AI模型API余额兑换商城"'
)
WHERE key = 'site_config';
SQLEOF

docker exec -i dujiaonext-postgres psql -U dujiao -d dujiao_next < /tmp/update_site_config.sql
```

**IMPORTANT**: When renaming the shop, also update the SMTP sender name:
```sql
UPDATE settings SET value_json = jsonb_set(
  value_json::jsonb,
  '{from_name}',
  '"WF API中转站"'
)
WHERE key = 'smtp_config';
```

### Site Config JSON Structure

The `site_config` key stores a deeply nested JSON document:

```json
{
  "brand": {
    "site_name": "WF API中转站",
    "site_description": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."},
    "site_icon": "/uploads/...",
    "site_url": "https://shop.aklibk.com"
  },
  "seo": {
    "title": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."},
    "keywords": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."},
    "description": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."}
  },
  "contact": {
    "telegram": "https://t.me/...",
    "whatsapp": ""
  },
  "legal": {
    "terms": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."},
    "privacy": {"zh-CN": "...", "en-US": "...", "zh-TW": "..."}
  },
  "currency": "CNY",
  "scripts": [...]
}
```

## Product Editing

### Product Table Schema

Key columns in the `products` table:
- `slug` — URL identifier (e.g. `zzzcz`, `100dao`)
- `title_json` — `{"zh-CN": "商品名", "en-US": "", "zh-TW": ""}`
- `description_json` — **Short description** displayed under the DESCRIPTION heading on product detail page
- `content_json` — Rich text (HTML) content displayed in the Details section
- `instructions_json` — Delivery instructions (shown after purchase)
- `seo_meta_json` — `{"description": {"zh-CN": "..."}, "keywords": {"zh-CN": "..."}}`
- `tags` — JSON array of tags

### Updating Product via Database

When the Vue edit dialog does not save changes properly:

```sql
UPDATE products SET
  description_json = '{"en-US":"","zh-CN":"WF API中转站20刀余额兑换码，可在 api.wf1.one 充值使用。聚合GPT-4o、Claude 3.5、Gemini等主流AI模型的API转发服务，轻量入门，即买即用，自动到账。","zh-TW":""}',
  seo_meta_json = '{"description":{"en-US":"","zh-CN":"购买20刀WF API中转站余额兑换码...低门槛入门，无需境外支付，自动交付，稳定低延迟。","zh-TW":""},"keywords":{"en-US":"","zh-CN":"API中转站, 20刀余额兑换码, AI模型充值, 小额度充值, OpenAI, Claude, API密钥, 开发者工具","zh-TW":""}}'
WHERE slug = 'zzzcz';
```

### Verifying Changes

After DB updates, verify on the customer-facing product page:
```
https://shop.aklibk.com/products/<slug>
```

Check:
- DESCRIPTION section has content (from `description_json`)
- `<meta name="description">` matches `seo_meta_json.description.zh-CN`
- Site title / nav brand updated from `site_config.brand.site_name`

## Pitfalls

1. **Vue SPA navigation**: Tabs (基础配置/模板配置/关于我们) in the admin settings page often do NOT respond to `browser_click`. Use `document.querySelector` + `.click()` via `browser_console` as first fallback, direct DB update as second.
2. **Dialog navigation**: Product edit buttons in the list may open the wrong product. Use JavaScript to click the Nth "编辑" button matching the target row.
3. **Save persistence**: The Vue form may visually accept typed input but not persist on save. Always verify with a page reload or DB query.
4. **Multi-lingual JSON**: All user-facing fields use JSON blobs with `zh-CN`, `en-US`, `zh-TW` keys. Always set all three, even if only `zh-CN` is used.
5. **SMTP from_name**: The SMTP config's `from_name` is separate from the brand `site_name` — both must be updated when renaming.
