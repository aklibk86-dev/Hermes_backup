---
name: 1panel-docker-deploy
description: "Deploy a Docker Compose project on a 1Panel-managed VPS with Cloudflare DNS and 1Panel OpenResty reverse proxy. Covers the full lifecycle: DNS setup → directory creation → secret generation → compose customization → SCP → docker compose up → Nginx config → health verification → cleanup."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, 1panel, docker, deployment, cloudflare, nginx]
    related_skills: [remote-ssh-access, cloudflare, lark-wiki]
---

# 1Panel Docker Deploy

## When to Use

- You need to deploy a Docker project (compose or single container) on a 1Panel-managed VPS
- The project needs Nginx reverse proxy (via 1Panel OpenResty)
- External access goes through Cloudflare CDN (proxied)
- You need the full workflow: DNS → deploy → proxy → verify

## Workflow Overview

```
1. Add Cloudflare DNS record (A record, proxied=true)
2. Create deployment directory on VPS (/opt/<project-name>)
3. Generate secure passwords (openssl rand -hex 16/32)
4. Customize docker-compose.yml:
   - Bind ports to 127.0.0.1 only (never 0.0.0.0)
   - Replace default passwords with generated ones
   - Add SESSION_SECRET / CRYPTO_SECRET where needed
5. SCP configuration files to VPS
6. Create data directories (data/, logs/)
7. docker compose up -d
8. Write 1Panel Nginx site config
9. Reload 1Panel OpenResty
10. Verify health
11. Clean up SSH askpass script
```

## Prerequisites

- SSH access to VPS (password + SSH_ASKPASS pattern from remote-ssh-access skill)
- Cloudflare API credentials (API Token with DNS:Edit permissions, or Global API Key + email)
- Docker + Docker Compose installed on VPS
- 1Panel OpenResty container running

## Step-by-Step

### 1. SSH Setup (one-time per session)

#### Option A: SSH_ASKPASS (simplest when setsid available)

```bash
cat > /tmp/askpass.sh << 'SCRIPT'
#!/bin/sh
echo "THE_VPS_PASSWORD"
SCRIPT
chmod +x /tmp/askpass.sh
```

The askpass script stays alive for the entire session. Recreate it if deleted. Delete only when session is truly done.

#### Option B: Paramiko (recommended for programmatic SSH)

When the Hermes execution environment lacks `setsid` or you prefer a purely Python-based approach:

```bash
uv pip install paramiko
```

Write a Python script that uses `paramiko.SSHClient` (see `remote-ssh-access` skill, Alternative B) and run it with `/opt/hermes/.venv/bin/python3 /tmp/script.py`. This is especially useful when Docker is unavailable in the local environment but the remote VPS has it — the entire deploy can be scripted in a single Python file.

### 2. Add Cloudflare DNS Record

Two auth methods — pick one:

#### Option A: API Token (recommended — scoped permissions, single header)

Create a token at Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit DNS" template (Zone:DNS:Edit), restrict to the target zone.

```bash
ZONE_ID=<zone-id>  # Look up from memory or Cloudflare API
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"<subdomain>","content":"<vps-ip>","proxied":true,"ttl":1}'
```

**Token troubleshooting:** If the API returns error 9106 ("Authentication failed"), the token may be:
- Expired or revoked — check at https://dash.cloudflare.com/profile/api-tokens
- Missing the DNS:Edit permission — recreate with the "Edit DNS" template
- Not yet propagated — new tokens can take a minute to activate
- Truncated — full token is typically 40 hex chars
- **It's actually a Global API Key, not an API Token** — see pitfall below

**⚠️ Cloudflare Auth Pitfall: Bearer Token vs Global API Key**

Cloudflare has **two distinct auth schemes**. A 36–40 character hex string could be either:

| Scheme | Headers | Typical length | How to test |
|--------|---------|---------------|-------------|
| **API Token** | `Authorization: Bearer <token>` | 40 chars | `GET /client/v4/user/tokens/verify` with Bearer header |
| **Global API Key** | `X-Auth-Email` + `X-Auth-Key` | 36–40 chars | `GET /client/v4/zones` with email + key headers |

**The trap:** If you try a hex string as a Bearer token and get error 9106, the credential is almost certainly a **Global API Key**. Switch immediately:

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: cloudflare@email.com" \
  -H "X-Auth-Key: the-36-char-hex-key" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"subdomain","content":"vps-ip","proxied":true,"ttl":1}'
