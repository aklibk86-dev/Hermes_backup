# Self-Hosted Monitoring Stack (Uptime-Kuma + Umami)

Quick Docker deployment for Uptime-Kuma (uptime monitoring) and Umami (web analytics) behind 1Panel OpenResty.

## Uptime-Kuma

```bash
docker run -d --name uptime-kuma \
  --restart unless-stopped \
  -p 127.0.0.1:3003:3001 \
  -v /opt/docker/uptime-kuma:/app/data \
  louislam/uptime-kuma:latest
```

Port 3001 (container) → 3003 (host). Config is at `/opt/docker/uptime-kuma`.

## Umami

Umami v3.x uses Next.js and requires PostgreSQL.

### 1. Create Docker Network

```bash
docker network create umami-net
```

### 2. PostgreSQL

```bash
docker run -d --name umami-db \
  --restart unless-stopped \
  --network umami-net \
  -e POSTGRES_DB=umami \
  -e POSTGRES_USER=umami \
  -e POSTGRES_PASSWORD=umami123456 \
  -v /opt/docker/umami/postgres:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 3. Umami App

```bash
docker run -d --name umami-app \
  --restart unless-stopped \
  --network umami-net \
  -p 127.0.0.1:3002:3000 \
  -e DATABASE_URL=postgresql://umami:umami123456@umami-db:5432/umami \
  -e DATABASE_TYPE=postgresql \
  ghcr.io/umami-software/umami:postgresql-latest
```

**Important**: Wait ~8s after starting PostgreSQL before starting Umami so the DB is ready for migrations.

### 4. Verify

```bash
docker logs umami-app --tail 10
# Look for: "Ready in 0ms" (Next.js)

curl -sI http://127.0.0.1:3002
# Should return 200
```

## Nginx Reverse Proxy (1Panel OpenResty)

Standard vhost config in `/opt/1panel/www/conf.d/`:

```nginx
server {
    listen 80;
    server_name uptime.your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Same pattern for Umami (port 3002).

## Initial Login

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Uptime-Kuma | https://uptime.your-domain.com | Create admin on first visit |
| Umami | https://umami.your-domain.com | `admin` / `umami` (requires password change) |
