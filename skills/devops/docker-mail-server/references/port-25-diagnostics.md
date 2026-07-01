# Port 25 Diagnostics — Real Session Example

This file documents a real diagnostic session where a docker-mailserver deployment could send but NOT receive email. Use as a reference when troubleshooting "can't receive" for a similar setup.

## Environment

| Property | Value |
|----------|-------|
| VPS | 149.104.8.237 (HK, Debian 13) |
| Mail server | docker-mailserver (Postfix + Dovecot) |
| Webmail | SnappyMail |
| Proxy | 1Panel OpenResty → 127.0.0.1:8888 |
| DNS | Cloudflare (gray cloud for mail subdomain) |
| Docker binding | `127.0.0.1:25:25` ← **ROOT CAUSE** |

## Symptoms

- SnappyMail works: login, browse, compose
- Outgoing SMTP works (tested via gmail MX)
- **No incoming email** — no messages appear in inbox
- DNS MX records configured correctly in Cloudflare

## Diagnostic Steps

### Step 1 — Check Container Status

```bash
docker ps -a --filter name=mailserver --filter name=snappymail
```
→ Both containers were `Up 11 hours`. ✓

### Step 2 — Check DNS Records

```bash
dig +short MX aklibk.com
# → (empty!) ← but Cloudflare confirmed the record existed
# Solution: Cloudflare showed records existed via API but `dig` was from a stale resolver.
# Re-verify: `curl -s ... api.cloudflare.com/.../dns_records?type=MX`

dig +short mail.aklibk.com
# → (empty!)
# Cloudflare confirmed: A record for mail.aklibk.com → 149.104.8.237 (proxy=false)
```

**Lesson:** Don't trust `dig` alone on the VPS — verify via Cloudflare API when in doubt.

### Step 3 — Check Port 25 Binding

```bash
ss -tlnp | grep ':25 '
# → 127.0.0.1:25  ←  BAD! Only localhost can reach SMTP
```

**The `docker-compose.yml` had:**
```yaml
ports:
  - "127.0.0.1:25:25"   # WRONG for receiving email
```

**Expected:**
```yaml
ports:
  - "25:25"              # CORRECT — bound to all interfaces
```

### Step 4 — Check nftables (Firewall)

```bash
nft list chain ip raw PREROUTING | grep 'dport 25'
# → ip daddr 127.0.0.1 iifname != "lo" tcp dport 25 ... drop
# This rule drops ALL external traffic to 127.0.0.1:25

nft list chain ip nat DOCKER | grep 'dport 25'
# → ip daddr 127.0.0.1 iifname != "br-mailnet" tcp dport 25 dnat to 172.24.0.2:25
# But this DNAT rule also targets 127.0.0.1 — won't match external traffic
# Counter: packets 0 — never hit
```

### Step 5 — Test SMTP Locally

```bash
echo EHLO test | timeout 5 nc 127.0.0.1 25
# → 220 mail.aklibk.com ESMTP  ✓  (Postfix is running)

# Test recipient acceptance
timeout 5 bash -c '
exec 3<>/dev/tcp/127.0.0.1/25
echo "EHLO test" >&3; sleep 0.3
echo "MAIL FROM:<test@test.com>" >&3; sleep 0.3
echo "RCPT TO:<admin@aklibk.com>" >&3; sleep 0.3
echo "QUIT" >&3
cat <&3
'
# → "250 2.1.5 Ok" for RCPT TO  ✓  (domain is accepted via virtual_mailbox_domains)
```

### Step 6 — Test External Reachability

```bash
# From the VPS itself (to its public IP):
timeout 5 bash -c 'echo EHLO test | nc -w5 149.104.8.237 25'
# → TIMEOUT/REFUSED — port 25 not reachable from outside

# Test outbound SMTP (from VPS to Google):
echo EHLO test | timeout 5 nc -w5 gmail-smtp-in.l.google.com 25
# → 220 mx.google.com ESMTP  ✓  (outbound works, VPS provider doesn't block port 25)
```

### Step 7 — Check Container Logs

```bash
docker logs mailserver 2>&1 | grep -c "connect from"
# → 22 total (all from Docker internal 172.24.0.1 = SnappyMail, not from internet)
```

### Step 8 — Check Postfix Domain Config

```bash
docker exec mailserver postconf -n mydestination
# → $myhostname, localhost.$mydomain, localhost  (no explicit aklibk.com)
# This is NORMAL — docker-mailserver uses virtual_mailbox_domains instead

docker exec mailserver cat /etc/postfix/vhost
# → aklibk.com ✓ (auto-detected from postfix-accounts.cf)
```

## Root Cause Confirmed

**Port 25 was bound to `127.0.0.1` only.** External mail servers could not establish an SMTP connection.

Fix: Change `127.0.0.1:25:25` to `25:25` in docker-compose.yml and recreate.

## Diagnostic Commands Cheatsheet

```bash
# 1. DNS
dig +short MX domain.com
dig +short mail.domain.com
nslookup -type=mx domain.com

# 2. Port binding
ss -tlnp | grep ':25 '
docker port mailserver 25

# 3. Firewall
nft list chain ip raw PREROUTING | grep 'dport 25'
nft list chain ip nat DOCKER | grep 'dport 25'
iptables -L INPUT -n | grep 25
ufw status

# 4. SMTP test (localhost)
echo EHLO test | timeout 5 nc 127.0.0.1 25

# 5. SMTP test (external)
echo EHLO test | timeout 5 nc YOUR_VPS_IP 25

# 6. Outbound SMTP test
echo EHLO test | timeout 5 nc gmail-smtp-in.l.google.com 25

# 7. Postfix config
docker exec mailserver postconf -n mydestination virtual_mailbox_domains
docker exec mailserver cat /etc/postfix/vhost

# 8. Logs
docker logs mailserver 2>&1 | grep -c "connect from"
docker logs mailserver 2>&1 | grep -iE 'connect from|error|reject' | tail -20

# 9. Mail queue
docker exec mailserver postqueue -p

# 10. Provider block test (from another machine/network)
nc -w5 VPS_IP 25
```