```

**Quick test to distinguish:** Run `curl -s -o /dev/null -w "%{http_code}" "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer <string>"`. If it returns 400/401, the string is not an API Token — try Global API Key auth instead.

#### Option B: Global API Key (legacy — requires email + key)

```bash
ZONE_ID=<zone-id>  # Look up from memory or Cloudflare API
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api-key>" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"<subdomain>","content":"<vps-ip>","proxied":true,"ttl":1}'
```

### 3. Prepare Deployment Directory and Secrets

```bash
ssh_cmd="SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w ssh \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p <port> root@<vps-ip>"

# Create directory
$ssh_cmd 'mkdir -p /opt/<project-name>/{data,logs}'

# Generate secrets on VPS
$ssh_cmd "openssl rand -hex 16"    # 16-byte password (32 hex chars)
$ssh_cmd "openssl rand -hex 32"    # 32-byte session key (64 hex chars)
```

### 4. Customize docker-compose.yml

Key rules:
- **Always bind ports to 127.0.0.1** (e.g., "127.0.0.1:3000:3000"). Never 0.0.0.0.
- **Do NOT expose database/Redis ports** to the host. Services talk over internal Docker network.
- **Replace all default passwords** with generated ones.
- **Remove the `version:` line** from compose file (Docker Compose v2 ignores it with a warning).

Write the compose file locally via write_file, then SCP it to the VPS:

```bash
SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w scp \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -P <port> \
  /local/path/docker-compose.yml root@<vps-ip>:/opt/<project-name>/docker-compose.yml
```

### 5. Start Services

#### Option A: Docker Compose

```bash
$ssh_cmd 'cd /opt/<project-name> && docker compose -f docker-compose.yml up -d'
```

Note: use `docker compose` (v2 plugin) not `docker-compose` (standalone). Docker Compose v2 is built into modern Docker.

#### Option B: docker run (single container)

For projects without a compose file (e.g., a single Docker image):

```bash
# ⚠️ ALWAYS verify latest version before using `:latest`
# The `latest` tag is a convenience label that can be months behind the actual release.
# Example: uptime-kuma `latest` was 1.23.17 when 2.4.0 was already available.
# Check Docker Hub for available version tags:
$ssh_cmd 'curl -sL https://hub.docker.com/v2/repositories/OWNER/REPO/tags/?page_size=10 | python3 -c "import sys,json; [print(r.get(chr(110)+chr(97)+chr(109)+chr(101))) for r in json.load(sys.stdin).get(chr(114)+chr(101)+chr(115)+chr(117)+chr(108)+chr(116)+chr(115),[])]"'

# Pin to a specific version after confirming
$ssh_cmd 'docker pull OWNER/REPO:2.4.0'

# Run with:
#   -d              = detach
#   --restart unless-stopped
#   -p 127.0.0.1:PORT:PORT  = bind to loopback only
#   -v /opt/<project>/data:/data  = persist data
#   -e KEY=VALUE    = environment variables
$ssh_cmd "docker run -d --name <container-name> --restart unless-stopped \
  -p 127.0.0.1:PORT:PORT \
  -v /opt/<project-name>/data:/data \
  -e ENV_VAR=value \
  OWNER/REPO:2.4.0"
## Pitfalls

Always bind to `127.0.0.1` — never `0.0.0.0`. The Nginx proxy is the only entry point.

### Memory Diagnostics & Management

When memory usage is high (~87%+), first diagnose where it's going:

```bash
# Quick overview
free -h

# Detailed breakdown
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Active\(anon\)|Inactive\(anon\)|AnonHugePages|Cached|Slab|SReclaimable|PageTables|KernelStack'

# Process-level top consumers
ps aux --sort=-%mem | head -10

# Total sum of process RSS vs system "used"
# Process RSS is typically far smaller than "used" — the gap is:
#   AnonHugePages (THP), inactive anonymous memory, file cache, slab
```

**Common findings on high-memory VPS (4C8G Debian):**

| Metric | Typical value | What it means |
|--------|-------------|---------------|
| `Inactive(anon)` | ~3.5 Gi | Old process memory not returned to OS. Python never returns malloc'd pages. |
| `AnonHugePages` | ~2.0 Gi | Transparent HugePages — kernel merges process pages into 2MB blocks. Won't release. |
| Process RSS total | ~750 MB | What `ps aux` or `docker stats` shows. Only ~10% of "used" total. |
| Available | ~1 Gi (low) | What's actually reclaimable before swapping. |

**The primary fix: restart the process that hoarded it** (e.g., Hermes Gateway, which is a Python process that allocates huge memory arenas and never releases them). The new process starts with RSS ~320 MB vs the old one's ~650 MB+, and the Inactive(anon) pool shrinks.

To prevent re-accumulation:

