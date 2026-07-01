---
name: docker-mail-server
category: devops
description: "Deploy a self-hosted email server with Docker — Postfix/Dovecot SMTP+IMAP, SnappyMail webmail, Let's Encrypt SSL. Covers docker-mailserver deployment, DNS records (MX/SPF/DKIM), certbot SSL with containerized Nginx, and integration with New-API or other services."
tags:
  - email
  - postfix
  - dovecot
  - smtp
  - webmail
  - snappymail
  - letsencrypt
  - certbot
  - docker
  - mailserver
triggers:
  - email
  - smtp
  - mail server
  - self-hosted email
  - webmail
  - docker mail
  - postfix
  - dovecot
  - "自建邮箱"
  - "邮件服务器"
---

# Docker Mail Server Deployment

Deploy a full self-hosted mail stack with Docker: SMTP (Postfix), IMAP (Dovecot), and Webmail (SnappyMail). Designed for VPS deployments behind Nginx/OpenResty with Cloudflare DNS.

## Overview

| Component | Image | Purpose |
|-----------|-------|---------|
| Mail Server | `mailserver/docker-mailserver:latest` | Postfix SMTP + Dovecot IMAP + OpenDKIM |
| Webmail | `ghcr.io/the-djmaze/snappymail:latest` | Web-based email client (nginx + php) |
| SSL | Let's Encrypt via certbot | HTTPS for webmail |

## Architecture

```
                      PUBLIC INTERNET
                           │
            ┌──────────────┼──────────────┐
            │              │              │
         SMTP:25       IMAP:143       HTTPS:443
      (EXTERNAL!)     (127.0.0.1)   (OpenResty)
            │              │              │
            ▼              ▼              ▼
    [mailserver]     [127.0.0.1:143]  [127.0.0.1:8888]
    (Postfix +        (Dovecot)       (SnappyMail)
     Dovecot)             │              │
    172.24.0.2:25     ────┘      ┌──────┘
            │                    │
            ▼                    ▼
    /var/mail/          snappymail/data/
```

**Key architectural rule:**
- **Port 25 (SMTP)**: External mail servers connect DIRECTLY to Postfix. Cannot be proxied through Nginx/OpenResty. PORT MUST BE PUBLICLY ACCESSIBLE (`0.0.0.0:25`).
- **Ports 143/587/993 (IMAP/SMTP Submission)**: Can bind to `127.0.0.1` because webmail (SnappyMail) reaches them over the Docker internal network.
- **Port 8888 (SnappyMail webmail)**: Goes through 1Panel OpenResty + Cloudflare, bound to `127.0.0.1`.

## DNS Records Required

### For the mail domain (e.g., aklibk.com, mail.aklibk.com):

