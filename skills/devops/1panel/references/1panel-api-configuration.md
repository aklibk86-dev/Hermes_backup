# 1Panel API Configuration Reference

## How API Auth Works

1Panel uses a custom token scheme for API authentication:

```
1Panel-Token = md5("1panel" + API_KEY + UnixTimestamp)
```

Two headers are required on every request:
- `1Panel-Token` — the computed MD5 hash
- `1Panel-Timestamp` — the current Unix timestamp in seconds

### Token lifetime

The `ApiKeyValidityTime` setting (default: 120 seconds) controls how old a timestamp is accepted. Time skew between client and server must be within this window.

## Where Settings Are Stored

### SQLite Database: `/opt/1panel/db/core.db`

Uses WAL mode. Three files together form the database:
- `core.db` (main file, typically 4-64 KB)
- `core.db-wal` (Write-Ahead Log, contains recent writes)
- `core.db-shm` (Shared Memory file)

**IMPORTANT**: 1Panel's `1panel-core` process manages these files. Direct edits to the DB are **overwritten on service restart**. Always configure critical settings through the Web UI.

Key settings in the `settings` table:

| Key | Meaning |
|-----|---------|
| `ApiInterfaceStatus` | `Enable` or `Disable` — API on/off |
| `ApiKey` | The API key string (empty when disabled) |
| `IpWhiteList` | Comma-separated CIDR ranges (e.g. `0.0.0.0/0,::/0`) |
| `ApiKeyValidityTime` | Token validity window in seconds (default 120) |
| `SecurityEntrance` | URL path segment for panel access |
| `ServerPort` | Panel listen port |
| `UserName` | Panel login username |
| `Password` | RSA-encrypted password string |
| `PASSWORD_PRIVATE_KEY` | RSA private key for password decryption |
| `PASSWORD_PUBLIC_KEY` | RSA public key for password encryption |
| `EncryptKey` | AES encryption key for other config values |

### Encrypted Config: `/etc/1panel/.1panel`

Binary/encrypted file. Not human-readable. Contains panel system configuration.

### UNIX Socket: `/etc/1panel/agent.sock`

1Panel agent socket for inter-process communication.

## Common API Errors

| Response | Meaning | Fix |
|----------|---------|-----|
| `{"code":401,"message":"调用 API 接口 IP 不在白名单"}` | Source IP not whitelisted | Add IP to whitelist via Web UI, or run `1pctl reset ips` |
| `{"code":401,"message":"API 接口密钥错误"}` | Bad API key or expired timestamp | Verify API Key in Web UI, sync NTP |
| `{"code":401,"message":"用户未登录: 当前会话已过期！"}` | Session cookie expired for web API | Use API key auth instead of session cookies |
| `HTTP 200 with {"code":401,...}` | Application-level 401 within 200 | The HTTP status is 200 but the app returns an error code |

## 1pctl Commands for API Troubleshooting

Run these on the 1Panel server directly:

```bash
# Find panel URL (includes security entrance)
1pctl user-info

# Clear IP whitelist entirely
1pctl reset ips

# Remove security entrance path restriction
1pctl reset entrance

# Check panel service status
1pctl status core
```
