# 1Panel OpenResty Reverse Proxy Configuration

## Architecture

1Panel uses an **OpenResty** (Nginx fork) container to manage web traffic.
Host-mounted config directories:

| Host Path | Container Mount |
|---|---|
| `/opt/1panel/www/conf.d/` | `/usr/local/openresty/nginx/conf/conf.d/` |
| `/opt/1panel/www/stream.d/` | for TCP/UDP streams |
| `/opt/1panel/apps/openresty/openresty/conf/default/` | built-in defaults |

## Add a Reverse Proxy Site

Create a `.conf` file in `/opt/1panel/www/conf.d/`. The 1Panel web UI also writes here,
but writing directly is fine and takes effect on reload.

## Security Policy (this user)

All Docker services behind 1Panel must:
1. Bind to `127.0.0.1` only — never `0.0.0.0`
2. Be accessed only via domain name → Cloudflare proxy → 1Panel OpenResty
3. No direct-IP catch-all nginx configs

## Port Binding Fix

Change compose.yaml from:
```yaml
ports:
  - "7001:7001"
```
To:
```yaml
ports:
  - "127.0.0.1:7001:7001"
```

Via sed:
```bash
sed -i 's/"7001:7001"/"127.0.0.1:7001:7001"/' compose.yaml
```

## 1Panel CLI

Available commands via `/usr/local/bin/1pctl`:
- `1pctl status` — check 1Panel service status
- `1pctl user-info` — get admin info
- `1pctl restart` — restart 1Panel
- Does NOT expose website/nginx management — those are web UI only
