# Cloudflare API — DNS & SSL Quick Reference

## Credentials

```
Email:    CF email address
API Key:  Cloudflare Global API Key
Zone ID:  Found in Cloudflare dashboard > Overview > API > Zone ID
```

## Common Operations

### Create A Record (proxied, orange cloud)

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"subdomain","content":"1.2.3.4","proxied":true,"ttl":1}'
```

### Create CNAME Record (unproxied, gray cloud — required for Vercel)

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"subdomain","content":"target.vercel-dns.com","proxied":false,"ttl":120}'
```

### Delete Record

```bash
# First get the record ID
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A&name=domain.com"
# Then delete by ID
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID"
```

### List All Zones

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" | python3 -c "import json,sys;d=json.load(sys.stdin);[print(z['name'],z['id']) for z in d['result']]"
```

### Set SSL Mode to Flexible (fixes 525 error)

```bash
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/ssl" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"value":"flexible"}'
```

SSL mode values: `off`, `flexible`, `full`, `strict`

## 525 Error Diagnosis

| Symptom | Cause | Fix |
|---------|-------|-----|
| 525 SSL Handshake Failed | Cloudflare trying HTTPS to origin, origin has no SSL | Set SSL to `flexible` |
| 526 Invalid SSL Certificate | Origin cert expired or invalid | Set SSL to `flexible` or fix cert |
| 520/521/522 | Origin unreachable or returned error | Check origin server is running |

## Purge Cache

```bash
# Purge entire zone cache
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Can also purge by URL, host, or tag prefix — see Cloudflare API docs.