```bash
# Set memory limits on ALL running containers
docker ps -q | xargs docker update --memory=1g --memory-swap=1g

# Disable Transparent HugePages (prevents 2GB+ THP bloat)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Force reclaim inactive anonymous pages
echo 3 > /proc/sys/vm/drop_caches
```

### Disk Cleanup

```bash
# Remove unused Docker images
docker image prune -a -f
docker builder prune -a -f
docker system prune -f

# System cleanup
apt-get clean
journalctl --vacuum-size=200M
find /var/log -type f -name '*.log.*' -mtime +30 -delete 2>/dev/null
find /tmp -type f -atime +1 -delete 2>/dev/null
```

**Disk usage triage:**
- `df -h` — overall usage
- `du -sh /var/* | sort -rh` — find the big directory (/var/lib = Docker is almost always the culprit)
- `docker system df` — see reclaimable image/volume space
- `docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | sort -k2 -rh` — largest images
- Unused images show as RECLAIMABLE in `docker system df` — `docker image prune -a` removes them

### Transparent HugePages

Python processes (especially Hermes Gateway) can hog 1-2GB via AnonHugePages. Check:
```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
```
Disable on host if needed:
```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

### 1Panel DB Passwords

Masked as `***` in the panel. Retrieve via:
```bash
docker exec <container> printenv | grep -i pass
```

---

## Related References

```
/opt/1panel/apps/openresty/openresty/conf/default/<name>.conf
```

This path is bind-mounted into the OpenResty container at `/usr/local/openresty/nginx/conf/default/`.

Write a server block config file locally, then SCP it to the VPS, or write directly on the VPS:

```
server {
    listen 80;
    server_name <domain>;
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:<port>;
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

Then reload:

```bash
$ssh_cmd 'docker exec 1Panel-openresty-qMxV nginx -t && docker exec 1Panel-openresty-qMxV nginx -s reload'
```

### 7. Verify

```bash
# Check containers
$ssh_cmd 'cd /opt/<project-name> && docker compose ps'

# Test via Nginx (locally)
$ssh_cmd 'curl -s -o /dev/null -w "HTTP %{http_code}" -H "Host: <domain>" http://127.0.0.1:80'

# Test direct health endpoint
$ssh_cmd 'curl -s http://127.0.0.1:<port>/health'
```

### 8. Cleanup

```bash
rm -f /tmp/askpass.sh
```

## 1Panel OpenResty Config Path Reference

The 1Panel OpenResty container mounts host directories into the container at specific paths. Two locations on the host accept custom `.conf` files:

| Host Path | Container Path | Notes |
|-----------|----------------|-------|
| `/opt/1panel/apps/openresty/openresty/conf/nginx.conf` | `/usr/local/openresty/nginx/conf/nginx.conf` | Main config |
| `/opt/1panel/apps/openresty/openresty/conf/default/` | `/usr/local/openresty/nginx/conf/default/` | For 1Panel-managed sites (created via Web UI) |
| **`/opt/1panel/www/conf.d/`** | `/usr/local/openresty/nginx/conf/conf.d/` | **Manual configs** (preferred for one-off proxies) |
| `/opt/1panel/apps/openresty/openresty/log/` | `/var/log/nginx/` | Logs |
| `/opt/1panel/apps/openresty/openresty/root/` | `/usr/share/nginx/html/` | **Static file web root** |

Both `default/` and `conf.d/` are included by nginx.conf, so either works. **Prefer `/opt/1panel/www/conf.d/<name>.conf`** for manually-created reverse proxy configs — it keeps them separate from 1Panel-managed sites.

### Serving Static SPAs (React / Vue / Vite builds)

When deploying a static SPA build (not proxying to a Docker container), use the **web root** mount:

**Host path:** `/opt/1panel/apps/openresty/openresty/root/<project>/`
**Container path:** `/usr/share/nginx/html/<project>/`

**Critical: the `root` directive MUST use the CONTAINER path, not the host path.**

✅ Correct config:
```nginx
server {
    listen 80;
    server_name project.aklibk.com;

    root /usr/share/nginx/html/project;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

❌ **Wrong — causes 500 / rewrite cycle:**
```nginx
root /opt/1panel/apps/openresty/openresty/root/project;  # HOST path, nginx can't find it
```

The 500 error manifests as `rewrite or internal redirection cycle while internally redirecting to "/index.html"` in the OpenResty error log — Nginx can't locate the file, so `try_files` keeps redirecting in an infinite loop.

**Deploying built files:** No rsync or sshpass available in the Hermes container. Use tar + base64 over SSH:
```bash
# On local machine:
tar czf /tmp/project.tar.gz -C dist/ .
b64=$(base64 -w0 /tmp/project.tar.gz)

# On VPS:
rm -rf /opt/1panel/apps/openresty/openresty/root/project/*
echo "$b64" | base64 -d | tar xzf - -C /opt/1panel/apps/openresty/openresty/root/project/
```

Or pipe tar over SSH (requires password auth working):
```bash
cat /tmp/project.tar.gz | ssh root@vps "cd /opt/1panel/apps/openresty/openresty/root/project && tar xzf -"
```

**File ownership note:** Files written via SSH pipe will be owned by uid 10000 (not root) inside the container — this is harmless for static files served by Nginx, as the master process runs as root.

- **Reload**: `docker exec 1Panel-openresty-qMxV nginx -t && docker exec 1Panel-openresty-qMxV nginx -s reload`
- **Test**: `docker exec 1Panel-openresty-qMxV nginx -t`
- **Container name**: `1Panel-openresty-qMxV` (may vary across installs)

### Debugging 500 / Rewrite Cycle Errors

When a 1Panel site returns 500, check the error log first:
```bash
docker exec 1Panel-openresty-qMxV tail -50 /var/log/nginx/error.log
```

Common 500 causes:
1. **`rewrite or internal redirection cycle`** — root path points to host filesystem (see "Serving Static SPAs" above)
2. **`connect() failed (111: Connection refused)`** — upstream Docker container is not running or wrong port
3. **`Connection refused`** — the proxy_pass target isn't listening. Check `docker ps` and verify the container port binding matches the proxy_pass port

For 1Panel website creation: use the 1Panel API or CLI to create sites. The config files go to `/opt/1panel/apps/openresty/openresty/conf/default/<name>.conf` and are picked up automatically on nginx reload.

## 1Panel Website Directory Structure

When creating a website in 1Panel (e.g., named `xboard`), the document root is:

```
/opt/1panel/apps/openresty/openresty/www/sites/<name>/index/
```

This is where you clone the project code (for PHP/reverse-proxy sites) or place static files.

## Deploying Apps That Use 1Panel-Managed Infrastructure

Some apps (e.g., Xboard) are designed to run on 1Panel with a dedicated `compose.1panel.sample.yaml` that joins the `1panel-network` to reach 1Panel-managed MySQL/Redis containers.

### Workflow for 1Panel-Compatible Apps

1. **Install prerequisites via 1Panel App Store** or Docker directly:
   - MySQL 5.7 or MariaDB 10.11+ (must join `1panel-network`)
   - Redis (can be 1Panel-managed or built-in via compose)
2. **Create the site directory** at the 1Panel website path
3. **Clone the project** into the site index directory
4. **Use the 1Panel-specific compose template** (e.g., `compose.1panel.sample.yaml`) — copy it to `compose.yaml`
5. **Ensure the compose file has**:
   - `networks: includes 1panel-network: external: true`
   - Port binding: `"127.0.0.1:PORT:PORT"` (never 0.0.0.0)
6. **Run the setup/install command** via `docker compose run --rm <service> php artisan install`
7. **Create a reverse proxy config** in `/opt/1panel/www/conf.d/<name>.conf` pointing to `127.0.0.1:<port>`

## Related References

| File | When to Load |
|------|-------------|
| `references/project-deploy-notes.md` | Deploying any of: New API, Dujiao-Next, Xboard, Komari, Sub2API, Uptime-Kuma |
| `references/xboard-node-debugging.md` | Debugging why an Xboard proxy node won't connect |
| `references/1panel-openresty.md` | Understanding the 1Panel OpenResty path mappings |
| `references/database-surgery.md` | Web admin UI is locked/inaccessible — modify app config directly via its Docker database |
| `references/uptime-kuma-sqlite-monitors.md` | Uptime Kuma v2 has no REST CRUD API — insert/update monitors via SQLite directly. Monitor table schema, common monitor types, and example INSERT statements. |
| `references/telegram-monitor-api.md` | TelegramMonitor admin API — login, keyword CRUD, account listing, match modes (Regex vs Fuzzy), and payload field reference. |
| (see `lark-wiki` skill) | Save deployment docs to Feishu knowledge base using lark-cli inside the Hermes agent container. |

## Common Pitfalls

1. **Port conflict**: Check if the port is already in use by another container (e.g., 8080 is used by Dujiao-Next API). Run `docker ps --format '{{.Names}}\t{{.Ports}}'` to check all host ports before deploying. If the chosen port is taken, pick a clearly different one (e.g., 8088 instead of 8083) — avoid adjacent ports that may collide with other services.
2. **Password truncation in execute_code**: When passing multi-line Python scripts with passwords through execute_code, the sandbox may truncate or mangle string content. Prefer writing files locally and SCPing them over, or running Python on the VPS directly.
3. **sed escaping issues**: Avoid using sed with special characters like `$$`, `***`, `|` inside patterns passed through SSH. Use SCP + local file or Python on VPS instead.
4. **askpass deleted mid-session**: If you delete /tmp/askpass.sh before the session ends, SSH calls fail silently. Keep it alive until the very end.
5. **Cloudflare DNS propagation**: Even with proxied=true, it takes 1-5 minutes for Cloudflare to propagate new DNS records. Test via `host <domain>` to verify resolution.
6. **`version:` warning in compose**: Docker Compose v2 prints "the attribute `version` is obsolete" for files with `version: '3.x'`. Safe to ignore or remove the line.
7. **PostgreSQL Alpine PGDATA**: Postgres 18 Alpine on 1Panel needs explicit `PGDATA=/var/lib/postgresql/data` env var, otherwise the named volume mount won't actually store data.
8. **Container name collision**: If you delete a project and its containers (`docker compose down`), then deploy a different project that uses the same container name, it will conflict. Always check `docker ps -a` for orphaned containers before reusing names.
9. **Port conflict detection**: Before deploying, check which ports are already in use. On this server: 8080 (Dujiao-Next API), 3000 (New API), 5005 (TelegramMonitor), 5678 (n8n), 40034 (Halo). Use `docker ps --format '{{.Names}}\t{{.Ports}}'` to check.
10. **MariaDB vs MySQL 5.7 Docker**: MySQL 5.7 Docker image (`mysql:5.7`) has inconsistent behavior with certain password values — it may generate a random root password or reject the `MYSQL_ROOT_PASSWORD` env var. **Prefer `mariadb:10.11`** as a drop-in MySQL-compatible replacement. MariaDB reliably honors `MARIADB_ROOT_PASSWORD` and `MARIADB_PASSWORD` env vars. Use `mariadb-admin ping` instead of `mysqladmin ping` for health checks.
11. **`***` as a literal password**: Avoid passing `***` (three asterisks) as a password in Docker `-e` env vars passed through SSH commands. The `*` character can be glob-expanded by bash depending on quoting context, and MySQL 5.7 treats it as an invalid/empty password. Use random alphanumeric strings instead (`openssl rand -hex 16`).
12. **`!` (exclamation mark) in bash passwords via SSH**: Bash interprets `!` as history expansion inside double-quoted strings, even within a heredoc passed through paramiko/SSH. A password like `Sub2api@2024!` will get truncated or mangled. **Fix**: Use only alphanumeric characters in passwords when setting them through SSH commands (`openssl rand -hex 16` is safe). If you must use special chars, write the .env file via paramiko's SFTP `write()` method instead of shell heredoc/echo.
13. **`docker network connect` kills port mapping docker-proxy** — Running `docker network connect <target_network> <running_container>` on an already-running container that has host port mappings can cause the docker-proxy process for those ports to disappear. The port becomes unreachable from the host even though `docker port` still shows the mapping and `docker inspect` reports it. The container's internal service is fine (reachable via container IP), but no host-side proxy exists.

    **Fix**: `docker restart <container>` — this recreates the docker-proxy for all mapped ports. A simple `docker compose up -d --force-recreate` for the specific container also works.

    **Prevention**: If you need a container to be on multiple networks, define all networks in the docker-compose.yml from the start (`networks: [app-net, shared-net]`) instead of using `docker network connect` post-deployment.

14. **Auto-setup scripts that fail silently on first run**: When a project has a one-time auto-setup script (like sub2api's `AUTO_SETUP=true`), the setup writes a `.installed` lock file and `config.yaml` into the data directory. If the admin password was mangled during the first run (see pitfall #12), **removing the `.env` or restarting the container will NOT re-trigger setup**. The `AUTO_SETUP` only fires once per data directory. Fix: `docker compose down -v`, delete the data directories (`rm -rf data/ postgres_data/ redis_data/`), fix the `.env` locally via SFTP, then `docker compose up -d` to re-run setup with correct credentials.
15. **Compose port binding changes need `down` + `up -d`, not `restart`**: When you change port mappings in a docker-compose.yml (e.g., `0.0.0.0:3002:3002` → `127.0.0.1:3002:3002`), a simple `docker compose restart` does NOT rebind host ports — the docker-proxy keeps using the old mapping. You must run `docker compose down && docker compose up -d` to force Docker to recreate the port mappings. A `docker restart <container>` also works but doesn't pick up the compose file change; only `down + up` re-reads the compose file.