---
name: api-relay-management
category: devops
description: Manage self-hosted AI API relay stations (New-API / one-api / etc.) — Docker-based deployment, pricing configuration, group rate adjustment, PostgreSQL DB operations, admin panel navigation, market pricing strategy, and 闲鱼 listing copy.
tags: [new-api, one-api, relay, api-gateway, pricing, group-rates, postgres]
triggers:
  - "修改中转站倍率"
  - "设置API中转站价格"
  - "配置New-API用户组"
  - "修改中转站充值额度"
  - "调整AI中转站定价"
  - "中转站倍率配置"
  - "New-API group rate"
  - "api relay pricing"
---

# API Relay Station Management

Manage self-hosted AI API relay stations (New-API / one-api). Covers group rate configuration, pricing strategy, and PostgreSQL-backed settings modification.

## Architecture Overview

A typical New-API relay has three Docker containers:
- **new-api**: the main app (port 3000, behind 1Panel OpenResty)
- **new-api-postgres**: PostgreSQL 15+ for persistent data
- **new-api-redis**: Redis for caching

Key database table: `options` — a key-value store for system configuration. All pricing, ratios, and settings are JSON blobs in this table.

## Two Separate Rate Multipliers

New-API has TWO distinct rate settings that affect user pricing:

### 1. TopupGroupRatio (充值倍率) — stored in DB `options` table
- Controls how many credits users get when topping up
- Format: JSON `{"group_name": multiplier}` e.g., `{"default": 1.5, "vip": 1.0}`
- Example: user tops up $20 → with multiplier 1.5 → gets $30 credits
- **Modified via: direct PostgreSQL UPDATE** (no UI for this)

### 2. Group Ratio (消费倍率) — stored in DB, modified via UI
- Controls the billing multiplier when users consume tokens
- Shown as "Ratio" in System → Group & Model Pricing → Group Related Settings
- Modified via: web UI spinbutton (Visual editing mode auto-saves)
- Example: if model costs $1 and group ratio=1.5, user pays $1.50

## Finding Database Credentials

```bash
# Get PostgreSQL env vars
docker exec new-api-postgres printenv | grep -E '^POSTGRES'

# Typical output:
# POSTGRES_DB=new-api
# POSTGRES_USER=newapi
# POSTGRES_PASSWORD=xxxxxxxx...xxxx
```

## Querying Configuration

```bash
# List all option keys
docker exec -e PGPASSWORD=xxx new-api-postgres psql -U newapi -d new-api -t -A -c "SELECT key FROM options ORDER BY key"

# Get TopupGroupRatio
docker exec -e PGPASSWORD=xxx new-api-postgres psql -U newapi -d new-api -t -A -c "SELECT value FROM options WHERE key = 'TopupGroupRatio'"

# Get ModelRatio (per-model pricing — typically very large JSON)
docker exec -e PGPASSWORD=xxx new-api-postgres psql -U newapi -d new-api -t -A -c "SELECT key, substr(value, 1, 200) FROM options WHERE key = 'ModelRatio'"
```

## Modifying TopupGroupRatio via PostgreSQL

```bash
# Update TopupGroupRatio for default group
docker exec -i new-api-postgres psql -U newapi -d new-api -c "UPDATE options SET value = '{\"default\": 1.5, \"svip\": 1, \"vip\": 1.5}' WHERE key = 'TopupGroupRatio'"
```

After DB changes, restart New-API to apply:
```bash
docker restart new-api
```

## Modifying Group Ratio via UI

1. Navigate to Console → System → Group & Model Pricing tab
2. Click "Group Related Settings" sub-tab
3. Ensure "Visual editing" radio is selected
4. Click the spinbutton in the "Ratio" column for the desired group
5. Type the new value (e.g., 1.5)
6. The change auto-saves when "Visual editing" is active

**Note:** UI Ratio changes to NOT require a container restart (they persist immediately via API).

## Pricing Math

Given upstream cost: X元 = Y刀 (e.g., 10元 = 20刀 → 0.5元/$1)

### Profitability formula:
- **Cost per $1 of upstream tokens**: X/Y 元
- **User gets**: topup_amount × (base_credits) × TopupGroupRatio
- **User consumes**: upstream_cost × ModelRatio × GroupRatio

To break even: TopupGroupRatio × GroupRatio ≥ 1.0 (with ModelRatio=1.0)
To profit: TopupGroupRatio × GroupRatio > 1.0

### Example:
- Upstream: 10元 = $20 (0.5元 cost per $1)
- TopupGroupRatio = 1.5, GroupRatio = 1.5
- User pays 10元 → gets $20 × 1.5 = $30 credits
- User consumes at 1.5x rate → effectively uses $20 upstream
- Your cost = $20 × 0.5 = 10元 → breakeven

## Sub2API Support

