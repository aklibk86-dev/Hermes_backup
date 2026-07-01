# Halo + PostgreSQL Full Setup Reference

Session-derived reference for deploying Halo 2.25.3 with dedicated PostgreSQL on a VPS.

## Architecture

```
                        halo-net (Docker bridge)
┌─────────────────────────────────────────────────┐
│  ┌──────────────┐        ┌──────────────────┐   │
│  │   Halo       │        │  PostgreSQL 18   │   │
│  │   :8090      │◄──────►│  :5432            │   │
│  │   halohub/   │        │  postgres:18-     │   │
│  │   halo:2     │        │  alpine           │   │
│  └──────┬───────┘        └──────────────────┘   │
└─────────┼───────────────────────────────────────┘
          │:40034 (host)
  ┌───────┴──────────┐
  │  OpenResty       │
  │  blog.aklibk.com  │
  └──────────────────┘
```

## Route Diagram

User → https://blog.aklibk.com →
  Cloudflare (SSL/proxy) → VPS:443 →
    OpenResty (reverse proxy) → 127.0.0.1:40034 →
      Halo container → halo-postgres:5432

## Docker Commands Used

### Create network
```bash
docker network create halo-net --driver bridge
```

### Start PostgreSQL
```bash
docker run -d \
  --name halo-postgres \
  --network halo-net \
  --restart unless-stopped \
  -e POSTGRES_DB=halo \
  -e POSTGRES_USER=halo \
  -e POSTGRES_PASSWORD=<password> \
  -v halo-pg-data:/var/lib/postgresql \
  postgres:18-alpine
```

### Start Halo
```bash
docker run -d \
  --name halo \
  --restart unless-stopped \
  --network halo-net \
  -p 40034:8090 \
  -v /opt/halo:/root/.halo2 \
  -e HALO_WORK_DIR=/root/.halo2 \
  halohub/halo:2 \
  --spring.r2dbc.url=r2dbc:pool:postgresql://halo-postgres:5432/halo \
  --spring.r2dbc.username=halo \
  --spring.r2dbc.password=<password> \
  --spring.sql.init.platform=postgresql
```

## OpenResty Config

Created in `/usr/local/openresty/nginx/conf/default/halo.conf`:

```nginx
server {
    listen 80;
    server_name blog.aklibk.com;
    client_max_body_size 50m;
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

## Health Check

- Internal: `http://127.0.0.1:40034/actuator/health`
- External: `https://blog.aklibk.com/actuator/health`
- Expected response: `200 OK`

## Troubleshooting

### Connection refused to PostgreSQL
Check that both containers are on the same Docker network:
```bash
docker network inspect halo-net
```

### BLOB type error
```
ERROR: type "blob" does not exist
```
**Fix**: Add `--spring.sql.init.platform=postgresql` to Halo's command args.

### PostgreSQL keeps restarting
Check log: `docker logs halo-postgres`. If it says "mount at /var/lib/postgresql (unused)", the volume mount is wrong — must be parent dir for PG 18+.

### Wrong Halo version
`:latest` may pull Halo 1.x. Use `:2` tag for latest 2.x.
