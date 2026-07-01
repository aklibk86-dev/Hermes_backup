# Deploying .NET Apps Behind 1Panel OpenResty

## Key Differences from Go/Node.js Apps

.NET apps (like TelegramMonitor) may behave differently behind a reverse proxy:

### 1. Host header rejection

Some .NET apps return HTTP 400 Bad Request when the `Host` header doesn't match a configured binding (even though they listen on `http://*:PORT`). This is controlled by the `Urls` config setting.

**Fix**: Either remove the `Host` header from Nginx proxy, or configure the app to accept any host via environment variable:
```
Urls=http://*:PORT
```

### 2. Environment variable naming convention

.NET uses `__` (double underscore) as a hierarchy separator in environment variables. For nested config like `Telegram.DefaultApiId`, the env var is `Telegram__DefaultApiId`.

```bash
docker run -d \
  -e Telegram__DefaultApiId=123456 \
  -e Telegram__DefaultApiHash=your_hash \
  -e Auth__AdminPassword=change-me \
  image:tag
```

### 3. Docker entrypoint behavior

Many .NET Docker images use an entrypoint script that symlinks data directories. For TelegramMonitor specifically:
- Persistence dir: `/data` (mounted as a volume)
- The entrypoint links `/app/session` → `/data/session`, `/app/logs` → `/data/logs`, and the SQLite DB files → `/data/`
- This means the container recreates data symlinks on each start — only the mounted `/data` volume persists data

## Generic Pattern

```bash
docker run -d --name dotnet-app --restart unless-stopped \
  -p 127.0.0.1:5005:5005 \
  -v /opt/dotnet-app/data:/data \
  -e KEY__NESTED__VALUE=setting \
  ghcr.io/owner/app:latest
```