Sub2API (https://github.com/Wei-Shaw/sub2api) is an alternative AI API gateway platform built with Go + Vue. It supports subscription quota distribution for Claude, OpenAI, Gemini, and other providers.

### Docker Deployment

Use the project's automated Docker deployment script:

```bash
# On the VPS
mkdir -p /opt/sub2api-deploy && cd /opt/sub2api-deploy
curl -sSL https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/deploy/docker-deploy.sh | bash
```

The script downloads `docker-compose.yml`, `.env.example`, and generates secure secrets for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `TOTP_ENCRYPTION_KEY`.

### Key Configuration (.env)

```bash
# Security: bind to loopback only (do NOT expose to 0.0.0.0)
BIND_HOST=127.0.0.1
SERVER_PORT=8088

# Admin credentials (set BEFORE first run — auto-setup only fires once)
ADMIN_EMAIL=admin@domain.tld
ADMIN_PASSWORD=<random-alphanumeric>
```

**⚠️ Password pitfall**: Do NOT use `!` in the password — bash interprets it as history expansion in heredocs passed through SSH. Use only alphanumeric chars (`openssl rand -hex 16`).

### Auto-Setup Sequence

On first run, `AUTO_SETUP=true` triggers a one-time init that:
1. Tests and initializes the PostgreSQL database
2. Tests and initializes Redis
3. Creates the admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars
4. Downloads model pricing data (~199 models) from the official pricing repo
5. Writes a `.installed` lock file in the data directory

**Fixing a mangled first-run setup**: If the admin password was corrupted on first run (e.g., due to `!` truncation), you must fully reset:

```bash
cd /opt/sub2api-deploy
docker compose down -v
rm -rf data/ postgres_data/ redis_data/
mkdir data postgres_data redis_data
# Fix .env with correct password first, then:
docker compose up -d
```

### 1Panel OpenResty Reverse Proxy

Create `/opt/1panel/apps/openresty/openresty/conf/default/sub2api.conf`:

```nginx
server {
    listen 80;
    server_name sub2api.yourdomain.com;
    client_max_body_size 100m;
    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then reload OpenResty:
```bash
docker exec 1Panel-openresty-qMxV nginx -t && docker exec 1Panel-openresty-qMxV nginx -s reload
```

Set Cloudflare SSL to "Flexible" since the origin has no TLS (port 80 only).

### Admin Dashboard

- **URL**: `https://sub2api.yourdomain.com`
- **Login**: email/password (from `.env`)
- **First-time**: must accept the Compliance Acknowledgment dialog before accessing the dashboard

### Sub2API vs New-API Full Comparison

| Feature | New-API | Sub2API |
|---------|---------|---------|
| GitHub | github.com/QuantumNous/new-api | github.com/Wei-Shaw/sub2api |
| Stars | 40.4k ⭐ | 29.4k ⭐ |
| Version | v1.0.0-rc.14 | v0.1.139 |
| Language | Go | Go 1.25 + Vue 3 |
| Database | SQLite/MySQL/PostgreSQL | PostgreSQL 15+ |
| Cache | Optional | Redis 7+ |
| **Core Purpose** | LLM gateway + AI asset management | Subscription quota distribution |
| **Data source** | API Key (OpenAI/Claude/DeepSeek etc.) | Subscription accounts (Claude Pro/Team, Gemini) |
| **30+ Provider aggregation** | ✅ | ❌ |
| **Subscription sharing** | ❌ | ✅ (core feature) |
| **Protocol conversion** | ✅ (OpenAI ↔ Claude ↔ Gemini) | ❌ |
| **Smart routing / failover** | ✅ (weighted random, auto-retry) | ❌ |
| **Midjourney/Suno support** | ✅ | ❌ |
| **Multi-modal (image/audio/video)** | ✅ | ❌ |
| **Cache billing** | ✅ (OpenAI/DeepSeek/Claude) | ❌ |
| **Alipay/WeChat Pay** | ❌ | ✅ (built-in) |
| **Stripe** | ✅ | ✅ |
| **OAuth login** | ✅ (Discord/LinuxDO/Telegram/OIDC) | ❌ |
| **Sticky sessions** | ❌ | ✅ |
| **Concurrency control** | Global level | ✅ Per-user + per-account fine-grained |
| **iframe integration** | ❌ | ✅ |
| **Maturity** | Highly mature (6000+ commits) | Rapid iteration (4000+ commits) |

## Important Options Keys (New-API)

| Key | Purpose | Format |
|-----|---------|--------|
| `TopupGroupRatio` | Credit multiplier on top-up | JSON `{"group": value}` |
| `ModelRatio` | Per-model pricing multiplier | Large JSON mapping model→ratio |
| `ModelPrice` | Per-model base prices | JSON |
| `Chats` | Model availability flags | JSON |
| `DefaultUseAutoGroup` | Auto-assign group flag | string |

## Front-end / Back-end Separation

New-API has **two frontend themes** embedded into the Go binary via `go:embed`:

| Theme | Path | Tech Stack |
|-------|------|------------|
| default (modern) | `web/default/` | React 19 + TanStack Router + TailwindCSS + @base-ui + rsbuild |
| classic (legacy) | `web/classic/` | React 19 + Semi UI + rsbuild |

### Build Flow

```
web/default/src/ (React source)
  → bun run build (rsbuild)
web/default/dist/ (compiled output)
  → go:embed into binary
Go binary → Docker container → serves embedded SPA
```

### Separation via FRONTEND_BASE_URL

Set the env var in docker-compose to serve frontend independently:

```yaml
environment:
  - FRONTEND_BASE_URL=https://your-frontend-domain.com
```

When set, New-API:
- Stops loading WebRouter entirely
- Redirects all non-API paths (`/v1/*`, `/api/*` excepted) to the frontend URL
- Operates in pure API mode

### Customization Approaches

| Approach | Effort | Description |
|----------|--------|-------------|
| Fork + rebuild | Medium | Fork repo, modify `web/default/src/`, rebuild Docker image |
| Nginx proxy + standalone frontend | High | Write independent frontend, proxy API calls through Nginx |
| FRONTEND_BASE_URL only | Low | Just set env var, point to externally-hosted frontend |

## REST API Overview

New-API exposes a comprehensive REST API (~150+ endpoints) across these categories:

| Category | Base Path | Auth |
|----------|-----------|------|
| Public status | `/api/status`, `/api/notice` | None |
| User auth | `/api/user/login`, `/api/user/register` | Rate-limited |
| Self-service | `/api/user/self/*`, `/api/user/token/*` | UserAuth |
| Admin mgmt | `/api/user/`, `/api/token/`, `/api/channel/` | AdminAuth |
| System settings | `/api/option/`, `/api/models/` | AdminAuth |
| Payments | `/api/stripe/webhook`, `/api/user/pay` | Webhook/UserAuth |
| Subscriptions | `/api/subscription/plans` | UserAuth |
| Logs | `/api/log/`, `/api/log/self/` | AdminAuth/UserAuth |
| **AI Model API** | `/v1/chat/completions`, `/v1/models`, etc. | TokenAuth |
| Claude API | `/v1/messages` | TokenAuth |
| Gemini API | `/v1beta/models/*path` | TokenAuth |
| Midjourney | `/mj/submit/*` | TokenAuth |
| Video gen | `/v1/video/generations`, `/kling/v1/videos/*` | TokenAuth |
| Dashboard | `/dashboard/billing/*` | TokenAuth |

See `references/new-api-rest-api.md` for the full endpoint catalog.
## Reference Files

| File | Contents |
|------|----------|
| `references/market-pricing-and-listings.md` | Official model prices, 闲鱼 market pricing, pricing strategy, and listing copy templates for selling API relay services (absorbed from `ai-api-relay` skill) |
| `references/new-api-group-rate-modification.md` | Step-by-step for modifying New-API group rates |
| `references/new-api-rest-api.md` | Full ~150-endpoint REST API catalog for New-API, categorized by auth level and function |
| `references/new-api-frontend-dev.md` | New-API frontend architecture, REST API overview, development approaches, recommended tech stack, and phased development plan |
| `references/new-api-database-schema.md` | New-API PostgreSQL database schema — users, tokens, logs, channels tables with column types and key queries |
| `templates/docker-compose.yml` | Standard New-API deployment with PostgreSQL + Redis; save to /opt/new-api/ and `docker compose up -d` |

## AI-Driven Development Workflow

When the user wants a custom frontend or feature built for New-API, use this zero-hands-on-user approach:

1. **Scaffold** — Create Vite + React + TypeScript project with Tailwind, shadcn/ui, routing, API client
2. **Deploy scaffold** — Copy to Nginx serve dir, configure reverse proxy, set `FRONTEND_BASE_URL` on New-API
3. **Parallel page generation** — Use `delegate_task` to spawn sub-agents for independent page modules (Token mgmt, user list, channel settings, etc.)
4. **Integration** — Wire all pages into router, handle auth flow, fix integration issues
5. **Deploy** — Build, deploy to Nginx, verify
6. **User reviews** — Present URL; user gives feedback; iterate

User involvement: ~1 hour total (tell me what to build + approve results).

## Pitfalls

- **FRONTEND_BASE_URL is IGNORED on the master node.** The code silently clears it: `if common.IsMasterNode && frontendBaseUrl != "" { frontendBaseUrl = "" }`. A single-node or default deployment IS the master node. To use a custom frontend URL, you must disable master node mode or run a dedicated slave node with `NODE_NAME` configured as non-master.
- **TopupGroupRatio and Group Ratio are DIFFERENT settings.** Changing one does not affect the other. If you only change TopupGroupRatio without adjusting GroupRatio (or vice versa), the pricing won't be what you expect.
- **After DB changes, restart the container.** The app caches options in memory.
- **The UI "Ratio" spinbutton resets to 1 on page reload** if not saved properly. Ensure "Visual editing" is checked when typing the value — this triggers the API save.
- **ModelRatio is 76K+ chars** — don't try to read it all in the terminal. Use `substr()` to sample it.
- **Password is bcrypt hashed.** You cannot read or guess it from the DB. Reset via DB if needed, or use a bcrypt generator.
- **New-API login errors say "Username or password is incorrect, or user has been banned"** — try both username and email in the login field.
