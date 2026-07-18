# Dujiao-Next Deployment (Docker Compose)

Dujiao-Next is a digital goods sales and delivery platform. Deploy via Docker Compose with SQLite + Redis (simpler) or PostgreSQL + Redis (production).

## Quick Deploy (SQLite + Redis)

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis}
cd /opt/dujiao-next
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis
curl -sL -o ./config/config.yml https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example
```

## Configuration

### .env file (`/opt/dujiao-next/.env`)

```
TAG=latest
TZ=Asia/Shanghai
API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123456
REDIS_PASSWORD=dujiao_redis_pw_2026
```

### config.yml — modify database/redis sections

```yaml
database:
  driver: sqlite
  dsn: /app/db/dujiao.db
redis:
  enabled: true
  host: redis
  port: 6379
  password: dujiao_redis_pw_2026
  db: 0
  prefix: "dj"
queue:
  enabled: true
  host: redis
  port: 6379
  password: dujiao_redis_pw_2026
  db: 1
```

### docker-compose.yml

Uses images: `dujiaonext/api:${TAG}`, `dujiaonext/user:${TAG}`, `dujiaonext/admin:${TAG}`.
All ports bound to `127.0.0.1` behind Nginx. Redis requires `REDIS_PASSWORD`.

## Nginx (1Panel OpenResty)

**User** (`dujiao.aklibk.com` → `127.0.0.1:8081`):
- Proxy `/` → user, `/api/` and `/uploads/` → API
- Requires `/sitemap.xml` and `/robots.txt` → API

**Admin** (`dujiao-admin.aklibk.com` → `127.0.0.1:8082`):
- Proxy `/` → admin, `/api/` and `/uploads/` → API
- Use flat subdomains (e.g. `dujiao-admin`) — Cloudflare cert does NOT cover multi-level subdomains like `admin.dujiao.aklibk.com`

## Nginx API Prefix Rewrite (Critical)

The admin and user frontends call API routes with an `/api/` prefix (e.g. `/api/v1/auth/login`), but the DuJiao API backend serves routes at the **root level** (e.g. `/v1/auth/login`). The Nginx `/api/` location block **must** strip the prefix:

```nginx
location /api/ {
    rewrite ^/api/(.*) /$1 break;        # strip /api/ prefix
    proxy_pass http://127.0.0.1:8080;     # passes /v1/auth/login to API
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Without this `rewrite`, the frontend gets `404 page not found` on every API call. Verify with:

```bash
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/v1/auth/login       # should return 4XX (endpoint exists)
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/v1/auth/login   # should return 404 without rewrite
```

## Bootstrap Admin User

The admin user is created on **first startup only**. Credentials come from `config.yml` bootstrap:

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_email: admin@dujiao.com
  default_admin_password: admin123456
```

If admin wasn't created, delete the SQLite DB (`rm -f data/db/dujiao.db`) and restart.

## Known Issues

| Issue | Symptom | Fix |
|---|---|---|
| Docker DNS app internal | API can't resolve `redis` by container name | Setting custom DNS in daemon.json overrides Docker's internal DNS (127.0.0.11). Fix: `echo '{}' > /etc/docker/daemon.json && systemctl restart docker`, then recreate containers. Only set external DNS if internal resolution isn't needed. |
| Port conflict | User/Admin stay "Created" | `docker rm -f $(docker ps -aq --filter name=dujiao)` then `docker compose up -d --remove-orphans` |
| Depends_on stall | User/Admin stuck while API healthy | Workaround: `docker start dujiaonext-user dujiaonext-admin` |
| SSL handshake failure | `admin.dujiao.aklibk.com` TLS error | Cloudflare universal SSL doesn't cover multi-level subdomains. Use flat subdomain: `dujiao-admin.aklibk.com` |
| Cloudflare redirect loop | 308 redirect to same URL after Vercel setup | Set Cloudflare SSL to **Full** (not Flexible). Flexible makes Vercel redirect HTTP→HTTPS in a loop. `curl -s -X PATCH ... -d '{"value":"full"}'` |
| Vercel cert fails behind proxy | `Error: Response Error` during alias set | Disable Cloudflare proxy (grey cloud) → let Vercel issue cert → re-enable proxy → set SSL to Full |

## Default Admin

`admin` / `admin123456` (overridable via `.env`)
