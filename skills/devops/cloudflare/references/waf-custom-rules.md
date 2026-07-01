# WAF Custom Rules (Rulesets API)

## Overview

Cloudflare WAF custom rules are managed via the **Rulesets API**. Each zone has an `http_request_firewall_custom` phase entrypoint ruleset. Rules are added by PUTting the full ruleset.

## API Endpoints

| Action | Method | Path |
|--------|--------|------|
| List zone rulesets | GET | `/zones/{zone_id}/rulesets` |
| Get specific ruleset | GET | `/zones/{zone_id}/rulesets/{ruleset_id}` |
| Replace all rules | PUT | `/zones/{zone_id}/rulesets/{ruleset_id}` |
| Create new ruleset | POST | `/zones/{zone_id}/rulesets` |

## Authentication

```
X-Auth-Email: <email>
X-Auth-Key: <global_api_key>
Content-Type: application/json
```

## Finding the ruleset ID

The default custom ruleset has `kind=zone` and `phase=http_request_firewall_custom`. List all rulesets and find it:

```python
data = cf_api("/zones/{zone_id}/rulesets", headers)
for rs in data.get("result", []):
    print(f"  {rs['name']:40s} phase={rs['phase']:35s} kind={rs['kind']} id={rs['id']}")
```

## Adding rules (PUT to replace)

Use PUT to replace the entire ruleset. You must include ALL existing rules plus new ones — there is no partial add.

```python
import json, urllib.request

payload = json.dumps({
    "rules": [
        {
            "description": "Block AI bots and crawlers",
            "expression": "(http.user_agent contains \"GPTBot\" or http.user_agent contains \"ChatGPT-User\") and not (http.user_agent contains \"Googlebot\")",
            "action": "block",
            "enabled": True
        }
    ]
}).encode()

req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/{ruleset_id}",
    data=payload,
    headers=headers,
    method="PUT"
)
```

### Via curl (safe with hex-only API keys)

```bash
curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/{ruleset_id}" \
  -H "X-Auth-Email: $EMAIL" \
  -H "X-Auth-Key: $KEY" \
  -H "Content-Type: application/json" \
  --data @rules.json
```

## Creating a new ruleset (POST)

When the zone has no existing custom ruleset, create one:

```python
payload = json.dumps({
    "name": "default",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": [...]
}).encode()
```

## Expression Language Tips

- `cf.threat_score` — Cloudflare's IP reputation score (0-100). Values >= 10 indicate high risk.
- `http.user_agent contains "string"` — Case-sensitive substring match.
- Combine with `and not (...)` to exclude specific patterns.
- Multiple conditions: `(a or b or c) and not (x or y)`

## Common Rule Patterns

### 1. Block AI bots, allow search engines

```
(http.user_agent contains "GPTBot" or http.user_agent contains "ClaudeBot" or http.user_agent contains "PerplexityBot" or http.user_agent contains "Bytespider" or http.user_agent contains "SemrushBot" or http.user_agent contains "ChatGPT-User" or http.user_agent contains "Claude-Web" or http.user_agent contains "anthropic-ai" or http.user_agent contains "OAI-SearchBot" or http.user_agent contains "Diffbot" or http.user_agent contains "ImagesiftBot" or http.user_agent contains "Magpie-Crawler" or http.user_agent contains "omgili" or http.user_agent contains "PetalBot" or http.user_agent contains "DataForSeoBot" or http.user_agent contains "AwarioSmartBot" or http.user_agent contains "Seekr" or http.user_agent contains "cohere-ai" or http.user_agent contains "FacebookBot" or http.user_agent contains "coccocbot" or http.user_agent contains "Screaming Frog" or http.user_agent contains "BLEXBot" or http.user_agent contains "DotBot" or http.user_agent contains "MauiBot" or http.user_agent contains "CCBot") and not (http.user_agent contains "Googlebot" or http.user_agent contains "Bingbot" or http.user_agent contains "Baiduspider" or http.user_agent contains "YandexBot" or http.user_agent contains "DuckDuckBot" or http.user_agent contains "Slurp" or http.user_agent contains "AhrefsBot")
```

### 2. Block high threat score

```
cf.threat_score ge 10
```

### 3. Block by ASN

```
ip.geoip.asnum eq 12345
```

## Pitfalls

- **POST vs PUT**: Use POST to create a new ruleset (requires `name`, `kind`, `phase` fields). Use PUT to update an existing ruleset (requires only `rules` array). Mixing them up gives `request body does not contain phase` error.
- **No partial update**: PUT replaces ALL rules. Read the current rules first, then append new ones.
- **Version field**: The API manages versions automatically — don't include it in the payload.
- **Expression length**: Very long expressions work but are hard to debug. Consider splitting into multiple rules for complex logic.
