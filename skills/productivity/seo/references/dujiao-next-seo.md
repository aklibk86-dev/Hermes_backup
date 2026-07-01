# Dujiao-Next: On-Page SEO Configuration

## Architecture

```
shop.aklibk.com (Cloudflare CDN)
  └─ shop-admin.aklibk.com (admin panel, Cloudflare CDN)
        └─ 1Panel OpenResty
              ├─ 127.0.0.1:8082 → dujiaonext-admin (Vue SPA)
              ├─ 127.0.0.1:8081 → dujiaonext-user (frontend SPA)
              └─ 127.0.0.1:8080 → dujiaonext-api (Go backend)
                    └─ PostgreSQL → dujiaonext-postgres
```

## Admin Panel Access

- **URL**: `https://shop-admin.aklibk.com`
- **Credentials**: stored in Docker env `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
- Retrieve: `docker compose config | grep ADMIN` in `/opt/dujiao-next/`
- Default username: `admin`

## Database Schema

All site settings are in the `settings` table, `value_json` column (JSONB). The key `site_config` holds the entire SEO config.

### Site Config JSONB Paths

```sql
-- Read current site config
SELECT value_json FROM settings WHERE key = 'site_config';
```

| JSONB Path | Example Value | Purpose |
|-----------|---------------|---------|
| `{brand,site_name}` | `"NewAPI 中转站"` | Site name in nav/title/OG |
| `{brand,site_description,zh-CN}` | `"专业的..."` | Footer description (per locale) |
| `{brand,site_description,en-US}` | `"Professional..."` | English footer description |
| `{brand,site_icon}` | `"/uploads/.../favicon.png"` | Favicon path |
| `{brand,site_url}` | `"https://shop.aklibk.com"` | Canonical site URL |
| `{seo,title,zh-CN}` | `"NewAPI 中转站 | AI模型..."` | `<title>` tag (per locale) |
| `{seo,keywords,zh-CN}` | `"API中转站, NewAPI,..."` | `<meta name="keywords">` |
| `{seo,description,zh-CN}` | `"NewAPI中转站提供..."` | `<meta name="description">` |
| `{contact,telegram}` | `"https://t.me/MTBTQ"` | Telegram contact link |
| `{contact,whatsapp}` | `""` | WhatsApp link (clear invalid values) |
| `{legal,terms,zh-CN}` | `"## 服务条款..."` | Terms of Service (Markdown) |
| `{legal,privacy,zh-CN}` | `"## 隐私政策..."` | Privacy Policy (Markdown) |
| `{currency}` | `"CNY"` | Store currency |
| `{scripts}` | `[{name,code,enabled,position}]` | Frontend injected scripts |
| `{footer_links}` | `[{label,url}]` | Custom footer links |
| `{template_mode}` | `"list"` | Product display mode |

### Update Examples

```sql
-- Update site name
UPDATE settings SET value_json = jsonb_set(
  value_json::jsonb,
  '{brand,site_name}',
  '"NewAPI 中转站"'
) WHERE key = 'site_config';

-- Update SEO title (zh-CN)
UPDATE settings SET value_json = jsonb_set(
  value_json::jsonb,
  '{seo,title,zh-CN}',
  '"NewAPI 中转站 | AI模型API余额兑换商城"'
) WHERE key = 'site_config';

-- Update multiple fields at once (chain jsonb_set)
UPDATE settings SET value_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      value_json::jsonb,
      '{brand,site_name}',
      '"NewAPI 中转站"'
    ),
    '{seo,title,zh-CN}',
    '"NewAPI 中转站 | AI模型API余额兑换商城"'
  ),
  '{seo,keywords,zh-CN}',
  '"API中转站, NewAPI, AI模型充值, 余额兑换, OpenAI, Claude, ChatGPT"'
) WHERE key = 'site_config';
```

### SMTP Config

```json
smtp_config: {
  "enabled": true,
  "from": "no-reply@aklibk.com",
  "from_name": "NewAPI 中转站",  // ← update to match brand
  "host": "mail.aklibk.com",
  "port": 25,
  ...
}
```

## Admin Panel SPA Caveats

1. **Tab switching is unreliable via browser automation** — the Vue `role="tab"` components don't respond to synthetic click events consistently. Use `dispatchEvent(new MouseEvent('click', {bubbles: true}))` as a workaround in browser console, but prefer DB updates.
2. **Save button feedback** — there's no visible toast/success message after saving. Check by refreshing the admin page or inspecting the frontend.
3. **Multi-language tabs** — SEO fields are per-locale (zh-CN, en-US, zh-TW). The "简体中文" button must be active when filling zh-CN fields.

## Nginx Config (1Panel OpenResty)

Files are in `/opt/1panel/apps/openresty/openresty/conf/default/`:

- `shop.conf` — frontend (→ 127.0.0.1:8081)
- `shop-admin.conf` — admin panel (→ 127.0.0.1:8082)
- Both proxy `/api/` and `/uploads/` to backend (127.0.0.1:8080)

## Verification

After updating SEO, verify on the frontend:

```javascript
// In browser console on shop.aklibk.com
document.title                           // Should match SEO title
document.querySelector('meta[name="description"]')?.content
document.querySelector('meta[property="og:title"]')?.content
document.querySelector('meta[property="og:site_name"]')?.content
```

Also check nav bar text and footer description are updated.
