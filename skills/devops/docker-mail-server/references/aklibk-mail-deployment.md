# Mail Server Deployment Reference (2026-06-28)

## Domain: aklibk.com

### DNS Records
| Type | Name | Value | Notes |
|------|------|-------|-------|
| A | mail | 149.104.8.237 | Gray cloud (DNS-only) |
| MX | @ | mail.aklibk.com (priority 10) | N/A |
| TXT | @ | `v=spf1 mx a:mail.aklibk.com ip4:149.104.8.237 ~all` | SPF |
| TXT | mail._domainkey | `v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...` | DKIM |

### Containers
| Name | Image | Status |
|------|-------|--------|
| mailserver | mailserver/docker-mailserver:latest | Healthy |
| snappymail | ghcr.io/the-djmaze/snappymail:latest | Running |

### Ports
| Port | Service | Bind | Purpose |
|------|---------|------|---------|
| 25 | SMTP | **0.0.0.0** (public) | Postfix — SMTP receiving, MUST be public |
| 143 | IMAP | 127.0.0.1 | Dovecot |
| 587 | SMTP Submission | 127.0.0.1 | Postfix authenticated submission |
| 993 | IMAPS | 127.0.0.1 | Dovecot SSL |
| 8888 | HTTP | 127.0.0.1 | SnappyMail webmail behind OpenResty |

> **Note:** Port 25 was originally bound to `127.0.0.1` (could not receive email). Fixed 2026-06-29 by changing `"127.0.0.1:25:25"` to `"25:25"` in docker-compose.yml. SMTP ports are the exception to the "bind 127.0.0.1 only" policy — they cannot be proxied through HTTP reverse proxies.

### Accounts
- Email: admin@aklibk.com / NewApi2024

### SSL Certificate
- Domain: mail.aklibk.com
- Provider: Let's Encrypt (certbot 4.0.0)
- Certificate path: /etc/letsencrypt/live/mail.aklibk.com/
- Expires: 2026-09-26
- Container path: /usr/local/openresty/nginx/conf/ssl/mail.aklibk.com/

### Nginx Config
- File: /opt/1panel/apps/openresty/openresty/conf/default/mail.conf
- Routes HTTP 80 → 301 HTTPS → proxy_pass http://127.0.0.1:8888

### New-API Integration
- SMTP Host: 127.0.0.1:25 (no auth needed)
- From: admin@aklibk.com or no-reply@aklibk.com

### Deployment Commands Used
```bash
# Start mail server
cd /opt/mailserver && docker compose up -d mailserver

# Create account
docker exec mailserver setup email add admin@aklibk.com NewApi2024
docker restart mailserver

# Start webmail
docker compose up -d webmail

# DKIM
docker exec mailserver setup config dkim

# SSL (stopped Nginx first)
docker stop 1Panel-openresty-qMxV
certbot certonly --standalone -d mail.aklibk.com \
  --non-interactive --agree-tos -m admin@aklibk.com
mkdir -p /opt/1panel/apps/openresty/openresty/conf/ssl/mail.aklibk.com
cp /etc/letsencrypt/live/mail.aklibk.com/{fullchain,privkey}.pem \
  /opt/1panel/apps/openresty/openresty/conf/ssl/mail.aklibk.com/
docker start 1Panel-openresty-qMxV
nginx -s reload
```
