# Cloudflare DNS API — User Environment

This user manages DNS via Cloudflare Global API Key. All zones use **proxied** (orange cloud) A records.

## Credentials

| Item | Value |
|---|---|
| Email | `13180105117@163.com` |
| Global API Key | `76ab385916b3d0110d3dce4503eaf22fdcdd4` |
| aklibk.com Zone ID | `db8c625f55e3608e51b3b5481337a1b7` |
| wf1.one Zone ID | `8ac66d14af8d5df62a46744f227f741f` |

## Add A Record (proxied, auto-TTL)

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"subdomain.example.com","content":"1.2.3.4","proxied":true,"ttl":1}'
```

- `proxied: true` = orange cloud (Cloudflare proxy enabled)
- `ttl: 1` = auto (Cloudflare handles it)

## Add A Record (unproxied, 120s TTL)

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"direct.example.com","content":"1.2.3.4","proxied":false,"ttl":120}'
```

## List Existing Records

```bash
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for r in data.get('result',[]):
    print(f\"{r['name']:40s} {r['content']:15s} proxied={r.get('proxied')}\")"
```

## Delete a Record

```bash
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY"
```

(Record ID is returned in the `result.id` field when creating, or from the list response.)

## Update Existing Record

```bash
# Get record ID
RECORD_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A&name=subdomain.example.com" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')")

# Update record content/ttl/proxied
curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/$RECORD_ID" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"subdomain.example.com","content":"5.6.7.8","proxied":true,"ttl":1}'
```

## CNAME Records

Used when pointing to a hosting platform (Vercel, GitHub Pages, etc.) via a canonical name rather than an IP.

### Add CNAME Record

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"subdomain","content":"target.vercel-dns.com.","proxied":false,"ttl":120}'
```

- `name`: subdomain part ONLY (e.g., `xbtest` for `xbtest.aklibk.com`)
- `content`: target CNAME (e.g., `5d629c19189a995b.vercel-dns-017.com.`)
- `proxied`: must be `false` for CNAME -> CNAME chains

### Switch from A Record to CNAME (Vercel Pattern)

When migrating a domain from direct A-record to Vercel hosting:

```bash
# 1. Get the old A record ID
RECORD_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A&name=DOMAIN" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')")

# 2. Delete the A record
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/$RECORD_ID" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY"

# 3. Add CNAME record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: EMAIL" \
  -H "X-Auth-Key: KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"SUB","content":"TARGET.vercel-dns.com.","proxied":false,"ttl":120}'
```

## Limitations

- **Private IPs cannot be proxied**: Cloudflare rejects `proxied: true` for private/reserved IPs (10.x, 172.16-31.x, 192.168.x, 127.x). The API returns `"success": false` with no detailed error. Fix: set `"proxied": false` or use a public routable IP.
- **CNAME + proxied=false**: When proxied is off, Cloudflare returns the raw CNAME directly. The target platform (e.g., Vercel) must accept traffic from the internet.
- **CNAME name must be bare subdomain**: For `subdomain.example.com`, use `"name":"subdomain"` - NOT the full `subdomain.example.com`.

## Notes

- Global API Key is NOT a Bearer token — use `X-Auth-Email` + `X-Auth-Key` headers.
- All API calls go from VPS1 (149.104.8.237) which has curl available.
- If executing from the sandbox, write the script via terminal heredoc (write_file blocks credential content) and run with paramiko.
