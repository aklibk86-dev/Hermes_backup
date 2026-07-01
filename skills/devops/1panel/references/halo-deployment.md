# Halo Blog Deployment

## Overview

Deploy Halo (open-source Java blog system) as a Docker container behind 1Panel's OpenResty with Cloudflare SSL.

## Version Discovery (Critical)

| Tag | Resolves to | Notes |
|-----|-------------|-------|
| `halohub/halo:latest` | **Halo 1.6.1** (old) | Users do NOT want this — it's the deprecated 1.x branch |
| `halohub/halo:2` | **Halo 2.25.3** (current) | The correct tag for a modern install |
| `halohub/halo:2.25.3` | Specific 2.x version | Pin for reproducibility |

**⚠️ Critical pitfall**: `halohub/halo:latest` points to Halo 1.x, not the latest. Always use `halohub/halo:2` for a new deployment. If the user says "latest" or doesn't specify, ask or default to `:2`.

## Halo 1.x vs 2.x Differences

| Aspect | Halo 1.x | Halo 2.x |
|--------|----------|----------|
| Docker tag | `halohub/halo` (no suffix) | `halohub/halo:2` |
| Web server | Jetty | Netty (WebFlux/Reactive) |
| Admin path | `/admin` | `/console` |
| Java version | 11 | 17+ |
| Data dir | `~/.halo` | `~/.halo2` |
| Config file | `~/.halo/application.yaml` | `~/.halo2/config/application.yaml` |
| Image size | ~550MB | ~807MB |
| Theme system | Built-in themes | Plugin-based themes |
| First-run | Setup wizard at `/admin` | Setup wizard at `/console` |

## Docker Deployment

### Minimal (H2 embedded database)

```bash
docker run -d \
  --name halo \
  --restart unless-stopped \
  -p 40034:8090 \
  -v /opt/halo:/root/.halo2 \
  -e HALO_WORK_DIR=/root/.halo2 \
  halohub/halo:2
```

### With external PostgreSQL (recommended for production)

```bash
# 1. Create a PostgreSQL database and user first
docker exec 1Panel-postgresql-XXXX psql -U postgres -c \
  "CREATE DATABASE halo;"
docker exec 1Panel-postgresql-XXXX psql -U postgres -c \
  "CREATE USER halo WITH PASSWORD 'your-password';"
docker exec 1Panel-postgresql-XXXX psql -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE halo TO halo;"

# 2. Run Halo with PostgreSQL
docker run -d \
  --name halo \
  --restart unless-stopped \
  -p 40034:8090 \
  -v /opt/halo:/root/.halo2 \
  -e HALO_WORK_DIR=/root/.halo2 \
  -e SPRAMG_DATASOURCE_URL="jdbc:postgresql://host.docker.internal:5432/halo" \
  -e SPRAMG_DATASOURCE_USERNAME=halo \
  -e SPRAMG_DATASOURCE_PASSWORD=your-password \
  halohub/halo:2
```

> Note: For `host.docker.internal`, verify the Docker compose network or use the PostgreSQL container IP. On 1Panel setups, PostgreSQL runs in a separate container and may need a shared network.

## OpenResty Reverse Proxy Config

```nginx
server {
    listen 80;
    server_name blog.aklibk.com;
    client_max_body_size 10m;       # fits blog post + media sizes
    location / {
        proxy_pass http://127.0.0.1:40034;
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

> Note: Halo 2.x uses WebSocket for live preview and admin console. Keep the `Upgrade`/`Connection` headers as shown.

## First-Time Setup

1. Visit **https://blog.aklibk.com/console**
2. Follow the initialization wizard:
   - Set blog title
   - Create admin account (email + password)
   - Choose default theme
3. After setup, the console login is at the same URL
4. Install themes and plugins from the admin console's marketplace

## Port Allocation Convention

On shared servers with multiple apps, use consistent port numbering:

| Port | App |
|------|-----|
| 40033 | Cloudreve |
| 40034 | Halo (this skill) |
| 5678 | n8n |
| 5432 | PostgreSQL |
| 6379 | Redis |

## Verification

```bash
# Local health check
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:40034/actuator/health
# → 200

# Via OpenResty proxy
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/ -H "Host: blog.aklibk.com"
# → 302 (redirects to /console)

# External via Cloudflare
curl -s -o /dev/null -w "HTTP %{http_code}" https://blog.aklibk.com/console
# → 200 (login page)

# Check startup logs for errors
docker logs halo --tail 20 | grep -iE "error|exception|started|setup"
```
