# Cloudflare Mail DNS Records Management

Manage MX, SPF, and DKIM DNS records for a mail server via the Cloudflare API. This covers adding records and, critically, **cleaning up duplicates** — a common source of silent failures.

## Prerequisites

```text
CF_EMAIL=your@email.com      # Cloudflare account email
CF_KEY=your-global-api-key   # Cloudflare Global API Key (from Account → API Tokens)
ZONE_ID=your-zone-id         # Zone ID for the domain (from Cloudflare dashboard Overview)
```

Zone IDs from memory:
- aklibk.com: `db8c625f55e3608e51b3b5481337a1b7`
- wf1.one: `8ac66d14af8d5df62a46744f227f741f`

## List All Existing DNS Records

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=50" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_KEY" \
  -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('result', []):
    c = r['content'][:70]
    n = r['name'][:30]
    print(f\"{r['type']:5} {r['id'][:24]} {n:30} {c}\")
"
```

## Filter for Mail Records

```bash
# MX records
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=MX" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json"

# TXT records for the domain (SPF)
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=TXT&name=$DOMAIN" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json"

# TXT records for DKIM
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=TXT&name=mail._domainkey.$DOMAIN" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json"
```

## Add MX Record

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json" \
  -d '{"type":"MX","name":"'$DOMAIN'","content":"mail.'$DOMAIN'","priority":10,"ttl":120}'
```

- Mail **MUST** be gray cloud (proxied=false). The Cloudflare API defaults to unproxied for MX records (MX records are not proxiable anyway).

## Add SPF Record

### Good SPF value for a basic mail server
```
v=spf1 mx a:mail.yourdomain.com ip4:YOUR_VPS_IP ~all
```

- `mx` — allows any host listed in the MX record to send
- `a:mail.yourdomain.com` — allows the mail subdomain A record's IP to send (belt-and-suspenders)
- `ip4:VPS_IP` — explicitly allows the VPS IP
- `~all` — softfail (mark as suspicious but don't reject). Use `-all` for strict reject.

### API call
```bash
# ⚠️ Check for EXISTING SPF records FIRST — see "Duplicate Detection" below
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json" \
  -d '{"type":"TXT","name":"'$DOMAIN'","content":"v=spf1 mx a:mail.'$DOMAIN' ip4:VPS_IP ~all","ttl":120}'
```

## Add DKIM Record

### Generate DKIM keys
```bash
docker exec mailserver setup config dkim
# Output file: /opt/mailserver/config/opendkim/keys/$DOMAIN/mail.txt
cat /opt/mailserver/config/opendkim/keys/$DOMAIN/mail.txt
```

The file contains a multi-line TXT record value. Extract the single-line value:

```
v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgk...QIDAQAB
```

### API call
```bash
# ⚠️ Check for EXISTING DKIM records FIRST — see "Duplicate Detection" below
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json" \
  -d '{"type":"TXT","name":"mail._domainkey.'$DOMAIN'","content":"v=DKIM1; h=sha256; k=rsa; p=PUBLIC_KEY","ttl":120}'
```

### DKIM value pitfalls
- The output from `cat /opt/mailserver/config/opendkim/keys/$DOMAIN/mail.txt` is in **bind zone file format** with multi-line wrapping. Do NOT copy it as-is — combine the quoted parts and strip the parentheses.
- Cloudflare accepts a single TXT value up to 512 chars. DKIM public keys are ~400 chars, which fits.
- If the value exceeds 512 chars, Cloudflare auto-splits into multiple records. This is fine.

## ⚠️ CRITICAL: Duplicate Detection & Cleanup

### The Problem
- Cloudflare allows **multiple** TXT records with the same name
- For **SPF**: The SPF RFC says multiple SPF records = PERMERROR → all mail gets rejected
- For **DKIM**: Multiple DKIM records cause verification failures (receiving servers don't know which key to trust)
- Common sources of duplicates:
  - Re-running the creation command without deleting the previous record
  - An older deployment that left incomplete/broken records (e.g., truncated DKIM record without a public key)
  - Manual copy-paste in the Cloudflare dashboard that created a second entry

### Detection Script

```python
import urllib.request, json

cf_email = "your@email.com"
cf_key = "your-global-api-key"
zone_id = "your-zone-id"
domain = "yourdomain.com"

headers = {
    "X-Auth-Email": cf_email,
    "X-Auth-Key": cf_key,
    "Content-Type": "application/json",
}

def get_records(params):
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?{params}"
    req = urllib.request.Request(url, headers=headers)
    return json.loads(urllib.request.urlopen(req).read()).get("result", [])

# Check SPF records
spf_records = get_records(f"type=TXT&name={domain}")
spf_count = len([r for r in spf_records if r["content"].startswith("v=spf1")])
print(f"SPF records: {spf_count}")
for r in spf_records:
    if r["content"].startswith("v=spf1"):
        print(f"  ID={r['id']}  value={r['content'][:60]}")

# Check DKIM records
dkim = get_records(f"type=TXT&name=mail._domainkey.{domain}")
print(f"DKIM records: {len(dkim)}")
for r in dkim:
    print(f"  ID={r['id']}  value={r['content'][:60]}")

# If any count > 1, we need to delete duplicates
```

### Duplicate Cleanup via API

```bash
# Delete a single DNS record by ID
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" -H "Content-Type: application/json"
```

**Strategy for deciding what to keep:**
- **SPF**: Keep the one with the most specific/comprehensive value. Delete the simpler one (e.g., keep `v=spf1 mx a:mail.domain.com ip4:1.2.3.4 ~all`, delete `v=spf1 mx ~all`).
- **DKIM**: Keep the one with the complete RSA public key (`p=MIIBIj...`). Delete any incomplete ones (e.g., `"v=DKIM1; h=sha256; k=rsa;` with no `p=` value — likely a truncation artifact from a multi-line copy).

## Verify DNS Propagation

```bash
# From a clean resolver (Google DNS)
dig +short MX $DOMAIN @8.8.8.8
dig +short TXT $DOMAIN @8.8.8.8 | grep spf
dig +short TXT mail._domainkey.$DOMAIN @8.8.8.8 | head -1
```

DNS records via Cloudflare typically propagate within 1–5 minutes.

## Reference: Real Diagnostic Session

In a real session (June 2026, aklibk.com), the following was found:

```text
# BEFORE cleanup:
TXT   aklibk.com                     v=spf1 mx ~all                           ← NEW, simple
TXT   aklibk.com                     v=spf1 mx a:mail.aklibk.com ip4:149.104.8.237 ~all  ← OLD, detailed
TXT   mail._domainkey.aklibk.com     v=DKIM1; h=sha256; k=rsa; p=MIIBIjAN...  ← NEW, complete
TXT   mail._domainkey.aklibk.com     "v=DKIM1; h=sha256; k=rsa;               ← OLD, truncated (BROKEN)

# AFTER cleanup (deleted the simpler SPF and the truncated DKIM):
TXT   aklibk.com                     v=spf1 mx a:mail.aklibk.com ip4:149.104.8.237 ~all
TXT   mail._domainkey.aklibk.com     v=DKIM1; h=sha256; k=rsa; p=MIIBIjAN...
```

Lesson: always list existing records before adding new ones, and clean up duplicates immediately.
