---
name: 1panel
description: "Use when the user asks to query, monitor, or manage a 1Panel server instance — resource monitoring, websites/SSL certificates, installed apps, containers, logs, cronjobs, task center, or nodes. Uses the official 1Panel-skills CLI to call the 1Panel REST API with MD5-signed tokens."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, 1panel, server-management, monitoring, panel]
    related_skills: [hermes-agent, remote-ssh-access]
---

# 1Panel Server Management Skill

## Overview

This skill wraps the official [1Panel-skills](https://github.com/1Panel-dev/1Panel-skills) project (a TypeScript-based skill package) for use from Hermes. It lets you query and inspect a running **1Panel** instance — an open-source Linux server management panel — through authenticated API calls.

The underlying `1Panel-skills` project handles request signing automatically (`md5("1panel" + API_KEY + timestamp)`) so you **never construct raw signed headers**.

**Current focus**: read / query / inspection operations. Mutation endpoints (create, update, delete, restart, stop) have reserved interface definitions in the upstream project but are **not yet implemented**. If the user asks for a mutation, say so clearly and offer to extend the skill.

## When to Use

- User mentions "1Panel", "1panel", "面板", or asks about their 1Panel server
- User wants to check server resource usage, website status, container health, SSL certificate expiry, cronjob records, or app states
- User says "帮我看看 1Panel 上的 XXX" or similar

## Pre-Setup: SSH Access to the 1Panel Server

If the 1Panel server is remote and password auth is required, use one of these approaches:

### Option A: pexpect (recommended — most reliable)

Install: `uv pip install pexpect`

```python
import pexpect, time

child = pexpect.spawn(
    'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p PORT root@HOST_IP',
    timeout=30, encoding='utf-8', maxread=10000
)
child.expect('password:')
child.sendline('THE_PASSWORD')

# Send commands and collect output with markers
child.sendline('echo "===DONE==="')
time.sleep(2)
try:
    data = child.read_nonblocking(size=8000, timeout=5)
except:
    data = child.before
```

Key patterns:
- `encoding='utf-8'` makes `child.before` native strings
- `maxread=5000+` prevents truncation on verbose MOTDs
- Send `echo "===UNIQUE_MARKER==="` after commands and wait 2-3s
- Use `read_nonblocking()` (not `expect(r'#$')`) to capture full output including command echo — the prompt regex often false-matches on terminal escape codes or MOTD content
- For multi-line heredocs or shell quoting, `sendline()` each line individually
- Clean output by slicing from the marker: `output[output.find('===MARKER==='):]`

### Option B: SSH_ASKPASS (pure bash, no pip dependency)

```bash
cat > /tmp/askpass.sh << 'SCRIPT'
#!/bin/sh
echo "THE_SSH_PASSWORD"
SCRIPT
chmod +x /tmp/askpass.sh

SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w ssh \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p PORT root@HOST_IP 'command'

SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w scp \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -P PORT /local/file root@HOST_IP:/remote/path
```

**Limitation**: Some distributions disable SSH_ASKPASS for password-auth-only connections. Test with a simple `echo` command first.

## Setup

### 1. Clone the upstream project

```bash
git clone https://github.com/1Panel-dev/1Panel-skills.git /opt/1panel-skills
cd /opt/1panel-skills
npm install
npm run build    # only if dist/ is missing; normally pre-built
```

### 2. Configure environment variables

Set these before using any CLI commands:

```bash
export ONEPANEL_BASE_URL="http://YOUR_1PANEL_IP:PORT/ENTRANCE"  # e.g. http://192.168.1.100:9999/6adab82f9c
export ONEPANEL_API_KEY="your-1panel-api-key"                    # from Settings → API
export ONEPANEL_TIMEOUT_MS="30000"                               # optional, default 30s
export ONEPANEL_SKIP_TLS_VERIFY="false"                          # optional, set "true" for self-signed
```

### 3. Get the API Key (MUST use Web UI)

**IMPORTANT**: The API Key and API on/off settings are managed exclusively through the 1Panel Web UI. Direct SQLite database edits are **overwritten on service restart**.

To get the API key:
1. Find the panel URL: run `1pctl user-info` on the server to get the full address (includes security entrance path)
2. Open the URL in a browser (e.g. `http://IP:PORT/SECURITY_ENTRANCE`)
3. Log in with the username and password shown by `1pctl user-info`
4. Go to **设置 (Settings) → API 接口 (API Interface)**
5. Toggle **API 接口** to enable
6. Copy the generated **API Key**
7. Set **IP 白名单 (IP Whitelist)** to `0.0.0.0/0,::/0` for testing, or the specific IP of the Hermes host

To clear IP restrictions if they block access, run on the server directly:
```bash
1pctl reset ips   # cancels all IP whitelist restrictions
1pctl reset entrance   # removes security entrance (optional)
```

### 4. 1pctl — Server-side Panel CLI Reference

The `1pctl` command (at `/usr/local/bin/1pctl`) runs directly on the 1Panel server and manages the panel itself:

| Command | Description |
|---------|-------------|
| `1pctl user-info` | Show panel URL, username, masked password |
| `1pctl user-list` | List all 1Panel users |
| `1pctl reset ips` | Clear IP whitelist restrictions |
| `1pctl reset entrance` | Remove security entrance |
| `1pctl reset https` | Disable HTTPS login |
| `1pctl reset mfa` | Disable two-factor auth |
| `1pctl reset domain` | Unbind domain restriction |
| `1pctl update password` | Change panel password |
| `1pctl update port` | Change panel port |
| `1pctl update username` | Change panel username |
| `1pctl status [core\|agent]` | Check service status |
| `1pctl start/stop/restart` | Manage services |
| `1panel version` | Show 1Panel version |

The 1Panel settings database is at `/opt/1panel/db/core.db` (SQLite with WAL mode). System config (encrypted) is at `/etc/1panel/.1panel`.

### 5. Alias for convenience (optional)

```bash
alias 1p-skills='node /opt/1panel-skills/dist/scripts/cli.js'
```

## CLI Reference

All commands are run from the `/opt/1panel-skills` directory via `node dist/scripts/cli.js`.

### Basic commands

| Command | Description |
|---------|-------------|
| `node dist/scripts/cli.js modules` | List all available modules |
| `node dist/scripts/cli.js actions <module>` | List actions for a module |
| `node dist/scripts/cli.js sign` | Print the current signed request headers (debugging) |
| `node dist/scripts/cli.js request <METHOD> <PATH>` | Send a raw signed API request |

### Execute a module action

```bash
node dist/scripts/cli.js run <module> <action>
node dist/scripts/cli.js run <module> <action> --input-json '{"key":"val"}'
```

## Module & Action Reference

### `monitoring` — Resource monitoring

| Action | Description | Endpoint |
|--------|-------------|----------|
| `getDashboardBase` | OS info + live resource (CPU/mem/disk) | `GET /api/v2/dashboard/base/os` and `/dashboard/base/:ioOption/:netOption` |
| `getCurrentNode` | Current node summary | `GET /api/v2/dashboard/current/node` |
| `getCurrentResource` | Current IO + network | `GET /api/v2/dashboard/current/:ioOption/:netOption` |
| `getTopCPU` | Top CPU processes | `GET /api/v2/dashboard/current/top/cpu` |
| `getTopMem` | Top memory processes | `GET /api/v2/dashboard/current/top/mem` |
| `getMonitorSetting` | Monitor config (retention, intervals) | `GET /api/v2/hosts/monitor/setting` |
| `searchMonitor` | Historical monitor data | `POST /api/v2/hosts/monitor/search` |
| `getGPUOptions` | GPU options list | `GET /api/v2/hosts/monitor/gpuoptions` |
| `searchGPUHistory` | GPU historical data | `POST /api/v2/hosts/monitor/gpu/search` |

**Example workflow** — check server health:
```bash
node dist/scripts/cli.js run monitoring getCurrentNode
node dist/scripts/cli.js run monitoring getTopCPU
node dist/scripts/cli.js run monitoring getTopMem
```

### `websites` — Website & SSL management

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchWebsites` | Search website list (paged) | `POST /api/v2/websites/search` |
| `listWebsites` | List all websites (unpaged) | `GET /api/v2/websites/list` |
| `getWebsiteDetail` | Single website detail by ID | `GET /api/v2/websites/:id` |
| `getWebsiteConfig` | Nginx config by type | `GET /api/v2/websites/:id/config/:type` |
| `getWebsiteDomains` | Domains bound to a website | `GET /api/v2/websites/domains/:id` |
| `getWebsiteHTTPS` | HTTPS config for a website | `GET /api/v2/websites/:id/https` |
| `searchSSL` | Search SSL certificates | `POST /api/v2/websites/ssl/search` |
| `listSSL` | List all SSL certificates | `POST /api/v2/websites/ssl/list` |
| `getSSLDetail` | Single SSL cert detail by ID | `GET /api/v2/websites/ssl/:id` |
| `readLogFile` | Read website log file | `POST /api/v2/files/read` |

**Example workflow** — check websites + SSL:
```bash
# List websites
node dist/scripts/cli.js run websites searchWebsites --input-json '{"page":1,"pageSize":20}'

# Check SSL cert for first site (use the ID from above)
node dist/scripts/cli.js run websites getWebsiteHTTPS --input-json '{"id":1}'
```

### `apps` — App store & installed apps

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchInstalled` | Search installed apps | `POST /api/v2/apps/installed/search` |
| `listInstalled` | List all installed apps | `GET /api/v2/apps/installed/list` |
| `getAppInfo` | Installed app detail by installId | `GET /api/v2/apps/installed/info/:installId` |
| `searchApps` | App catalog search | `POST /api/v2/apps/search` |
| `getAppDetail` | App version detail | `GET /api/v2/apps/detail/:appId/:version/:type` |
| `getServices` | Service list by app key | `GET /api/v2/apps/services/:key` |
| `getPorts` | Port/connection info | `POST /api/v2/apps/installed/loadport` |
| `getConnInfo` | Connection info | `POST /api/v2/apps/installed/conninfo` |

### `containers` — Docker container management

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchContainers` | Search containers (paged) | `POST /api/v2/containers/search` |
| `listContainers` | List all containers (unpaged) | `POST /api/v2/containers/list` |
| `getContainerStatus` | Docker daemon status | `GET /api/v2/containers/status` |
| `getContainerLimit` | Container resource limits | `GET /api/v2/containers/limit` |
| `getContainerInfo` | Container detail info | `POST /api/v2/containers/info` |
| `inspectContainer` | Docker inspect by ID | `POST /api/v2/containers/inspect` |
| `getContainerStats` | Live stats for a container | `GET /api/v2/containers/stats/:id` |
| `listContainerStats` | Stats for all containers | `GET /api/v2/containers/list/stats` |
| `searchContainerLog` | Search container logs | `GET /api/v2/containers/search/log` |

**Example workflow** — check containers:
```bash
# List all containers
node dist/scripts/cli.js run containers listContainers

# Check container status
node dist/scripts/cli.js run containers getContainerStatus
```

### `logs` — System & operation logs

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchOperationLogs` | Panel operation logs | `POST /api/v2/core/logs/operation` |
| `searchLoginLogs` | Panel login logs | `POST /api/v2/core/logs/login` |
| `getSystemLogFiles` | System log file list | `GET /api/v2/logs/system/files` |
| `readFileLog` | Generic file/line log read | `POST /api/v2/files/read` |

Common log types for `readFileLog`: `website`, `system`, `task`.

### `cronjobs` — Scheduled tasks

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchCronjobs` | Search cronjobs (paged) | `POST /api/v2/cronjobs/search` |
| `loadCronjobInfo` | Single cronjob detail | `POST /api/v2/cronjobs/load/info` |
| `previewNextRun` | Next execution preview | `POST /api/v2/cronjobs/next` |
| `searchRecords` | Cronjob execution records | `POST /api/v2/cronjobs/search/records` |
| `getRecordLog` | Single record log content | `POST /api/v2/cronjobs/records/log` |
| `getScriptOptions` | Script library options | `GET /api/v2/cronjobs/script/options` |
| `searchScripts` | Search script library | `POST /api/v2/core/script/search` |

### `task-center` — Task Center

| Action | Description | Endpoint |
|--------|-------------|----------|
| `searchTasks` | Task center records (paged) | `POST /api/v2/logs/tasks/search` |
| `countExecuting` | Count of executing tasks | `GET /api/v2/logs/tasks/executing/count` |

### `nodes` — Multi-node management (Pro/XPack)

| Action | Description | Endpoint |
|--------|-------------|----------|
| `listNodes` | Full node list | `POST /api/v2/core/nodes/list` |
| `listAllNodes` | All nodes (unpaged) | `GET /api/v2/core/nodes/all` |
| `listSimpleNodes` | Simple node list | `GET /api/v2/core/nodes/simple/all` |
| `getNodeAppsUpdate` | App update counts by node | `GET /api/v2/core/xpack/nodes/apps/update` |

**Note**: Some node endpoints return `404` or `403` on OSS-only deployments. Treat this as a capability boundary, not a bug.

## Common Workflows

### Quick server health check
```bash
# 1. System status
node dist/scripts/cli.js run monitoring getCurrentNode

# 2. Top processes
node dist/scripts/cli.js run monitoring getTopCPU
node dist/scripts/cli.js run monitoring getTopMem

# 3. Docker status
node dist/scripts/cli.js run containers getContainerStatus
```

### Check website + SSL expiry
```bash
# 1. List websites
node dist/scripts/cli.js run websites searchWebsites --input-json '{"page":1,"pageSize":50}'

# 2. Check HTTPS for each
node dist/scripts/cli.js run websites getWebsiteHTTPS --input-json '{"id":1}'

# 3. List SSL certs (find expiry dates)
node dist/scripts/cli.js run websites listSSL
```

### Inspect app status & containers
```bash
# 1. List installed apps
node dist/scripts/cli.js run apps listInstalled

# 2. Check detail of specific app
node dist/scripts/cli.js run apps getAppInfo --input-json '{"installId":1}'

# 3. Get container stats
node dist/scripts/cli.js run containers listContainerStats
```

### View logs
```bash
# Recent operation logs
node dist/scripts/cli.js run logs searchOperationLogs --input-json '{"page":1,"pageSize":20}'

# Recent logins
node dist/scripts/cli.js run logs searchLoginLogs --input-json '{"page":1,"pageSize":10}'
```

### Check cronjobs & tasks
```bash
# List cronjobs
node dist/scripts/cli.js run cronjobs searchCronjobs --input-json '{"page":1,"pageSize":20}'

# Preview next runs
node dist/scripts/cli.js run cronjobs previewNextRun --input-json '{"id":1}'

# Task center
node dist/scripts/cli.js run task-center countExecuting
```

## OpenResty Reverse Proxy (Manually Exposing Containers)

1Panel uses **OpenResty** (a community Nginx fork) as its web server/gateway. You can add custom reverse proxy rules to expose Docker containers via subdomains without going through the 1Panel website module.

### Key facts

| Property | Value |
|----------|-------|
| Container name | `1Panel-openresty-XXXX` (suffix varies) |
| Config mount (default/) | `./conf/default/` → `/usr/local/openresty/nginx/conf/default/` |
| Config mount (conf.d/)  | `/opt/1panel/www/conf.d` → `/usr/local/openresty/nginx/conf/conf.d` |
| Host path (default/) | `/opt/1panel/apps/openresty/openresty/conf/default/` |
| Host path (conf.d/)  | `/opt/1panel/www/conf.d/` |
| Network | `network_mode: host` (can reach containers on `127.0.0.1:PORT`) |
| Reload | `docker exec 1Panel-openresty-XXXX nginx -s reload` |

### Adding a reverse proxy config

```bash
# 1. Create a .conf file in the default directory
cat > /opt/1panel/apps/openresty/openresty/conf/default/appname.conf << 'EOF'
server {
    listen 80;
    server_name myapp.aklibk.com;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 2. Find the exact container name and reload
OPENRESTY_CONTAINER=$(docker ps --filter ancestor=1panel/openresty --format "{{.Names}}")
docker exec "$OPENRESTY_CONTAINER" nginx -s reload
```

### WebSocket support

The `Upgrade` / `Connection "upgrade"` headers in the config above enable WebSocket passthrough — required for apps like n8n that use WebSocket connections. If the app does not use WebSockets, these two lines can be omitted.

### Important notes

- Config files are persisted in the host mount (`./conf/default/`) — they survive container restarts
- OpenResty runs in `network_mode: host`, so all containers on the server are reachable via `127.0.0.1:PORT`
- `client_max_body_size 0` disables the upload limit (useful for file-sharing apps like Cloudreve). Set a specific limit (e.g. `50m`) for other apps
- For HTTPS, either enable Cloudflare Universal SSL (Flexible mode) or configure certs in OpenResty directly

### Pitfall: `$` escaping in Nginx config heredocs

When writing Nginx config files through SSH (either via a heredoc piped to SSH or inside a `ssh ... 'command'` string), the `$` in Nginx variables (`$host`, `$http_upgrade`, `$remote_addr`, `$proxy_add_x_forwarded_for`, `$scheme`) can get corrupted:

**Wrong — `$` gets escaped to `\$` in the file:**
```bash
# The outer shell processes \$ and writes literal '\$http_upgrade' into the file
SSH_ASKPASS=/tmp/askpass.sh ... ssh ... "cat > /path/conf << \"EOF\"
proxy_set_header Upgrade \$http_upgrade;   # Writes: Upgrade \$http_upgrade  ← BAD
EOF"
```

**Wrong — unquoted delimiter causes local shell expansion:**
```bash
cat > /path/conf << EOF
proxy_set_header Upgrade $http_upgrade;    # Local shell expands $http_upgrade to empty  ← BAD
EOF
```

**Correct approaches:**

1. **Write locally, then SCP** (most reliable):
```bash
cat > /tmp/app.conf << 'EOF'
proxy_set_header Upgrade $http_upgrade;
EOF
SSH_ASKPASS=/tmp/askpass.sh ... scp -P PORT /tmp/app.conf root@HOST:/path/conf/app.conf
```

2. **Quoted heredoc inside SSH command** (works when the SSH command itself uses single quotes for the outer string):
```bash
# Outer single quotes protect inner $ from local shell
SSH_ASKPASS=/tmp/askpass.sh ... ssh ... 'cat > /path/conf/app.conf << '\''EOF'\''
server {
    listen 80;
    server_name example.com;
    location / {
        proxy_pass http://127.0.0.1:PORT;
        proxy_set_header Upgrade $http_upgrade;   # $ stays literal  ← GOOD
    }
}
EOF'
```

3. **Use Python on the remote VPS** to write the file with proper string handling. This is the most reliable approach — use a raw string to preserve `$`:

```python
# Write this via pexpect on the remote VPS
child.sendline("""python3 << 'PYEOF'
conf = r'''server {
    listen 80;
    server_name app.example.com;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
'''
with open('/opt/1panel/apps/openresty/openresty/conf/default/app.conf', 'w') as f:
    f.write(conf)
print("Config written")
PYEOF""")
```

The Python `r'''...'''` raw string preserves `$` literally, and the outer heredoc `'PYEOF'` preserves Python's own quoting. This avoids both shell expansion and backslash escapes.

**Verify after writing** that `$` signs are literal (not `\$`):
```bash
cat /opt/1panel/apps/openresty/openresty/conf/default/app.conf | grep -o '\\$' | wc -l
# Should be 0 - no backslash-dollar escapes in the file
```

## Running Docker Containers Alongside 1Panel

1Panel manages its apps as Docker Compose projects under `/opt/1panel/apps/<name>/`. You can also run **standalone Docker containers** alongside them without conflict:

```bash
# Manually added containers coexist fine
docker run -d --name myapp --restart unless-stopped -p 5678:5678 -v data_vol:/data image:tag
```

These won't appear in the 1Panel UI but run normally. Key considerations:
- **Volume location**: Use named volumes or paths outside `/opt/1panel/` to avoid confusion
- **Port conflicts**: Check `docker ps` before choosing ports — 1Panel apps use various ports
- **Network**: 1Panel containers may be on custom bridges. For manual containers, `--network host` or the default bridge works. When connecting a sidecar container to 1Panel PostgreSQL, add `--network 1panel-network` so both containers share the bridge.

### pg_hba.conf ordering trap

1Panel PostgreSQL (`1Panel-postgresql-qqLl`) uses `scram-sha-256` for host connections with a catch-all rule `host all all all scram-sha-256` at the bottom of `pg_hba.conf`. Since pg_hba.conf is **first-match**, appending a trust rule after this catch-all is useless — the catch-all matches first. To allow password-less connections from a Docker bridge subnet (e.g. 172.18.0.0/16), **insert the rule before the catch-all**:

```bash
PG=1Panel-postgresql-qqLl
docker exec $PG sh -c "sed -i '/^host all all all scram-sha-256/i host all all 172.18.0.0/16 trust' /var/lib/postgresql/18/docker/pg_hba.conf"
docker exec $PG psql -U user_k6xnnP -c 'SELECT pg_reload_conf();'
```

Verify rule order after editing:
```bash
docker exec $PG sh -c "grep -v '^#' /var/lib/postgresql/18/docker/pg_hba.conf | grep -v '^$'"
```

## Workflow: Deploy a New Web App Behind 1Panel's OpenResty

This is the proven end-to-end pattern (used for n8n, Cloudreve, and Halo on aklibk.com). It combines DNS setup, Docker launch, and OpenResty reverse proxy in one flow.

### 1. Add Cloudflare DNS record

Use Python's `urllib` (not `curl`) to avoid shell token corruption — see the `cloudflare` skill for full reference.

```python
import urllib.request, json

zone_id = "your-zone-id"        # from memory or cf_api("/zones")
cf_email = "your@email.com"
cf_key = "your-global-api-key"
subdomain = "myapp"             # becomes myapp.example.com
server_ip = "1.2.3.4"

headers = {
    "X-Auth-Email": cf_email,
    "X-Auth-Key": cf_key,
    "Content-Type": "application/json",
}
body = json.dumps({
    "type": "A",
    "name": subdomain,          # Cloudflare appends the zone domain
    "content": server_ip,
    "ttl": 120,                 # 120 = Auto
    "proxied": True,            # Orange cloud: CDN + SSL
}).encode()

req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
    data=body, headers=headers, method="POST"
)
res = json.loads(urllib.request.urlopen(req).read())
if res.get("success"):
    print(f"✅ {res['result']['name']} → {res['result']['content']} (proxied={res['result']['proxied']})")
else:
    print(f"❌ {res['errors']}")
```

> ⚠️ DNS records created via API with `proxied=True` get Cloudflare's Universal SSL automatically. No Let's Encrypt setup needed.

### 2. Start the Docker container (or Compose project)

```bash
# First, check which ports are already in use on this host
docker ps --format "table {{.Names}}\t{{.Ports}}"
# Also check system services: ss -tlnp

# Pick the next available host port that doesn't conflict
```

**For single containers** (via `docker run`):
```bash
docker run -d --name myapp --restart unless-stopped \
  -p 127.0.0.1:HOST_PORT:CONTAINER_PORT \
  -v myapp_data:/data \
  image:tag
```

**For Docker Compose projects** (multi-container, e.g., Sub2API):
```bash
# Create deployment directory
mkdir -p /opt/myapp && cd /opt/myapp

# Download the compose file
curl -sL https://raw.githubusercontent.com/owner/repo/main/deploy/docker-compose.yml -o docker-compose.yml

# Copy .env.example to .env and customize
cp .env.example .env

# IMPORTANT: Check if the compose file's default port conflicts with existing services.
# Many templates default to port 8080 — change via .env if needed:
#   sed -i "s/SERVER_PORT=8080/SERVER_PORT=8083/" .env

# Pull images then start
docker compose --env-file .env -f docker-compose.yml pull
docker compose --env-file .env -f docker-compose.yml up -d
```

**Port conflict troubleshooting:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| `Bind for 127.0.0.1:8080 failed: port is already allocated` | Another app already uses 8080 | Change `.env` `SERVER_PORT` to unused port (e.g., 8083) |
| Container starts but health check fails | Postgres/Redis env mismatch | Verify `.env` variable names match compose file's `${VAR:-default}` references |
| Nginx proxy returns 502/503 | Proxy target port doesn't match container port | Update Nginx `proxy_pass` to point to the actual host port |

### 3. Add OpenResty reverse proxy config

Create the config either via the host mount or directly inside the container:

**Option A — via host mount** (preferred — survives OpenResty recreation):\n\nUse either the `default/` or `conf.d/` host mount — both are included in nginx.conf:\n```bash\n# Default configs directory (legacy)\ncat > /opt/1panel/apps/openresty/openresty/conf/default/myapp.conf << 'EOF'\n```\n\nOr the `conf.d/` directory (also valid, both get loaded):\n```bash\ncat > /opt/1panel/www/conf.d/myapp.conf << 'EOF'\n```\n\nFull config template:
server {
    listen 80;
    server_name myapp.aklibk.com;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:HOST_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

**Option B — pipe into container directly** (works without knowing host mount path):
```bash
OPENRESTY=$(docker ps --filter ancestor=1panel/openresty --format "{{.Names}}")
docker exec -i "$OPENRESTY" sh -c 'cat > /usr/local/openresty/nginx/conf/default/myapp.conf' << 'EOF'
server {
    listen 80;
    server_name myapp.aklibk.com;
    ...
}
EOF
```

### 4. Reload and verify

```bash
OPENRESTY=$(docker ps --filter ancestor=1panel/openresty --format "{{.Names}}")
docker exec "$OPENRESTY" nginx -t          # syntax check
docker exec "$OPENRESTY" nginx -s reload   # apply config

# Verify locally (curl through OpenResty)
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/ -H "Host: myapp.aklibk.com"

# Verify externally (via Cloudflare)
curl -s -o /dev/null -w "HTTP %{http_code}" https://myapp.aklibk.com/

# Check container logs for app startup
docker logs myapp --tail 10
```

### Config tuning notes

| Setting | When to use |
|---------|-------------|
| `client_max_body_size 0` | File upload apps (Cloudreve) — disables limit |
| `client_max_body_size 50m` | Normal web apps — sets a reasonable cap |
| `proxy_set_header Upgrade/Connection` | Apps needing WebSocket (n8n, real-time dashboards) — omit if not needed |
| `client_max_body_size 10m` | Blog platforms (Halo, WordPress) — fits typical post+media sizes |

### Deploying Search Engine Verification Files (Bing / Baidu / Google)

When adding a site to Google Search Console, Bing Webmaster Tools, or Baidu站长沙龙, the **file-based verification** method is the most reliable approach with Cloudflare + OpenResty (CNAME records in Cloudflare often fail to propagate for verification purposes).

#### Pattern

1. **Place the verification file** in the OpenResty root directory (both mount point and container):

```bash
# Host-side mount point (persistent across container restarts)
cp /tmp/verify_file.html /opt/1panel/apps/openresty/openresty/root/

# Also copy into the container (immediate availability)
docker cp /tmp/verify_file.html 1Panel-openresty-XXXX:/usr/share/nginx/html/
```

2. **Add an exact-match `location =` block** to the site's nginx config IN FRONT of any `location /` proxy blocks. This is critical — the `=` prefix gives it priority over the catch-all proxy:

```nginx
server {
    listen 80;
    server_name site.aklibk.com;

    # Verification file — must come BEFORE the proxy_pass location / block
    location = /BingSiteAuth.xml {
        root /usr/share/nginx/html;
    }

    location = /baidu_verify_codeva-JycBeLM6gm.html {
        root /usr/share/nginx/html;
    }

    # SEO files bypassing SPA
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080/sitemap.xml;
        ...
    }

    # Main app proxy
    location / {
        proxy_pass http://127.0.0.1:PORT;
        ...
    }
}
```

3. **Reload and verify**:

```bash
OPENRESTY=$(docker ps --filter ancestor=1panel/openresty --format "{{.Names}}")
docker exec "$OPENRESTY" nginx -t && docker exec "$OPENRESTY" nginx -s reload

# Local test
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/BingSiteAuth.xml -H 'Host: site.aklibk.com'
# Should return HTTP 200 with file content
```

#### ❌ Common mistake: sed-based insertion

Using `sed` to insert `location` blocks can produce duplicate or nested location blocks (Nginx does not allow nested `location` blocks). **Always rewrite the entire `.conf` file** using `cat > file << 'EOF'` or Python's `write_file` instead.

#### ⚠️ Cloudflare CNAME pitfall

CNAME records added via Cloudflare API often **do not propagate** to public DNS resolvers (even Cloudflare's own authoritative NS). The record exists in Cloudflare's system but returns empty from `dig`. This is caused by Cloudflare's CNAME flattening (`flatten_at_root`). For search engine verification, prefer:
- **File-based verification** (most reliable) — place a file on the server
- **TXT record verification** — works in Cloudflare (TXT records are not flattened)
- Avoid CNAME-based verification with Cloudflare

### Static Site (SPA) Deployment

When deploying a static SPA (React, Vue, Vite-built) directly on OpenResty — without a Docker backend — the config pattern is different from reverse proxy. The static files are served from the container's web root.

#### Config template

```nginx
server {
    listen 80;
    server_name studio.aklibk.com;

    # CRITICAL: This MUST be the CONTAINER path, not the host path.
    # Volume mapping: /opt/1panel/apps/openresty/openresty/root -> /usr/share/nginx/html
    root /usr/share/nginx/html/studio;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback
    }

    # Static asset caching (fingerprinted files)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    access_log off;
}
```

**Save to** (persists across container restarts):
- `/opt/1panel/apps/openresty/openresty/conf/default/<name>.conf` (host-side)
- Or `/opt/1panel/www/conf.d/<name>.conf`

#### Deploying build output when rsync/sshpass unavailable

Use tar + base64 over SSH:

```python
import tarfile, base64, pexpect
tar = tarfile.open('/tmp/site.tar.gz', 'w:gz')
tar.add('/local/dist', arcname='')
tar.close()
b64 = base64.b64encode(open('/tmp/site.tar.gz','rb').read()).decode()

child = pexpect.spawn('ssh -p PORT root@HOST', encoding='utf-8')
child.expect('password:')
child.sendline('PASS')
child.expect('#')
child.sendline("rm -rf /opt/1panel/.../root/<name>/*")
child.expect('#')
child.sendline(f"echo '{b64}' | base64 -d | tar xzf - -C /opt/1panel/.../root/<name>/")
child.expect('#')
```

#### Pitfall: `rewrite or internal redirection cycle`

This nginx error means `index.html` cannot be found at the configured `root` path, causing an infinite redirect loop. Common causes:

1. **Wrong root path** (most common): Using the host path instead of the container path. The `root` directive in nginx runs INSIDE the container — it cannot see host paths.

   WRONG:
   ```
   root /opt/1panel/apps/openresty/openresty/root/studio;
   ```
   CORRECT:
   ```
   root /usr/share/nginx/html/studio;
   ```

2. **Directory doesn't exist inside container**: Verify with:
   ```bash
   docker exec 1Panel-openresty-XXXX ls -la /usr/share/nginx/html/<name>/
   ```

3. **No index.html**: Check the file exists.

#### Verification

```bash
# Locally via OpenResty
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/ -H 'Host: domain.com'
# Via Cloudflare
curl -s -o /dev/null -w '%{http_code}' https://domain.com/
```

### Halo-specific deployment notes

See `references/halo-deployment.md` for full details. Key points:

- **Tag pitfall**: `halohub/halo:latest` resolves to **1.6.1** (old), not the current version. Always use `halohub/halo:2` (→ 2.25.3).
- **Port**: Container port 8090 → host 40034
- **Admin path**: `/console` (2.x), not `/admin` (1.x)
- **Data dir**: `/root/.halo2`
- **Health endpoint**: `/actuator/health`
- **client_max_body_size**: 10m is sufficient for blog posts and media

## Common Pitfalls

1. **API settings reset on restart** — 1Panel stores API configuration in its internal service state, not just the SQLite DB. Modifying `/opt/1panel/db/core.db` directly **will be overwritten** when `1panel-core` restarts. Always configure the API via the Web UI at 设置 → API 接口.

2. **Security entrance required** — The panel URL includes a security entrance path (shown by `1pctl user-info`). To access the login page, use the full URL like `http://IP:PORT/ENTRANCE_PATH`. Requests to `/` without the entrance path return "Access Temporarily Unavailable".

3. **Captcha on login** — The 1Panel web login requires a CAPTCHA code. The agent's vision tools may not read it (model-dependent). If stuck, reset the password via `1pctl update password NEWPASS` on the server, decrypt it from the SQLite database (see `references/1panel-password-recovery.md`), or use the API token auth instead.

4. **IP whitelist blocks API even on localhost** — If getting "调用 API 接口 IP 不在白名单", the IP whitelist is active. Fix options:
   - Set whitelist via Web UI to `0.0.0.0/0,::/0`
   - Or run `1pctl reset ips` on the server to clear restrictions entirely
   - An empty `IpWhiteList` in the DB still blocks — it must explicitly contain IPs or be cleared via `1pctl`

1. **Environment variables not set** — Every CLI command requires `ONEPANEL_BASE_URL` and `ONEPANEL_API_KEY`. Without them, you'll get connection errors.
2. **API not enabled in 1Panel** — Go to 设置 → API 接口 and enable it. Check the IP whitelist matches the Hermes host's IP.
3. **Do NOT modify the SQLite DB directly** — The 1Panel-core process stores API settings (`ApiInterfaceStatus`, `ApiKey`, `IpWhiteList`) in `/opt/1panel/db/core.db`. However, modifying these values directly via SQLite will NOT persist: 1Panel-core reinitializes them from its own configuration on restart, overwriting your changes. The API **must** be enabled through the web UI (设置 → API 接口). If you lost the web UI password, use `1pctl update password <new>` via SSH, decrypt it from the SQLite database (see `references/1panel-password-recovery.md`), or use `1pctl reset ips` to clear the IP whitelist.
4. **401 "API 接口密钥错误"** — The API Key is wrong or the timestamp is out of sync. Run `ntpdate` or check NTP sync on both machines.

7. **IP mismatch between API calls and whitelist** — If SSH'ing into the server and calling via `127.0.0.1`, the source IP may appear as an IPv6 address or the external IP depending on routing. Either allow `0.0.0.0/0,::/0` or call via the actual interface IP.

8. **Mutation not available** — The upstream 1Panel-skills project only implements read/query operations. If the user wants to create/update/delete/restart, tell them this is a gap and offer to extend.

9. **Node endpoints 404** — Some multi-node APIs require 1Panel Pro or XPack. OSS community edition lacks them — don't treat this as a bug.

10. **CLI not found** — The recommended path is `/opt/1panel-skills`. If cloned elsewhere, adjust the `node` path accordingly.

11. **SSL/TLS errors with self-signed certs** — Set `ONEPANEL_SKIP_TLS_VERIFY=true` to bypass certificate validation.

12. **halohub/halo:latest is NOT the latest Halo** — The `:latest` tag on Docker Hub points to Halo 1.6.1 (the old 1.x branch). Always use `halohub/halo:2` for a modern installation (→ Halo 2.25.3). See `references/halo-deployment.md` for full details.

## Direct Database Manipulation for 1Panel Apps

1Panel apps use PostgreSQL (or MySQL) with auto-generated random passwords. When the web UI is inaccessible but you have SSH/Docker access, you can manipulate the database directly.

### ⚠️ About Random Suffixes

1Panel appends **random suffixes** to container names, PostgreSQL roles, and database names. You **cannot** hardcode names like `1Panel-postgresql` or `cloudreve` — they will appear as e.g. `1Panel-postgresql-qqLl`, `cloudreve_QQCPe2`, `cloudreve_7y6xt7`. Always discover them dynamically.

### Finding PostgreSQL Credentials & Connecting

```bash
# Step 1: Find the PostgreSQL container name
docker ps --filter ancestor=postgres --format "{{.Names}}"
# → 1Panel-postgresql-qqLl

# Step 2: Since role "postgres" does NOT exist by default,
# find the actual DB user from environment
docker exec 1Panel-postgresql-XXXX printenv | grep -iE "USER|PASS|DB"
# Note: POSTGRES_PASSWORD shows as "***" (masked at container level).
# Only POSTGRES_USER is visible: e.g. POSTGRES_USER=user_k6xnnP

# Step 3: List databases with the discovered user
docker exec 1Panel-postgresql-XXXX psql -U user_k6xnnP -c "\l"
# → cloudreve_7y6xt7 | user_k6xnnP | ... | cloudreve_QQCPe2=CTc/user_k6xnnP
# The role with CTc privileges (e.g., cloudreve_QQCPe2) is the app's DB owner.

# Step 4: Connect as the app's DB owner (trust auth via local socket)
docker exec 1Panel-postgresql-XXXX psql -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 -c "\dt"
# → Lists all tables (e.g., users, storage_policies, files, etc.)

# Step 5: Query data
docker exec 1Panel-postgresql-XXXX psql -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 \
  -c "SELECT id, email, password FROM users;"
```

### Why no password is needed

PostgreSQL inside the container uses `trust` or `peer` authentication for local socket connections. Since you're running `docker exec` directly inside the container, you're connecting via the local socket — no password required as long as you use the correct PostgreSQL role.

### Cloudreve: Common Database Operations

Cloudreve stores data in a PostgreSQL database when deployed via 1Panel. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts: `id`, `email`, `nick`, `password` (bcrypt), `group_users` |
| `storage_policies` | Storage backends: `name`, `type`, `bucket_name`, `server`, `access_key`, `secret_key`, `settings` (JSONB) |
| `groups` | User groups |
| `files` | File metadata |
| `nodes` | Storage nodes |

> ⚠️ Table name note: Cloudreve v4 uses `users` (lowercase), NOT `ia_user` or `Users`. Always verify with `\dt` first.

**Reset a user's password** (Cloudreve bcrypt hash):

```bash
# Generate bcrypt hash locally
uv run python3 -c "
import bcrypt
h = bcrypt.hashpw(b'NEW_PASSWORD', bcrypt.gensalt()).decode()
print(h)
"

# Update in PostgreSQL via the DB owner role
docker exec 1Panel-postgresql-XXXX psql \
  -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 -c "UPDATE users SET password='\$HASH' WHERE id=1"
```

**Add or update an Alibaba Cloud OSS storage policy:**

```bash
# Insert new policy
docker exec 1Panel-postgresql-XXXX psql \
  -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 \
  -c "INSERT INTO storage_policies (name, type, bucket_name, server, access_key, secret_key, settings, created_at, updated_at)
       VALUES ('My OSS', 'oss', 'my-bucket', 'oss-cn-hongkong.aliyuncs.com',
               'ACCESS_KEY_ID', 'ACCESS_KEY_SECRET',
               '{\"region\": \"cn-hongkong\", \"file_type\": null, \"chunk_size\": 26214400}',
               NOW(), NOW())"
```

**Create the OSS bucket on Alibaba Cloud** (after setting the policy):

```python
import oss2
auth = oss2.Auth('ACCESS_KEY_ID', 'ACCESS_KEY_SECRET')
bucket = oss2.Bucket(auth, 'oss-cn-hongkong.aliyuncs.com', 'my-bucket')
bucket.create_bucket(oss2.BUCKET_ACL_PRIVATE)  # or BUCKET_ACL_PUBLIC_READ
```

Install the SDK with `uv pip install oss2`.

**Storage policy `type` values by provider:**

| Provider | `type` | Notes |
|----------|--------|-------|
| Local storage | `local` | Default |
| Alibaba Cloud OSS | `oss` | `server` = `oss-<region>.aliyuncs.com`, `settings.region` = region code |
| Tencent Cloud COS | `remote` | `server` = `https://cos.<region>.myqcloud.com` |
| Amazon S3 / compatible | `s3` | Requires `settings.region`, `s3_path_style`, etc. |
| OneDrive | `onedrive` | OAuth-based |
| Remote (basic) | `remote` | Generic remote storage |

### Common Pitfalls (Cloudreve Database)

1. **PostgreSQL role is NOT `postgres`** — 1Panel creates custom roles (e.g. `cloudreve_QQCPe2`). Check with `docker exec <pg> printenv | grep USER`, not `.env`.
2. **`role "postgres" does not exist`** — This is expected. Discover actual roles via `psql -U <found-user> -c "\du"`.
3. **`relation "ia_user" does not exist`** — Cloudreve v4 uses `users` (lowercase). Always check with `\dt` before assuming table names.
4. **Database name is NOT `cloudreve`** — 1Panel suffixes it (e.g. `cloudreve_7y6xt7`). List with `\l`.
5. **Container names have random suffixes** — `1Panel-postgresql` is actually `1Panel-postgresql-XXXX`. Use `docker ps` to find the real name.
6. **`docker exec printenv | grep PASS` shows `***`** — Even at the container level, 1Panel masks the password. Use trust/peer auth via local socket instead.
7. **Cloudreve app container lacks `psql`** — Connect via the dedicated PostgreSQL container, not the Cloudreve app container.
8. **Database file not in container** — Cloudreve with PostgreSQL has NO `.db` file inside the container; all data lives in PostgreSQL.

## Supplementary Reference Files

This skill ships with several reference files for quick lookup:

| File | Contents |
|------|----------|
| `references/1panel-api-auth.md` | Auth token generation (Python/shell/Go), request headers, troubleshooting |
| `references/1panel-api-configuration.md` | API configuration steps, IP whitelist setup, password reset commands |
| `references/1panel-app-credentials.md` | How to find database credentials for 1Panel-managed apps |
| `references/1panel-modules.md` | Module-by-module API endpoint reference (complements the CLI-based documentation above) |
| `references/aliyun-oss-bucket.md` | Creating Alibaba Cloud OSS buckets for Cloudreve storage policies |
| `references/halo-deployment.md` | Deploying Halo blog (2.x) behind 1Panel OpenResty — version tags, Docker config, first-time setup |
| `references/multi-service-spa-proxy.md` | Multi-service SPA reverse proxy pattern — routing `/api/`, `/uploads/`, and SEO paths to different backends (Dujiao-Next example) |
| `references/1panel-password-recovery.md` | Decrypting the 1Panel admin password from the SQLite database (`core.db`) via AES-128-CBC with the stored EncryptKey |

## Teardown / Decommission a Deployed App

When the user asks to remove a project entirely, follow this sequence (demonstrated with Sub2API teardown):

### 1. Stop and remove containers + data volumes

```bash
cd /opt/myapp
docker compose --env-file .env -f docker-compose.yml down -v
```

The `-v` flag is critical — it removes named volumes (PostgreSQL data, Redis data, app data). Without it, `docker compose up` later will reuse stale data.

### 2. Delete the deployment directory

```bash
rm -rf /opt/myapp
```

### 3. Remove the Nginx/OpenResty config

```bash
rm -f /opt/1panel/apps/openresty/openresty/conf/default/myapp.conf
OPENRESTY=$(docker ps --filter ancestor=1panel/openresty --format "{{.Names}}")
docker exec "$OPENRESTY" nginx -t && docker exec "$OPENRESTY" nginx -s reload
```

### 4. Delete the Cloudflare DNS record

Get the record ID first, then delete it:

```bash
# List records to find the ID
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A&name=subdomain.example.com" \
  -H "X-Auth-Email: email" -H "X-Auth-Key: key" -H "Content-Type: application/json"

# Delete by record ID
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "X-Auth-Email: email" -H "X-Auth-Key: key" -H "Content-Type: application/json"
```

### Order matters

Always: **stop containers** → **delete data** → **remove Nginx config** → **reload OpenResty** → **delete DNS**. This prevents orphan services or dangling DNS pointing nowhere.

## Verification Checklist

- [ ] `ONEPANEL_BASE_URL` and `ONEPANEL_API_KEY` are set as environment variables
- [ ] `node dist/scripts/cli.js modules` lists all 8 modules
- [ ] `node dist/scripts/cli.js run monitoring getCurrentNode` returns real data
- [ ] `node dist/scripts/cli.js run cronjobs searchCronjobs` returns cronjob list (or empty)
- [ ] `node dist/scripts/cli.js run containers getContainerStatus` returns Docker status
- [ ] If any command returns `401`, verify API key and NTP sync
- [ ] If any command returns `404`/`403` for nodes, note this is expected on OSS edition
