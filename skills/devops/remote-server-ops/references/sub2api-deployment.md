# Sub2API Docker Compose Deployment

Deploy [sub2api](https://github.com/Wei-Shaw/sub2api) — an AI API gateway platform with subscription quota distribution.

## Prerequisites

- Docker 20.10+ with Compose v2
- Cloudflare zone with API key
- VPS with 1Panel OpenResty (or other reverse proxy)

## Deployment Steps

### 1. Prepare Directory

```bash
mkdir -p /opt/sub2api
cd /opt/sub2api
```

### 2. Download Compose File

```bash
curl -sSL -o docker-compose.yml 'https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/deploy/docker-compose.yml'
```

The full compose file includes PostgreSQL and Redis containers alongside the sub2api app.

### 3. Configure `.env`

```bash
cat > .env << 'ENVEOF'
BIND_HOST=127.0.0.1
SERVER_PORT=8080
SERVER_MODE=release
POSTGRES_USER=sub2api
POSTGRES_PASSWORD=sub2api_secure_pw_2026
POSTGRES_DB=sub2api
REDIS_PASSWORD=sub2api_redis_pw_2026
ADMIN_EMAIL=admin@sub2api.local
ADMIN_PASSWORD=admin123456
JWT_SECRET=sub2api_jwt_secret_32bytes_xxxxxxxxxxxxx
TOTP_ENCRYPTION_KEY=6162636465666768696a6b6c6d6e6f707172737475767778797a303132333435
TZ=Asia/Shanghai
ENVEOF
```

**Critical config quirks:**
- `JWT_SECRET` must be **at least 32 bytes** — shorter values cause startup failure with error: `jwt.secret must be at least 32 bytes`
- `TOTP_ENCRYPTION_KEY` must be a **hex string** (not arbitrary text) — the application calls `encoding/hex.DecodeString()` on it. Non-hex values cause: `invalid totp encryption key: encoding/hex: invalid byte`
- Generate a proper hex key: `openssl rand -hex 32` → produces 64 hex chars
- `POSTGRES_PASSWORD` and `REDIS_PASSWORD` must be set (no default)
- `BIND_HOST=127.0.0.1` for 1Panel environments (access via reverse proxy only)

### 4. Fix Image Name

The default compose file references `sub2api:latest` which doesn't exist on Docker Hub. Fix it:

```bash
sed -i 's|image: sub2api:latest|image: weishaw/sub2api:latest|' /opt/sub2api/docker-compose.yml
```

### 5. Start Services

```bash
cd /opt/sub2api
docker compose pull   # may take a few minutes on first run
docker compose up -d
```

### 6. Verify

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep sub2api
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/
```

Expected output: all 3 containers `Up (healthy)`, HTTP `200`.

### 7. 1Panel OpenResty Reverse Proxy

Create `/opt/1panel/www/conf.d/sub2api.aklibk.com.conf`:

```nginx
server {
    listen 80;
    server_name sub2api.aklibk.com;
    charset utf-8;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        client_max_body_size 100m;
    }
}
```

```bash
docker exec 1Panel-openresty-z6Pg nginx -t
docker exec 1Panel-openresty-z6Pg nginx -s reload
```

### 8. Cloudflare DNS

Add A record: `sub2api → ORIGIN_IP` (proxied=true).

If the record shows `proxied: true` in API but DNS still resolves to origin IP (not Cloudflare), delete and recreate the record (toggling proxy won't work).

### 9. Access

URL: `https://sub2api.aklibk.com`
Default admin: `admin@sub2api.local` / `admin123456`

## Troubleshooting

### Container restarts with "jwt.secret must be at least 32 bytes"

The `JWT_SECRET` in `.env` is too short. Must be 32+ characters. After fixing `.env`:
```bash
docker compose up -d
```

### Container restarts with "invalid totp encryption key: encoding/hex: invalid byte"

The `TOTP_ENCRYPTION_KEY` is not a valid hex string. Generate one:
```bash
openssl rand -hex 32
```
Then update `.env` and recreate: `docker compose up -d`.

### Container keeps restarting but no useful logs

Check the logs before they scroll away:
```bash
docker logs sub2api --tail 30 2>&1
```
The error is usually in the first few lines of each restart cycle.
