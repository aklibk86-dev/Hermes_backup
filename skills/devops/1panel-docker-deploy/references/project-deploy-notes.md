# Project-Specific Deployment Notes

## QuantumNous/new-api

- Image: calciumion/new-api:latest
- Default port: 3000
- Admin: first-run guided setup (no default admin)
- Requires PostgreSQL + Redis
- Set SESSION_SECRET and CRYPTO_SECRET via env vars (openssl rand -hex 32)
- Health check: GET /api/status returns {"success":true,...}
- Default compose file: https://raw.githubusercontent.com/QuantumNous/new-api/main/docker-compose.yml
- Bind to 127.0.0.1:3000:3000

## Dujiao-Next (dujiao-next/dujiao-next)

- 3 containers: api (8080), user (8081 SPA), admin (8082 SPA)
- SQLite or PostgreSQL + Redis
- Config: /app/config.yml mounted as volume
- Default admin: DJ_DEFAULT_ADMIN_USERNAME / DJ_DEFAULT_ADMIN_PASSWORD env vars
- Nginx must proxy /api/ and /uploads/ to API backend for both frontends
- User frontend also needs /sitemap.xml and /robots.txt proxied to API backend (SEO)
- Official docs: https://dujiao-next.com/
- Default compose: See docs site for docker-compose.postgres.yml template
- Bind API to 127.0.0.1:8080, User to 127.0.0.1:8081, Admin to 127.0.0.1:8082

## weishaw/sub2api

- Image: `weishaw/sub2api:latest`
- Auto-setup via env vars (AUTO_SETUP=true) — runs once per data directory, creates `.installed` lock
- ADMIN_EMAIL / ADMIN_PASSWORD env vars for first admin account
- Health: GET /api/v1/health returns 200
- Login: POST /api/v1/auth/login with `{"email":"...","password":"..."}`
- Runs on port 8080 internal, map to 127.0.0.1:PORT on host
- Uses `BIND_HOST=127.0.0.1 SERVER_PORT=<port>` in .env
- **Typical deployment**: 3 containers (sub2api + postgres + redis)
- **Deployment script**: `docker-deploy.sh` from GitHub — downloads `docker-compose.local.yml` and `.env.example`, generates POSTGRES_PASSWORD/JWT_SECRET/TOTP_ENCRYPTION_KEY via `openssl rand -hex 32`
  ```bash
  curl -sSL https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/deploy/docker-deploy.sh | bash
  ```
- **After deploy**:
  ```bash
  # Customize .env — bind to localhost only
  sed -i 's/BIND_HOST=0.0.0.0/BIND_HOST=127.0.0.1/' .env
  
  # Set admin credentials (use alphanumeric only — no ! or special chars through SSH)
  echo 'ADMIN_EMAIL=admin@sub2api.local' >> .env
  echo 'ADMIN_PASSWORD=Sub2api2024' >> .env
  
  # Start
  docker compose up -d
  ```
- **Config persistence**: Data at `./data/config.yaml`, pricing cache at `./data/model_pricing.json`  
- **Admin credentials**: Set via .env before first `up -d`. If password was wrong on first run, must wipe data and re-deploy:
  ```bash
  docker compose down -v
  rm -rf data/ postgres_data/ redis_data/
  mkdir -p data postgres_data redis_data
  # fix .env FIRST, then run:
  docker compose up -d
  ```
- **Check admin password from logs**: `docker compose logs sub2api | grep -i "admin password"` — setup auto-generates one if ADMIN_PASSWORD is empty
- **Port conflicts**: In this environment, 8080 is used by Dujiao-Next API and 8082 by Dujiao-Next Admin. Use 8088 as the host port.
- **Login test**: `curl -s -X POST "http://127.0.0.1:8088/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@sub2api.local","password":"Sub2api2024"}'` returns `{"code":0,"message":"success","data":{"access_token":"..."}}`

## cedar2025/Xboard (1Panel Deployment)

