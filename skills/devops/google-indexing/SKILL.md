---
name: google-indexing
description: "Use when the user wants to submit web pages to Google for indexing — either individual URLs or bulk submission via the Google Indexing API. Covers service account setup, Search Console verification, script usage, and quota management."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, seo, google, indexing, search-console]
    related_skills: [cloudflare]
---

# Google Indexing API Submission

## Overview

[Google Indexing API](https://developers.google.com/indexing) lets you notify Google when pages are added, updated, or removed. It's designed for time-sensitive content (blog posts, job listings, live streams) but works for any page where you want faster indexing.

The script at `google_index.py` handles the full workflow: service account auth, URL batch submission, concurrency, error handling, and failure retry.

## When to Use

- User wants to submit new/updated pages to Google for indexing
- User wants to batch-submit URLs from a sitemap or URL list
- User asks about search engine optimization / getting pages indexed faster

## Prerequisites

### One-Time Setup (User does this)

1. **Google Cloud Project** — Go to https://console.cloud.google.com, create or select a project
2. **Enable Indexing API** — Search for "Indexing API" → Enable
3. **Service Account** — IAM & Admin → Service Accounts → Create:
   - Name: `indexing-bot` (or anything)
   - Skip role assignment or assign "Basic > Editor"
   - Keys → Add Key → JSON → Download
4. **Search Console** — https://search.google.com/search-console
   - For EACH domain: Settings → Users and permissions → Add user
   - Add the service account email as **Owner** (full owner, not restricted)

### Script Location

```
/opt/data/workspace/google_index.py
```

## Usage

```bash
# Show setup guide
python3 google_index.py --setup

# Submit URLs from file (one per line)
python3 google_index.py --credentials service-account.json --urls urls.txt

# Submit from sitemap
python3 google_index.py --credentials service-account.json --sitemap https://blog.aklibk.com/sitemap.xml

# Dry run (preview only)
python3 google_index.py --urls urls.txt --dry-run

# Batch mode (first 50 URLs)
python3 google_index.py --urls urls.txt --batch 50

# Concurrent (faster)
python3 google_index.py --urls urls.txt --workers 10

# Mark as deleted (URL removed)
python3 google_index.py --urls removed.txt --type URL_DELETED
```

## Key Parameters

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --credentials` | `service-account.json` | Google service account JSON key file |
| `-u, --urls` | `urls.txt` | URL list file, one per line |
| `-s, --sitemap` | (none) | Fetch URLs from sitemap.xml (overrides --urls) |
| `-t, --type` | `URL_UPDATED` | `URL_UPDATED` or `URL_DELETED` |
| `-w, --workers` | `5` | Concurrent submissions |
| `--batch` | `0` (all) | Limit to N URLs per run |
| `--dry-run` | false | Print URLs without submitting |
| `--setup` | false | Show initial configuration guide |

## Output

Script generates two files after each run:

- `google_index_report_TIMESTAMP.json` — Full JSON report with per-URL results
- `google_index_retry_TIMESTAMP.txt` — Failed URLs for retry

## Quotas

- Default daily limit: **200 URLs** per project
- On 429 errors, the script auto-throttles
- For higher quotas, request via Google Cloud Console

## Cloudflare DNS Note

If the domain uses Cloudflare DNS, do NOT use CNAME verification records for Google/Bing search console — Cloudflare CNAME records may not resolve externally even with DNS-only mode. Always use **TXT record verification** instead. See the `cloudflare` skill pitfall section.

## Pitfalls

1. **Service account must be Owner in Search Console** — Not restricted, not verified, must be full Owner for the Indexing API to work.
2. **Quota resets daily** — No way to force reset. Plan batches accordingly.
3. **URL must be in Search Console** — The Indexing API only works for domains verified in Google Search Console.
4. **403 errors** usually mean the service account lacks Search Console Owner permission for that domain.
