---
name: google-indexing-api
category: seo
description: "Submit URLs to Google Indexing API for faster search indexing — service account setup, Search Console ownership, batch submission scripts, quota management."
tags:
  - google
  - indexing
  - seo
  - search-console
  - batch-submit
triggers:
  - google indexing
  - submit url
  - google收录
  - 提交收录
  - google search console
  - url_notification
  - batch indexing
  - seo submission
---

# Google Indexing API — Batch URL Submission

Submit URLs to Google for rapid indexing. Designed for time-sensitive pages (blog posts, product pages, new content) that need to appear in search results quickly.

## Architecture

```
[URL list / sitemap] → [Google Indexing API] → [Google Search]
                              │
                     OAuth 2.0 JWT
                     (service account)
                              │
              ┌───────────────┴───────────────┐
              │                               │
    Google Cloud Console             Google Search Console
    (create service account)         (add SA as Owner)
```

## One-Time Setup

### Step 1 — Google Cloud Project

1. Open [Google Cloud Console](https://console.cloud.google.com) → Create new project (or select existing)
2. Search for **Indexing API** → Enable it
3. Go to **IAM & Admin → Service Accounts** → Create service account:
   - Name: `indexing-bot` (or anything)
   - Click "Create and Continue"
   - Role: **Basic → Editor** (optional, can skip)
   - Click "Done"

### Step 2 — Download Key

1. Click the newly created service account
2. Go to **Keys** tab → **Add Key** → **Create New Key** → **JSON**
3. Download the JSON file → save as `service-account.json` near the submit script

### Step 3 — Add to Search Console (for EACH domain)

For every domain you want to submit URLs for:

1. Open [Google Search Console](https://search.google.com/search-console)
2. Select the property (domain or URL prefix)
3. Go to **Settings → Users and permissions**
4. Click **Add User**
5. Enter the service account email (e.g. `indexing-bot@your-project.iam.gserviceaccount.com`)
6. Permission: **Owner** (Full — must be Owner, not Restricted)

## API Details

### Endpoint

```
POST https://indexing.googleapis.com/v3/urlNotifications:publish
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "url": "https://example.com/page",
  "type": "URL_UPDATED"
}
```

### Notification Types

| Type | When to Use |
|------|-------------|
| `URL_UPDATED` | Page content changed — request re-indexing |
| `URL_DELETED` | Page removed — request removal from index |

### Authentication

Uses OAuth 2.0 with JWT bearer token from a Google service account.

**Scope**: `https://www.googleapis.com/auth/indexing`

### Quotas

| Tier | Daily Limit | Notes |
|------|-------------|-------|
| Default | 200 URLs/day | Most projects start here |
| Request increase | Up to 10M URLs/day | For news sites and large publishers. Request via Google Cloud quota page. |

- 429 responses = quota exceeded. Spread submissions across the day, or request increase.
- 403 = service account doesn't have Owner permission in Search Console for that domain.

## Batch Submission Script

The script is available as `scripts/google_index.py` — copy it to your working directory and use:

```bash
# Show setup guide
python3 google_index.py --setup

# Dry run (preview without submitting)
python3 google_index.py --credentials service-account.json --urls urls.txt --dry-run

# Submit from file
python3 google_index.py --credentials service-account.json --urls urls.txt

# Submit from sitemap
python3 google_index.py --credentials service-account.json --sitemap https://blog.aklibk.com/sitemap.xml

# Submit in batches (e.g. 50/day to stay under quota)
python3 google_index.py --urls urls.txt --batch 50

# Concurrent for speed
python3 google_index.py --urls urls.txt --workers 10

# Mark deleted URLs
python3 google_index.py --urls removed.txt --type URL_DELETED
```

### URL File Format

Simple — one URL per line:
```
https://blog.aklibk.com
https://blog.aklibk.com/posts/my-new-post
https://shop.aklibk.com/products/123
```

### Sitemap Support

The script auto-extracts all `<loc>` entries from any sitemap.xml. Supports both namespaced and non-namespaced sitemaps.

## When to Use

✅ **Good fit**:
- New blog posts (submit within minutes of publishing)
- Product listing pages that change frequently
- Time-sensitive content (announcements, events)
- Pages that need indexing within hours, not days

❌ **Not for**:
- Bulk submitting thousands of stale pages (won't improve rankings)
- Pages already indexed that haven't changed (waste of quota)
- SEO manipulation (Google penalizes abuse)

## Alternative Paths

If the API setup is too heavy (requires Google Cloud + Search Console owner), alternatives:

| Method | Effort | Speed | Best for |
|--------|--------|-------|----------|
| Indexing API | High | Minutes-Hours | Priority pages, new content |
| Sitemap submission (Search Console) | Low | Days-Weeks | Full site coverage |
| Internal links + social sharing | None | Days-Months | Regular SEO |
| `?` URL Inspection → Request Indexing | Manual | Days-Weeks | Single pages |

## Pitfalls

1. **Service account must be Owner, not Restricted Owner** in Search Console. "Restricted" can't use the API.
2. **403 error** = service account lacks Search Console permission for that domain. Add it, then wait a few minutes.
3. **429 error** = rate-limited. Decrease concurrency or spread submissions across the day.
4. **OAuth token expires after 1 hour** — the script refreshes automatically via `google-auth` library.
5. **URL must be in a Search Console verified property** — every URL's domain must have the service account as Owner.
6. **Multiple domains need separate Search Console verification** — add the SA account as Owner for EACH domain/property.
7. **Indexing API is NOT for ranking improvement** — it only notifies Google about changes. Quality/content determines ranking.
