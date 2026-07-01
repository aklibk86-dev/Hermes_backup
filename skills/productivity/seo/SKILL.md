---
name: seo
category: productivity
description: "SEO and search engine submission for self-hosted sites. Covers sitemap validation, robots.txt configuration, Google Indexing API, Bing verification, and submission to major search engines (Google, Bing, Baidu, Sogou, 360)."
tags:
  - seo
  - search-engine
  - sitemap
  - google
  - bing
  - baidu
  - indexing
  - webmaster
triggers:
  - seo
  - search engine
  - sitemap submission
  - google indexing
  - bing verification
  - 百度收录
  - 搜索引擎提交
  - 站点地图
  - on-page seo
  - site title
  - meta description
  - dujiao seo
  - 商城SEO
---

# SEO & Search Engine Submission

## Overview

Making a self-hosted site discoverable by search engines. Covers both international (Google, Bing, Yandex) and Chinese (Baidu, Sogou, 360, Toutiao) search engines.

## Architecture

```
                      robots.txt
                    (Sitemap declaration)
                           │
              ┌────────────┼────────────┐
              │            │            │
         Google        Bing        Baidu / Sogou / 360
    (Search Console)  (Webmaster)  (站长平台)
              │            │            │
              ▼            ▼            ▼
      Indexing API    XML verify    TXT/CNAME verify
      (service acct)  (BingSiteAuth)  (DNS records)
```

## On-Page SEO Configuration

On-page SEO covers the metadata that lives **on your site** — title tags, meta descriptions, keywords, Open Graph tags, and site branding. Unlike search-engine-facing SEO (sitemaps, verification), on-page config is set inside your application's admin panel or database.

### Common On-Page SEO Fields

| Field | Location | Purpose |
|-------|----------|---------|
| **Site Name / Brand Name** | Admin panel → Branding | Appears in nav bar, footer, `<title>` tag, OG:site_name |
| **Site Description** | Admin panel → Branding | Footer description, may appear in search snippets |
| **Title (SEO)** | Admin panel → SEO | Browser tab title, search result headline |
| **Keywords** | Admin panel → SEO | `<meta name="keywords">` (low SEO weight but used by some engines) |
| **Description (SEO)** | Admin panel → SEO | `<meta name="description">`, used in search snippets |
| **Favicon** | Admin panel → Branding | Browser tab icon |
| **Contact Links** | Admin panel → Contact | Telegram, WhatsApp — validate these, don't leave placeholders |
| **Legal Pages** | Admin panel → Legal/Terms | Privacy Policy, Terms of Service — provide substantive content |
| **Frontend Scripts** | Admin panel → Scripts | Analytics, verification meta tags |

### Admin Panel SPA Caveat

Many modern e-commerce admin panels (Vue.js, React SPAs) use tabbed form layouts where:
- Tab switching may not work via browser automation (Vue `role="tab"` components can be unresponsive to synthetic click events)
- Save buttons may trigger API calls that are invisible to browser snapshots
- Forms may use virtual DOM updates that don't register `type()` events correctly

**Fallback strategy**: When browser-based form editing fails, find and update the database directly:

1. Identify which table stores the site config (often `settings`, `config`, `site_options`)
2. Check if the config is stored as JSON/JSONB — most modern apps use a key-value pattern with JSON values
3. Use `jsonb_set()` (PostgreSQL) or nested JSON update to patch specific fields
4. Verify on the frontend page by refreshing and checking `<title>`, meta tags, and visible text

### Verification Checklist

After updating on-page SEO, verify on the live site:

```html
<title>Check this — should match your SEO title</title>
<meta name="description" content="Check this appears">
<meta property="og:title" content="Check this">
<meta property="og:description" content="Check this">
<meta property="og:site_name" content="Check this">
```

Also check the visible UI: nav bar brand name, footer description, favicon.

### Reference: Dujiao-Next

For Dujiao-Next (shop.aklibk.com / shop-admin.aklibk.com) specific SEO configuration — admin panel URLs, PostgreSQL JSONB schema paths, container layout, and SPA automation workarounds — see `references/dujiao-next-seo.md`.

## Key Knowledge

### Ping APIs Are Deprecated (as of 2026)

Both Google and Bing have deprecated their simple ping APIs:

| Engine | Old API | Current Status | Replacement |
|--------|---------|---------------|-------------|
| Google | `/ping?sitemap=URL` | HTTP 404 (deprecated) | Search Console + robots.txt |
| Bing | `/ping?sitemap=URL` | HTTP 410 (gone) | Webmaster Tools + robots.txt |

**The modern approach** is to declare Sitemap in `robots.txt` and let crawlers discover it naturally:

```
Sitemap: https://yoursite.com/sitemap.xml
```

All major search engines read this during their normal crawl cycle.

### Google Indexing API

For **time-sensitive content** (new blog posts, job listings, live streams), the Google Indexing API can push individual URL update notifications:

- Requires: Google Cloud project + enabled Indexing API + service account JSON key
- Each domain must have the service account email added as **Owner** in Search Console
- Endpoint: `POST https://indexing.googleapis.com/v3/urlNotifications:publish`
- Daily quota: ~200 URLs
- Token scope: `https://www.googleapis.com/auth/indexing`

A ready-to-use script is at `scripts/google-index-submit.py`.

### Bing Domain Verification

Bing offers three verification methods (in order of reliability):

| Method | Reliability with Cloudflare | Notes |
|--------|---------------------------|-------|
| **XML file** (BingSiteAuth.xml) | ✅ Best | Upload to domain root. Works even behind Cloudflare proxy. |
| **TXT record** | ✅ Good | Cloudflare handles TXT records perfectly |
| **CNAME record** | ⚠️ Unreliable | Cloudflare CNAME flattening may prevent public DNS from serving the record. Avoid this method. |

**XML file method** (recommended for SPA sites):
1. Download `BingSiteAuth.xml` from Bing Webmaster Tools
2. Upload to the site root directory so it's accessible at `https://domain.com/BingSiteAuth.xml`
3. For SPA sites behind Nginx/OpenResty, add a specific location block BEFORE the SPA catch-all:
   ```nginx
   location = /BingSiteAuth.xml {
       root /usr/share/nginx/html;
   }
   ```

### Multi-Engine Submission

Complete workflow similar for all engines:

1. Verify domain ownership (DNS record or file upload)
2. Add site to the search engine's webmaster platform
3. Submit sitemap URL
4. Wait for crawl (or use push APIs for time-sensitive content)

| Engine | Platform | Verification | Sitemap Submission |
|--------|----------|-------------|-------------------|
| Google | Search Console | Domain TXT / DNS | Sitemaps section |
| Bing | Webmaster Tools | XML file / TXT / CNAME | Sitemaps section |
| Baidu | 站长沙龙 (ziyuan.baidu.com) | TXT / CNAME / HTML file | 数据引入 → 站点地图 |
| Sogou | 站长平台 (zhanzhang.sogou.com) | TXT / CNAME | 站点地图提交 |
| 360 | 站长平台 (zhanzhang.so.com) | TXT / CNAME | 站点管理 |
| Toutiao | 站长平台 | TXT / CNAME | 站点地图提交 |

### robots.txt Guidelines

- Allow major search engines, block known AI crawlers (GPTBot, ClaudeBot, Applebot-Extended, etc.)
- Disallow non-public paths (`/admin/`, `/api/`, `/auth/`, `/checkout`, etc.)
- Declare Sitemap at the bottom of the file
- Cloudflare automatically manages AI crawler blocking (via "Cloudflare Managed Content" section)

## Associated Scripts

- `scripts/google-index-submit.py` — Google Indexing API batch submit tool
- `scripts/sitemap-submit-all.py` — Multi-engine sitemap submission helper

## Pitfalls

1. **Google/Bing ping APIs no longer work** — HTTP 404/410. Don't attempt them.
2. **CNAME records for Bing verification fail with Cloudflare** — Cloudflare's CNAME flattening (`flatten_at_root`) prevents the CNAME from being served as-is. Use XML file or TXT record instead.
3. **Old ping APIs return success-lookalike pages** — Some providers return HTTP 200 with an error page. Always verify the content/body.
4. **Chinese search engines require separate verification** for each domain. You cannot import from Google Search Console.
5. **SPA sites need special handling** for verification files — the Nginx `location = /` exact match must come before the SPA catch-all `location /` block.
