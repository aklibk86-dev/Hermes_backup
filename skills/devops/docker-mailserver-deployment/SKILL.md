---
name: docker-mailserver-deployment
description: "Deploy a full email server using Docker: docker-mailserver (Postfix+Dovecot) + SnappyMail webmail, with Cloudflare DNS records (MX, SPF, DKIM, A)."
version: 1.0.0
author: Hermes Agent
tags: [email, docker, postfix, dovecot, webmail, cloudflare, dns]
---

# Docker Mailserver Deployment

Deploy a complete email server using `docker-mailserver/docker-mailserver` (Postfix + Dovecot) and `snappymail` (webmail), proxied through 1Panel OpenResty + Cloudflare.

## Prerequisites

- VPS with outbound port 25 open (check: `timeout 3 bash -c 'echo > /dev/tcp/smtp.gmail.com/25'`)
- Docker + Docker Compose
- Domain with Cloudflare DNS
- 1Panel OpenResty for reverse proxy

## Deployment

### 1. docker-compose.yml

Reference: `references/docker-compose.yml` — contains the exact working configuration.

Key points:
- `docker-mailserver` on ports 25 (SMTP), 143 (IMAP), 587 (submission), 993 (IMAPS)
- `snappymail` for webmail — uses port **8888** internally, NOT port 80
- Shared Docker network `mailnet` for inter-container communication
- SnappyMail needs `tls://mailserver` as IMAP/SMTP host (uses container name)

### 2. Create admin account

docker-mailserver requires at least one account before Dovecot starts (120-second grace period):

```bash
docker exec mailserver setup email add admin@aklibk.com <password>
docker restart mailserver
```

### 3. DNS Records (Cloudflare)

| Type | Name | Value | Proxied |
|------|------|-------|---------|
| A | mail | VPS_IP | No (email cannot be proxied) |
| MX | @ | mail.aklibk.com (priority 10) | - |
| TXT | @ | v=spf1 mx a:mail.aklibk.com ip4:VPS_IP ~all | - |
| TXT | mail._domainkey | (auto-generated DKIM) | - |

Generate DKIM: `docker exec mailserver setup config dkim`
Get DKIM value: `cat /opt/mailserver/config/opendkim/keys/<domain>/mail.txt`

### 4. Nginx Proxy (1Panel OpenResty)

SnappyMail runs on 127.0.0.1:8888. Create Nginx config:

```
server {
    listen 80;
    server_name mail.aklibk.com;
    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SnappyMail Webmail

- Image: `ghcr.io/the-djmaze/snappymail:latest`
- Internal port: **8888** (not 80 — map host:8888 → container:8888)
- Container connects to mailserver via Docker network, using SSL
- First visit: set up admin account, then configure IMAP/SMTP to `tls://mailserver`
- Data persisted in `./snappymail:/snappymail/data`

## CRITICAL: Enable Docker Relaying (PERMIT_DOCKER)

Without this setting, webmail (SnappyMail) sending external emails gets:

```
554 5.7.1 <recipient@external.com>: Relay access denied
```

**Root cause:** Postfix `mynetworks` is empty by default, so the webmail container's SMTP connection is rejected.

**Fix:** Add `PERMIT_DOCKER=network` to the mailserver environment:

```yaml
environment:
  - PERMIT_DOCKER=network    # ← MUST add this
  - SSL_TYPE=snakeoil
```

Then recreate: `docker compose up -d --force-recreate mailserver`

**Verify after fix:**
```bash
docker exec mailserver grep "^mynetworks" /etc/postfix/main.cf
# Expected: mynetworks = 127.0.0.0/8 [::1]/128 [fe80::]/64 172.16.0.0/12
# The 172.16.0.0/12 range covers all Docker bridge networks (172.17-172.31.x.x)
```

| Value | What it allows |
|-------|---------------|
| `none` (default) | No Docker containers can relay |
| `container` | Legacy `--link` only. Does NOT work with docker-compose networks |
| `network` | Permits all containers on the same Docker network — **recommended** |
| `connected-networks` | Permits all connected Docker networks |

## Cross-Network Integration (App + Mailserver on Different Networks)

When your app (e.g., New-API) and mailserver are on different Docker networks, the container name `mailserver` won't resolve from the app container.

**Step 1 — Connect:**
```bash
docker network connect <mailserver_network_name> <app_container_name>
```

**Step 2 — CRITICAL: restart the app container** — `docker network connect` can kill the docker-proxy for host port mappings. Without restart, the container is unreachable from the host loopback (`Connection refused`):
```bash
docker restart <app_container_name>
```

**Step 3 — Persist in docker-compose.yml:**
```yaml
services:
  your-app:
    networks:
      - your-app-network
      - mailserver_mailnet     # add the mailserver's network

networks:
  mailserver_mailnet:
    external: true             # must be external
```

## Configuring External Clients

Users connect to `mail.aklibk.com`:

| Protocol | Port | Security |
|----------|------|----------|
| IMAP | 143 | STARTTLS |
| IMAPS | 993 | SSL/TLS |
| SMTP | 587 | STARTTLS |

## Pitfalls

1. **Port 25 MUST be publicly accessible** — Bind `"25:25"` NOT `"127.0.0.1:25:25"`. SMTP cannot be proxied through HTTP reverse proxies. This is the #1 cause of "can send but cannot receive".

2. **nftables raw table can block SMTP** — Docker may insert `ip daddr 127.0.0.1 iifname != "lo" tcp dport 25 ... drop` rules. Check with `nft list chain ip raw PREROUTING | grep 25`. Remove with `nft delete rule ip raw PREROUTING handle <N>`.

3. **SnappyMail port mismatch**: The container listens on port 8888 internally, NOT port 80. Docker port mapping must be `host:8888 → container:8888`, NOT `host:8888 → container:80`.
2. **First account timeout**: docker-mailserver waits 120 seconds for the first account. Create it immediately after first start, then restart with `docker restart mailserver`.
3. **Planned service accounts**: docker-mailserver also needs `docker exec mailserver setup email add` for its management mechanisms (postmaster, abuse, etc.).
4. **Port 8080 conflicts**: If deploying alongside other services, 8080 is commonly used. Use port 8888 for SnappyMail to avoid conflicts.
5. **Roundcube issues**: `roundcube/roundcubemail` image uses DocumentRoot `/var/www/html/public_html` but files are at `/var/www/html/`, causing 404. SnappyMail is more reliable.
6. **dkim key rotation**: DKIM keys should be rotated periodically (every 6 months). Re-generate with `setup config dkim` and update the Cloudflare TXT record.
7. **No PTR**: Without reverse DNS (PTR record), deliverability to Gmail/Outlook will be poor. Contact hosting provider to set PTR pointing to mail.aklibk.com.
8. **PERMIT_DOCKER missing**: If webmail can't send external emails with `554 5.7.1 Relay access denied`, add `PERMIT_DOCKER=network` to mailserver env and recreate.
9. **docker network connect kills port mapping**: After connecting a container to another network with `docker network connect`, always `docker restart <container>` to restore the docker-proxy. Otherwise the port becomes unreachable from 127.0.0.1.
