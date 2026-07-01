# 1Panel API Authentication Reference

Collected from the official 1Panel documentation at 1panel.cn/docs/v2/.

## Token Generation

1Panel uses a custom token scheme for API request authentication.

**Formula:**
```
Token = md5('1panel' + API-Key + UnixTimestamp)
```

**Components:**
- Fixed prefix: `1panel`
- `API-Key`: The API key generated from the 1Panel panel (Settings → API Interface)
- `UnixTimestamp`: Current Unix timestamp in seconds

## Request Headers

Every API request MUST carry both headers:

| Header | Value |
|--------|-------|
| `1Panel-Token` | The MD5 hash computed above |
| `1Panel-Timestamp` | The Unix timestamp used in the hash |

## Python Generator

```python
import hashlib
import time

def panel_auth_headers(api_key: str) -> dict:
    ts = str(int(time.time()))
    token = hashlib.md5(("1panel" + api_key + ts).encode()).hexdigest()
    return {"1Panel-Token": token, "1Panel-Timestamp": ts}
```

## Shell Generator

```bash
panel_auth() {
  local key="$1"
  local ts
  ts=$(date +%s)
  local token
  token=$(printf '%s' "1panel${key}${ts}" | md5sum | cut -d' ' -f1)
  echo "1Panel-Token: $token"
  echo "1Panel-Timestamp: $ts"
}
```

## Example curl Request

```bash
# Using the shell helper
eval "$(panel_auth "your-api-key")"
curl -X GET "http://your-host:9999/api/v2/dashboard/base/os" \
  -H "1Panel-Token: $token" \
  -H "1Panel-Timestamp: $ts"
```

## Go Reference Implementation (from 1Panel source)

```go
func validateToken(c *gin.Context) error {
    panelToken := c.GetHeader("1Panel-Token")
    panelTimestamp := c.GetHeader("1Panel-Timestamp")
    systemToken := panelToken
    systemKey = ******* // panel API key
    expectedToken := md5Sum("1panel" + systemKey + panelTimestamp)
    if systemToken != expectedToken {
        return fmt.Errorf("invalid token")
    }
    return nil
}

func md5Sum(data string) string {
    h := md5.New()
    h.Write([]byte(data))
    return hex.EncodeToString(h.Sum(nil))
}
```

## Swagger UI

All available API endpoints can be explored at:
```
http://{host}:{port}/1panel/swagger/index.html
```

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| 401 "API 接口密钥错误" | Wrong API Key, or key not saved in panel settings |
| IP auth error | Agent's IP not in whitelist; add it in Settings → API Interface |
| Token mismatch | Clock skew between agent and panel — use NTP |

## Security Notes

- Always use HTTPS in production
- Restrict API whitelist to specific agent IPs, not `0.0.0.0/0`
- Rotate API Keys periodically
- Never commit keys to version control
- The MD5-based scheme is not cryptographically strong — it's a compatibility token, not a security primitive. Layer on TLS and IP whitelisting.