| Type | Name | Value | Proxied |
|------|------|-------|---------|
| A | mail | VPS_IP | No (gray cloud, email doesn't go through CDN) |
| MX | @ | mail.aklibk.com (priority 10) | N/A |
| TXT | @ | `v=spf1 mx a:mail.yourdomain.com ip4:VPS_IP ~all` | N/A |
| TXT | mail._domainkey | (generated DKIM record) | N/A |

**Important:** Mail-related DNS records (A for mail subdomain) MUST be DNS-only (gray cloud/unproxied). Cloudflare proxy (orange cloud) breaks SMTP and IMAP protocols.

**Verify DNS propagation:**
```bash
dig +short MX yourdomain.com
dig +short mail.yourdomain.com
# If empty, DNS hasn't propagated or records are missing in Cloudflare
```

## docker-compose.yml

```yaml
services:
  mailserver:
    image: mailserver/docker-mailserver:latest
    container_name: mailserver
    hostname: mail
    domainname: yourdomain.com
    restart: always
    ports:
      - "25:25"              # SMTP (RECEIVING) — MUST be 0.0.0.0 for inbound. See ⚠️ below.
      - "127.0.0.1:143:143"  # IMAP
      - "127.0.0.1:587:587"  # SMTP Submission
      - "127.0.0.1:993:993"  # IMAPS
    volumes:
      - ./data:/var/mail
      - ./config:/tmp/docker-mailserver
      - ./state:/var/mail-state
      - ./logs:/var/log/mail
    environment:
      - ENABLE_SPAMASSASSIN=0
      - ENABLE_CLAMAV=0
      - ENABLE_FAIL2BAN=0
      - ENABLE_POSTGREY=0
      - SSL_TYPE=snakeoil
      - TZ=Asia/Shanghai
      - POSTMASTER_ADDRESS=admin@yourdomain.com
    cap_add:
      - NET_ADMIN
      - SYS_PTRACE
    networks:
      - mailnet

  webmail:
    image: ghcr.io/the-djmaze/snappymail:latest
    container_name: snappymail
    restart: always
    ports:
      - "127.0.0.1:8888:8888"  # SnappyMail uses 8888 internally, NOT 80
      - "127.0.0.1:8443:443"
    volumes:
      - ./snappymail:/snappymail/data
    environment:
      - TZ=Asia/Shanghai
    depends_on:
      - mailserver
    networks:
      - mailnet

networks:
  mailnet:
    driver: bridge
```

**⚠️ SnappyMail Port Quirk:** SnappyMail runs nginx on port 8888 internally, NOT port 80. Map `host:8888 → container:8888`, NOT `host:8888 → container:80`.

**⚠️ CRITICAL: Port 25 MUST be publicly accessible for receiving email!**

Unlike web apps behind Nginx, SMTP (port 25) cannot be proxied through HTTP reverse proxies. Other mail servers connect directly via the SMTP protocol.

- WRONG (only localhost can access — external mail servers cannot deliver): `"127.0.0.1:25:25"`
- CORRECT (publicly accessible): `"25:25"` or `"0.0.0.0:25:25"`

Ports 143/587/993 can stay on `127.0.0.1` if only accessed via webmail (SnappyMail talks to them over the Docker internal network). But port 25 **must** be openly accessible.

Check if port 25 is reachable from the public internet:
```bash
# From a different machine (or from the same VPS using its public IP):
timeout 5 bash -c 'echo EHLO test | nc -w5 YOUR_VPS_IP 25' 
# ✓ Success: 220 mail.yourdomain.com ESMTP
# ✗ Failure: timeout / connection refused
```

**Check firewall/nftables:** If port 25 is bound to `0.0.0.0` but still unreachable, check:
1. Software firewalls (`ufw status`, `nft list ruleset`)
2. The `raw` table in nftables — Docker may add drop rules for `127.0.0.1:dport 25 iifname != "lo"` which interferes
3. VPS provider firewall (Akile, Vultr, DO control panels often block port 25 by default)
4. Cloudflare proxy setting — must be gray cloud (DNS-only), not orange cloud

## Step-by-Step Deployment

### 1. Create directories and compose file

```bash
mkdir -p /opt/mailserver/snappymail
cd /opt/mailserver
# create docker-compose.yml as above
```

### 2. Start the mail server

```bash
docker compose up -d mailserver
```

### 3. Create a mail account

The mailserver requires at least one account before Dovecot starts (120s timeout):

```bash
docker exec mailserver setup email add admin@yourdomain.com YourPassword
docker restart mailserver
```

List accounts: `docker exec mailserver setup email list`

### 4. Start webmail

```bash
docker compose up -d webmail
```

### 5. Verify everything works

```bash
# SMTP
echo "EHLO test" | timeout 3 nc 127.0.0.1 25
# IMAP
echo "a1 LOGIN user@domain pass" | timeout 5 nc 127.0.0.1 143
# Webmail
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8888/
```

### 6. Generate DKIM key

```bash
docker exec mailserver setup config dkim
# Record is in: /opt/mailserver/config/opendkim/keys/yourdomain.com/mail.txt
```

Add the DKIM TXT record to DNS. Value format: `"v=DKIM1; h=sha256; k=rsa; p=..."`

### 7. Set up SSL for webmail

Since mail.aklibk.com is DNS-only (gray cloud), certbot can use standalone mode:

```bash
# Temporarily stop Nginx
docker stop 1Panel-openresty-xxx

# Get certificate
certbot certonly --standalone -d mail.yourdomain.com \
  --non-interactive --agree-tos -m admin@yourdomain.com

# Restart Nginx  
docker start 1Panel-openresty-xxx
```

**Alternative (no downtime):** Use `--webroot` mode. Create an Nginx location for ACME challenge:

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /path/to/webroot;
}
```

Then: `certbot certonly --webroot -w /path/to/webroot -d mail.yourdomain.com`

**Copy certs into the Nginx container's SSL directory** (if OpenResty has a mounted SSL volume):

```bash
mkdir -p /host/path/to/ssl/mail.yourdomain.com
cp /etc/letsencrypt/live/mail.yourdomain.com/fullchain.pem /host/path/to/ssl/mail.yourdomain.com/
cp /etc/letsencrypt/live/mail.yourdomain.com/privkey.pem /host/path/to/ssl/mail.yourdomain.com/
```

### 8. Nginx/OpenResty config

```nginx
server {
    listen 80;
    server_name mail.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name mail.yourdomain.com;

    ssl_certificate /path/inside/container/ssl/mail.yourdomain.com/fullchain.pem;
    ssl_certificate_key /path/inside/container/ssl/mail.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8888;
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

## SnappyMail Webmail Configuration

After deployment, visit https://mail.yourdomain.com.

**First-time setup (no admin login needed for single-user):**
1. Click "Add Account" on the login page
2. Enter: Email = admin@yourdomain.com, Password = your password
3. IMAP server: `mailserver` (Docker service name, same network)
4. SMTP server: `mailserver` (Docker service name)
5. Connection security: STARTTLS on IMAP, STARTTLS on SMTP (both use port 143/587 with STARTTLS)
6. SnappyMail auto-detects settings via DNS

If auto-detection fails, manual config:
- IMAP: port 143, STARTTLS
- SMTP: port 587, STARTTLS
- Username: Full email address (admin@domain.com)

## Integrating with New-API

In New-API admin → System Settings → Email:

| Parameter | Value |
|-----------|-------|
| SMTP Host | 127.0.0.1 |
| SMTP Port | 25 |
| From Address | no-reply@yourdomain.com or admin@yourdomain.com |
| Username/Password | Leave blank (Postfix allows localhost connections without auth) |

**If New-API and mailserver are on different Docker networks**, the container name `mailserver` won't resolve. Connect them:

```bash
docker network connect mailserver_mailnet new-api
```

⚠️ **After `docker network connect`, restart the container** — the docker-proxy port mapping may be lost, making the service unreachable from the host loopback (`127.0.0.1:PORT` → `Connection refused`):
```bash
docker restart new-api
```

And persist in docker-compose.yml — see **`references/cross-network-integration.md`** for details (including the port-mapping-loss pitfall).

## Alternative Mail Server Options

| Option | Pros | Cons |
|--------|------|------|
| docker-mailserver | Lightweight, well-documented, active development | No built-in webmail, config-based |
| SnappyMail | Modern webmail, auto-detects config, works with docker-mailserver | Separate container, needs configuration |
| Mailu | Full stack (admin UI + webmail), Chinese-friendly | Heavier, more complex DNS setup |
| Mailcow | Most features, easy web admin | Heavy (4GB+ RAM), complex |
| Postfix standalone SMTP | Minimal, for outbound-only use | No webmail, no receiving |

## Troubleshooting

### Can't Receive Email — Diagnostic Checklist

When the server can send but NOT receive email, follow this systematic flow:

```
1. DNS → 2. Port binding → 3. Firewall → 4. Postfix domain → 5. Provider
```

#### Step 1 — DNS Records

```bash
# Check MX record
dig +short MX yourdomain.com
# Expected: mail.yourdomain.com

# Check A record for mail subdomain
dig +short mail.yourdomain.com
# Expected: VPS_IP (gray cloud in Cloudflare — NOT proxied)
```

If empty, add/verify DNS records in Cloudflare (or your DNS provider).

#### Step 2 — Port 25 binding

```bash
# Check what port 25 is actually listening on
ss -tlnp | grep ':25 '
# Expected: 0.0.0.0:25  (NOT 127.0.0.1:25)
```

If it shows `127.0.0.1:25`, change docker-compose.yml from `"127.0.0.1:25:25"` to `"25:25"` and recreate:
```bash
docker compose down
# Edit docker-compose.yml
docker compose up -d
```

#### Step 3 — Firewall & nftables

```bash
# Check raw table (Docker-inserted rules that can block SMTP)
nft list chain ip raw PREROUTING 2>/dev/null | grep 'dport 25'
# If you see: "ip daddr 127.0.0.1 iifname != \"lo\" tcp dport 25 ... drop"
# This drops external traffic to 127.0.0.1:25 BEFORE it reaches DNAT

# Check DNAT rules
nft list chain ip nat DOCKER 2>/dev/null | grep 'dport 25'
# Expected: dnat packets > 0 (showing traffic is being forwarded)

# Check software firewall
ufw status 2>/dev/null || echo "UFW not installed"
iptables -L INPUT -n --line-numbers 2>/dev/null | head -30
```

**Fix nftables issues:** If the raw table has a drop rule for port 25, remove it:
```bash
nft delete rule ip raw PREROUTING handle <HANDLE_NUMBER>
# Find handle: nft -a list chain ip raw PREROUTING | grep 'dport 25'
```

#### Step 4 — Postfix domain acceptance

```bash
# Test from localhost (simulate an incoming email from an external server)
timeout 5 bash -c '
exec 3<>/dev/tcp/127.0.0.1/25
echo "EHLO test.com" >&3; sleep 0.3
echo "MAIL FROM:<sender@test.com>" >&3; sleep 0.3
echo "RCPT TO:<admin@yourdomain.com>" >&3; sleep 0.3
echo "QUIT" >&3
cat <&3
'
# Expected: "250 2.1.5 Ok" for RCPT TO step

# Check Postfix domain config
docker exec mailserver postconf -n mydestination virtual_mailbox_domains
# Note: mydestination typically does NOT include the domain —
#   docker-mailserver uses virtual_mailbox_domains instead
# Verify the domain is in the virtual hosts file:
docker exec mailserver cat /etc/postfix/vhost
```

#### Step 5 — VPS provider blocking

Some VPS providers block port 25 at the hypervisor level (especially HK providers):
- Akile, Vultr, DigitalOcean: **block port 25 by default** — contact support to unblock
- Hetzner: allows port 25 but has strict anti-spam policies
- AWS EC2, GCP, Azure: **block port 25** — requires support ticket
- OVH: allows port 25

**Test if outbound SMTP is blocked:**
```bash
echo EHLO test | timeout 5 nc -w5 gmail-smtp-in.l.google.com 25
# Expected: "220 mx.google.com ESMTP" — outbound is open
```

**Test if inbound SMTP is reachable:**
```bash
# From the VPS itself to its public IP:
timeout 5 bash -c 'echo EHLO test | nc -w5 YOUR_VPS_IP 25'
# If this fails but 127.0.0.1:25 works, the issue is either:
#   - Port binding (127.0.0.1 only)
#   - nftables/iptables
#   - VPS provider firewall (check control panel)
```

#### Step 6 — Check container logs

```bash
# Total incoming SMTP connection count
docker logs mailserver 2>&1 | grep -c "connect from"
# If 0 or very few, no external servers have attempted to connect

# Check for rejected/lost connections
docker logs mailserver 2>&1 | grep -iE 'connect from|warning|error|reject|lost connection' | tail -20

# Check for deferred emails (outgoing that couldn't be delivered)
docker exec mailserver postqueue -p
```

See `references/port-25-diagnostics.md` for a real diagnostic session output example.

See `references/cross-network-integration.md` if the consuming service (New-API, another app) is on a different Docker network than the mailserver.

### "554 5.7.1 Relay access denied" when sending external emails

**Root cause:** Postfix `mynetworks` is empty, so the webmail container's SMTP connection is rejected.

**Fix:** Add `PERMIT_DOCKER=network` to the mailserver's environment variables:

```yaml
environment:
  - PERMIT_DOCKER=network    # ← Add this
  - SSL_TYPE=snakeoil
```

Then recreate: `docker compose up -d --force-recreate mailserver`

**Values explained:**
| Value | What it allows |
|-------|---------------|
| `none` (default) | No Docker containers can relay |
| `container` | Permits containers linked to the mailserver (legacy `--link` only) |
| `network` | Permits all containers on the same Docker network — **recommended for docker-compose setups** |
| `connected-networks` | Permits all connected Docker networks |

**Verify the fix:**
```bash
docker exec mailserver grep "^mynetworks" /etc/postfix/main.cf
# Expected: mynetworks = 127.0.0.0/8 [::1]/128 [fe80::]/64 172.16.0.0/12
# The 172.16.0.0/12 range covers Docker bridge networking (172.17-172.31.x.x)
```

### SnappyMail "Can't connect to host" (IMAP port 143 / SMTP port 25)

**Root cause:** SnappyMail's domain config points to `localhost` or wrong hostname. Since SnappyMail is in a separate Docker container, `localhost` means "the SnappyMail container itself," not the mailserver.

**Fix:** Configure IMAP/SMTP hosts to use the Docker service name `mailserver` (from docker-compose.yml service name), which Docker DNS resolves to the mailserver container IP:

| Setting | Value |
|---------|-------|
| IMAP Host | `mailserver` |
| SMTP Host | `mailserver` |
| IMAP Port | 143 (STARTTLS) |
| SMTP Port | 25 (no auth, from mynetworks) or 587 (auth) |

SnappyMail stores these in `/var/lib/snappymail/_data_/_default_/domains/<domain>.json`. The DNS resolution works because both containers share the `mailnet` Docker network.

### Email not showing in SnappyMail after login

**Check account exists:**
```bash
docker exec mailserver setup email list
# Should show: admin@yourdomain.com (exists)
```

**Check mail queue:**
```bash
docker exec mailserver postqueue -p
```

**Check how SnappyMail connects:** SnappyMail uses IMAP to fetch mail. Verify the host setting in the domain config is `mailserver` (container name), not localhost.

## Pitfalls

1. **catatnight/postfix image is incompatible with containerd v2.1+** — Uses old manifest format. Use `eeacms/postfix` or `mailserver/docker-mailserver` instead.
2. **Port 25 bound to 127.0.0.1 = cannot receive email** — Binding SMTP port to `127.0.0.1:25:25` means only localhost can connect. External mail servers will timeout. MUST use `"25:25"` or `"0.0.0.0:25:25"`. This is the #1 cause of "can send but cannot receive".
3. **nftables raw table interferes with SMTP** — Docker may insert `ip daddr 127.0.0.1 iifname != "lo" tcp dport 25 counter packets 0 bytes 0 drop` rules that drop external SMTP traffic. Check with `nft list chain ip raw PREROUTING | grep 25`.
4. **VPS provider blocks port 25 upstream** — Many HK/VPS providers (Akile, Vultr, DO) block port 25 at the hypervisor. Test inbound with `nc -w5 YOUR_VPS_IP 25` from another machine.

5. **Duplicate SPF/DKIM TXT records cause SPF PERMERROR or DKIM failures** — Cloudflare allows multiple TXT records with the same name, but the SPF spec says multiple SPF records = PERMERROR (reject all mail). Similarly, old/broken DKIM records (e.g., truncated `"v=DKIM1; h=sha256; k=rsa;"` with no public key) can coexist with valid ones. **After adding mail DNS records, always check for and remove duplicates via the Cloudflare API.** See `references/cloudflare-mail-dns-records.md` for the API workflow to add MX/SPF/DKIM and clean up duplicates.
5. **SnappyMail uses port 8888 internally**, not 80. Docker port mapping must be `host:8888 → container:8888`.
6. **docker-mailserver requires at least one account** before Dovecot starts (120s timeout). Create account immediately after first start and restart.
7. **Mail DNS must NOT be proxied by Cloudflare** — Set A record to gray cloud (DNS-only). Orange cloud breaks SMTP/IMAP protocols.
8. **Certbot standalone mode requires stopping Nginx** temporarily. Use `--webroot` mode to avoid downtime.
9. **OpenResty SSL certificate paths** are container-internal paths. Copy certs to the host's mounted SSL volume and reference the container path.
10. **Roundcube (roundcube/roundcubemail) Apache DocumentRoot issue** — The image copies files to `/var/www/html/` but Apache expects them in `/var/www/html/public_html/`. SnappyMail avoids this issue entirely.
11. **Roundcube container often crashes** on first run due to SQLite DB initialization timing. Use SnappyMail instead.
12. **Dovecot rejects plaintext auth on non-SSL connections** by default. To test IMAP, generate an app password or use SSL (993).
13. **Postfix allows relay from 127.0.0.1 by default** — no authentication needed for local services. This is the expected behavior when integrating with New-API.
