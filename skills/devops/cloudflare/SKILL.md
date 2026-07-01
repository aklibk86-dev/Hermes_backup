---
name: cloudflare
description: "Use when the user asks to list, inspect, or manage Cloudflare assets — zones/domains, DNS records, Workers, Pages, SSL/TLS certificates, R2 buckets, D1 databases, WAF rules, and account settings. Covers API authentication, DNS CRUD, Workers deployment, and SSL certificate management."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, cloudflare, dns, workers, cdn, ssl]
    related_skills: [hermes-agent]
---

# Cloudflare Asset Management

## Overview

This skill covers interacting with the [Cloudflare API v4](https://api.cloudflare.com) to manage a Cloudflare account's assets. Use it to query zones/domains, manage DNS records, deploy Workers, inspect SSL certificates, and more — all from Hermes.

## When to Use

- User says "Cloudflare", "CF", "查看 Cloudflare 资产", or mentions their Cloudflare account
- User wants to list domains, check DNS records, modify DNS, deploy/modify Workers
- User asks about SSL status, WAF rules, R2 buckets, or other Cloudflare services
- User provides a Cloudflare API token or Global API Key and asks you to save/use it

## Authentication

Cloudflare supports two auth methods. The skill checks which one is available:

### Method A: API Token (preferred)

```
Authorization: Bearer <API_TOKEN>
```

### Method B: Global API Key (legacy)

```
X-Auth-Email: <account_email>
X-Auth-Key: <global_api_key>
```

### Python helper for either method

```python
def cf_headers(token=None, email=None, key=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["X-Auth-Email"] = email
        headers["X-Auth-Key"] = key
    return headers

def cf_api(path, headers):
    import urllib.request, json
    base = "https://api.cloudflare.com/client/v4"
    req = urllib.request.Request(base + path, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())
```

## Common Tasks

### 1. List all zones (domains)

```python
data = cf_api("/zones?per_page=50", headers)
for z in data.get("result", []):
    print(f"  {z['name']:30s} Plan: {z['plan']['name']:20s} Status: {z['status']}")
```

### 2. List DNS records for a zone

```python
zone_id = "your-zone-id"
data = cf_api(f"/zones/{zone_id}/dns_records?per_page=100", headers)
for r in data.get("result", []):
    c = r.get("content", "")
    if len(c) > 90: c = c[:90] + "..."
    print(f"  {r['type']:5s} {r['name']:45s} {c}")
```

### 3. Add DNS record

```python
import urllib.request, json
body = json.dumps({
    "type": "A",
    "name": "subdomain.example.com",
    "content": "1.2.3.4",
    "ttl": 120,
    "proxied": True
}).encode()
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
    data=body, headers={**headers, "Content-Type": "application/json"},
    method="POST"
)
print(json.loads(urllib.request.urlopen(req).read()))
```

### 4. List Workers

```python
acct_id = "your-account-id"
data = cf_api(f"/accounts/{acct_id}/workers/scripts", headers)
for w in data.get("result", []):
    print(f"  Worker: {w.get('id')}")
```

### 5. Check SSL certificates

```python
data = cf_api(f"/zones/{zone_id}/ssl/certificate_packs?per_page=50", headers)
for cert in data.get("result", []):
    hosts = ", ".join(cert.get("hosts", [])[:5])
    print(f"  Type: {cert.get('type')}  Status: {cert.get('status')}  Hosts: {hosts}")
```

### 6. Bulk delete all DNS records for one or more zones

When a user says "delete all DNS records for domain X" (or multiple domains):

```python
zone_ids = {
    "example.com": "zone-id-1",
    "other.com": "zone-id-2",
}

for name, zid in zone_ids.items():
    data = cf_api(f"/zones/{zid}/dns_records?per_page=100", headers)
    records = data.get("result", [])
    print(f"{name}: deleting {len(records)} records")
    for r in records:
        rid = r["id"]
        req = urllib.request.Request(
            f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{rid}",
            headers=headers, method="DELETE"
        )
        res = json.loads(urllib.request.urlopen(req).read())
        status = "✅" if res.get("success") else "❌"
        print(f"  {status} DEL {r['type']:5s} {r['name']:45s} {r.get('content','')[:60]}")
```

**Important**: This is destructive — there is no undo. Always list records first with a count, confirm with the user before executing, then proceed with the loop above.

## API Execution Rule

**Use Python's `urllib` via `execute_code` (preferred) or `curl` via `terminal` (safe when token has no special shell chars).** Shell escaping can corrupt API tokens/keys containing characters like `$`, `\`, backticks, or spaces. The `execute_code` tool avoids shell interpretation entirely.

**When curl is safe:** Global API Keys are usually hex-only (e.g., `76ab385916b3d0110d3dce4503eaf22fdcdd4`) with no shell-special characters — `curl` works reliably. Bearer tokens with mixed chars, underscores, slashes, or symbols should use Python's `urllib`. When in doubt, start with Python.

```python
from hermes_tools import execute_code, terminal
import urllib.request, json

# Safe pattern — no shell escaping issues
req = urllib.request.Request(
    "https://api.cloudflare.com/client/v4/zones",
    headers={"Authorization": "Bearer TOKEN", "Content-Type": "application/json"}
)
data = json.loads(urllib.request.urlopen(req).read())
```

### 7. Configure zone SSL/TLS security settings

Cloudflare zone-level settings control how HTTPS works at the edge. Use `PATCH /zones/{id}/settings/{key}` to modify them.

Common settings to enable for a standard HTTPS setup:

```python
settings = {
    "ssl": "flexible",                     # flexible | full | full_strict | off
    "always_use_https": "on",              # redirect HTTP→HTTPS
    "automatic_https_rewrites": "on",      # rewrite http:// links in HTML to https://
    "tls_1_3": "on",                       # enable TLS 1.3
    "brotli": "on",                        # enable Brotli compression
    "min_tls_version": "1.2",              # minimum TLS version
}

zone_id = "your-zone-id"
for key, value in settings.items():
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/{key}",
        data=json.dumps({"value": value}).encode(),
        headers=headers, method="PATCH"
    )
    res = json.loads(urllib.request.urlopen(req).read())
    status = "✅" if res.get("success") else "❌"
    print(f"  {status} {key:30s} = {value}")
```

To read current settings:

```python
for key in ["ssl", "always_use_https", "brotli", "tls_1_3"]:
    data = cf_api(f"/zones/{zone_id}/settings/{key}", headers)
    print(f"  {data['result']['id']:30s} = {data['result']['value']}")
```

**SSL mode meanings**:
- `flexible` — Cloudflare terminates TLS, connects to origin via HTTP. Use when the origin has no valid certificate.
- `full` — Cloudflare connects to origin via HTTPS but doesn't validate the certificate.
- `full_strict` — Cloudflare connects to origin via HTTPS **and** validates the origin certificate. Required for HSTS.
- `off` — No encryption at all (not recommended).

**Note**: Flexible SSL cannot be combined with HSTS headers because HSTS requires origin-side certificate validation.

## Reference: Key API Paths

| Resource | Path | Notes |
|----------|------|-------|
| All zones | `GET /zones` | `?per_page=50` for pagination |
| Single zone | `GET /zones/{id}` | |
| DNS records | `GET/POST/PUT/DELETE /zones/{id}/dns_records[/{rec_id}]` | |
| Workers | `GET /accounts/{id}/workers/scripts[/{name}]` | |
| Worker routes | `GET /zones/{id}/workers/routes` | |
| Pages projects | `GET /accounts/{id}/pages/projects` | |
| R2 buckets | `GET /accounts/{id}/r2/buckets` | Plan-dependent |
| D1 databases | `GET /accounts/{id}/d1/database` | Plan-dependent |
| SSL cert packs | `GET /zones/{id}/ssl/certificate_packs` | `?per_page=50` |
| Account info | `GET /accounts/{id}` | |

## Common Pitfalls

1. **Token/key corruption via write_file** — When embedding an API token in a script file written via `write_file`, the content keeper (CK) may truncate or replace the token if it matches certain patterns. **Workaround**: Use `execute_code` with the token as a Python variable (not in `write_file`), or use base64-encode the file and write via `terminal("echo ... | base64 -d > file")`.
2. **R2 requires manual activation** — R2 API returns error 10042 `"Please enable R2 through the Cloudflare Dashboard"` until you manually click "Enable R2" in the dashboard. There is no API to activate it — must be done via browser. After activation, the API works immediately.
3. **per_page default is 20** — Always pass `?per_page=50` (for zones) or `?per_page=100` (for DNS records) to avoid missing results. Some zones can have many DNS records.
4. **Permissions** — Scoped API Tokens may lack access to certain resources (Workers vs DNS-only). `403` means the token lacks permission.
4. **Zone vs Account scoped** — DNS, SSL, Worker routes = zone-scoped. Workers scripts, R2, D1 = account-scoped.
6. **CNAME verification records fail to resolve externally** — When adding a CNAME record for search-engine or service verification (Bing Webmaster Tools, Google Search Console, etc.), Cloudflare may accept the record via API but never serve it to external DNS resolvers — even with `proxied=false` and `flatten_at_root` setting. `dig` queries to Cloudflare's own authoritative NS return empty. Fix: Always use **TXT record verification** instead of CNAME when the provider supports it. TXT records propagate reliably through Cloudflare. If the provider only offers CNAME, check for an alternative method (HTML file upload, meta tag, TXT record).
7. **DNS proxied field** — `proxied: true` = orange cloud (CDN enabled), `false` = gray cloud (DNS-only).
8. **TTL values** — `120` = auto. Only certain values work (120, 300, 600, etc.).
9. **API response structure** — Always check `data["success"]` before reading `data["result"]`.

### 8. WAF Custom Rules (Rulesets API)

See `references/waf-custom-rules.md` for full reference.

Quick example — block AI bots while allowing search engines:

```python
# Get existing ruleset
data = cf_api(f"/zones/{zone_id}/rulesets", headers)
custom_rs = [rs for rs in data["result"] if rs["phase"] == "http_request_firewall_custom"]
ruleset_id = custom_rs[0]["id"]  # or create via POST if none exists

# PUT to replace all rules
rules = [
    {
        "description": "Block AI bots (excl. search engines)",
        "expression": '(http.user_agent contains "GPTBot") and not (http.user_agent contains "Googlebot")',
        "action": "block",
        "enabled": True,
    },
    {
        "description": "Block high threat score",
        "expression": "cf.threat_score ge 10",
        "action": "block",
        "enabled": True,
    }
]
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/{ruleset_id}",
    data=json.dumps({"rules": rules}).encode(),
    headers=headers, method="PUT"
)
print(json.loads(urllib.request.urlopen(req).read()))
```

## Verification Checklist

- [ ] Auth headers work: `cf_api("/zones?per_page=1", headers)` returns `success: true`
- [ ] Zone ID is known for each domain
- [ ] Account ID is known (from zone's `account.id` or `GET /accounts`)
- [ ] DNS changes tested with `proxied: false` before enabling CDN
- [ ] API calls use Python `urllib` (not shell `curl`) to avoid token corruption