- Deployment method: 1Panel site + Docker Compose (not standalone docker-compose)
- **Official docs**: https://github.com/cedar2025/Xboard/blob/master/docs/en/installation/1panel.md
- **1Panel site dir**: `/opt/1panel/apps/openresty/openresty/www/sites/<name>/index/`
- **Image**: `ghcr.io/cedar2025/xboard:latest`
- **Port**: 127.0.0.1:7001
- **Database**: MySQL 5.7 or MariaDB 10.11+ on `1panel-network`
- **Compose template**: `compose.1panel.sample.yaml` (must join `1panel-network`)
- **Installation**: `docker compose run --rm xboard php artisan xboard:install`
- **Start**: `docker compose up -d`
- **Admin panel**: `/random_hex_path` (generated during install)
- **Default admin email**: `admin@demo.com`
- **Admin password**: Random 32-char hex string (generated during install)
- **Port fix**: After install, edit compose.yaml to bind `"127.0.0.1:7001:7001"`, then `docker compose down && docker compose up -d`
- **Nginx config**: `/opt/1panel/www/conf.d/xboard.conf` with proxy_pass to 127.0.0.1:7001
- **DB notes**: `mariadb:10.11` works better than `mysql:5.7` (mysql:5.7 has password env var issues). Use `--network 1panel-network` for both DB and app containers.
- **Auto-update on boot**: Container runs `php artisan xboard:update` on every start (since 2026-04-19). Older compose templates need manual `docker compose run --rm web php artisan xboard:update`.
- **SQLite DB location** (default): `/www/.docker/.data/database.sqlite` inside container
- **Node debugging**: See `references/xboard-node-debugging.md` for SQLite-based node troubleshooting

## louislam/uptime-kuma

- Image: `louislam/uptime-kuma:latest` — ⚠️ BUT verify real latest via Docker Hub API first. `latest` tag was 1.23.17 while actual latest was 2.4.0
- Port: 127.0.0.1:3003 -> 3001
- Storage: named volume `uptime-kuma-data` at /app/data
- Docker run: `docker run -d --name uptime-kuma --restart unless-stopped -p 127.0.0.1:3003:3001 -v uptime-kuma-data:/app/data louislam/uptime-kuma:latest`
- Initial setup: First visit creates admin account (no default creds)
- Web UI: Root URL redirects to /dashboard
- Health check: Container self-reports "(healthy)" via Docker
- Nginx config: Standard reverse proxy with WebSocket support (proxy_set_header Upgrade/Connection) — needed for real-time monitoring updates
- No external database needed — built-in SQLite

- ## Komari Monitor (komari-monitor/komari)

- Image: `ghcr.io/komari-monitor/komari:latest`
- Port: 25774
- Database: SQLite (built-in, at /app/data/komari.db)
- Docker run: `docker run -d --name komari --restart unless-stopped -p 127.0.0.1:25774:25774 -v /opt/komari/data:/app/data ghcr.io/komari-monitor/komari:latest`
- Admin account: Set via `-e ADMIN_USERNAME=... -e ADMIN_PASSWORD=...` env vars on docker run
- Default admin (if env vars not honored): shown in `docker logs komari` as `Username: admin, Password: <generated>`
- Admin panel: At the root URL (no /admin prefix)
- SQLite file: /app/data/komari.db (persisted via volume mount)
- Official docs: https://www.komari.wiki/install/docker.html
- Nginx config: Standard reverse proxy for `/opt/1panel/www/conf.d/komari.conf` to 127.0.0.1:25774
- No external database needed — fully self-contained with SQLite

## mendableai/firecrawl

- **Repo**: https://github.com/mendableai/firecrawl
- **Self-host docs**: `SELF_HOST.md` in repo
- **Deployment method**: Docker Compose (6 containers)
- **Port**: 127.0.0.1:3002 (internal ${INTERNAL_PORT:-3002})
- **Containers**: api, redis, rabbitmq, nuq-postgres, foundationdb, playwright-service
- **Config**: `.env` at project root:
  - `USE_DB_AUTHENTICATION=*** — disables DB-backed auth (open API)
  - `AUTUMN_SECRET_KEY` — enables auth from Autumn middleware
  - `BULL_AUTH_KEY` — Bull board auth key (optional)
- **Clone**: `git clone https://github.com/mendableai/firecrawl.git /opt/firecrawl`
- **Health check**: POST `/v1/scrape` with `{"url":"http://example.com","formats":["markdown"]}` — returns 200 (no GET /health endpoint)
- **API test**: `curl -s http://127.0.0.1:3002/v1/scrape -X POST -H 'Content-Type: application/json' -d '{"url":"https://httpbin.org/ip","formats":["markdown"]}'`
- **Port binding fix**: Default compose binds to 0.0.0.0. Patch to 127.0.0.1:
  ```bash
  sed -i 's|"${PORT:-3002}:${INTERNAL_PORT:-3002}"|"127.0.0.1:${PORT:-3002}:${INTERNAL_PORT:-3002}"|' docker-compose.yaml
  docker compose down && docker compose up -d  # restart is not enough
  ```
- **Startup time**: ~15-20s (FoundationDB + rabbitmq health check)
- **Memory**: ~1-2 GB total (playwright-service is heaviest)
- **DNS**: `scrape.domain.com` → Nginx proxy → 127.0.0.1:3002
