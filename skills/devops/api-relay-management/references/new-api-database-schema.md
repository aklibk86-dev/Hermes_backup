# New-API PostgreSQL Database Schema

## Quick Access

All queries use `docker exec` into the postgres container (no password needed — peer/trust auth):

```bash
docker exec new-api-postgres psql -U newapi -d new-api -c "SQL"
```

For multi-line queries, use `-c "..."` with proper escaping.

## Core Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | PK |
| `username` | varchar | Login name (or email) |
| `password` | varchar | bcrypt hash |
| `role` | bigint | `100`=admin, `1`=user |
| `status` | bigint | `1`=active, `0`=disabled |
| `quota` | bigint | User's remaining quota (credits) |
| `display_name` | text | Optional display name |
| `email` | text | |

Key query:
```sql
SELECT id, username, role, status, quota FROM users ORDER BY id;
```

### tokens

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | PK |
| `user_id` | bigint | FK → users.id |
| `key` | varchar(128) | The actual API key (sk-...) |
| `name` | text | Display name |
| `status` | bigint | `1`=active |
| `created_time` | bigint | Unix timestamp |
| `accessed_time` | bigint | Last use timestamp |
| `expired_time` | bigint | `-1`=never expires |
| `remain_quota` | bigint | Remaining credits (`0` = unlimited) |
| `unlimited_quota` | boolean | `t` = no quota limit |
| `used_quota` | bigint | Credits consumed |
| `group` | text | Group assignment (e.g., `default`) |
| `model_limits_enabled` | boolean | |
| `model_limits` | text | JSON array of allowed model names |
| `allow_ips` | text | IP whitelist |
| `cross_group_retry` | boolean | |
| `deleted_at` | timestamptz | Soft-delete timestamp |

Key queries:

```sql
-- All active tokens with user info
SELECT t.id, t.name, substring(t.key, 1, 12) || '...' as key_prefix,
       u.username, t.status,
       to_timestamp(t.created_time) as created,
       to_timestamp(t.accessed_time) as last_access,
       t.remain_quota, t.unlimited_quota, t.used_quota
FROM tokens t
JOIN users u ON t.user_id = u.id
WHERE t.deleted_at IS NULL
ORDER BY t.created_time DESC;

-- Count tokens per user
SELECT u.username, count(t.id) as token_count
FROM users u
LEFT JOIN tokens t ON t.user_id = u.id AND t.deleted_at IS NULL
GROUP BY u.id, u.username
ORDER BY u.id;
```

### logs

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | PK |
| `user_id` | bigint | FK → users.id |
| `created_at` | bigint | Unix timestamp |
| `type` | bigint | Log type (1=success, etc.) |
| `content` | text | Log content/detail |
| `username` | text | Denormalized user name |
| `token_name` | text | Name of the token used |
| `model_name` | text | Model used (e.g., `gpt-5.4`) |
| `quota` | bigint | Credits consumed in this request |
| `prompt_tokens` | bigint | |
| `completion_tokens` | bigint | |
| `use_time` | bigint | Latency (ms) |
| `is_stream` | boolean | Streamed response |
| `channel_id` | bigint | FK → channels.id |
| `channel_name` | text | |
| `token_id` | bigint | FK → tokens.id |
| `group` | text | Rate group used |
| `ip` | text | Client IP |
| `request_id` | varchar | UUID |
| `upstream_request_id` | varchar | |
| `other` | text | Additional JSON data |

Key query:
```sql
-- Recent usage by non-admin users
SELECT l.id, u.username, l.token_name, l.model_name, l.quota,
       to_timestamp(l.created_at) as time
FROM logs l
JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC
LIMIT 20;
```

### channels

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | PK |
| `type` | bigint | Channel type (1=OpenAI compatible, 14=Claude) |
| `name` | text | Display name |
| `models` | text | Comma-separated model list |
| `key` | text | API key for this channel |
| `status` | bigint | `1`=active |

Key query:
```sql
SELECT id, type, name, models FROM channels ORDER BY id;
```

### options (system config)

| Column | Type | Notes |
|--------|------|-------|
| `key` | text | Config key |
| `value` | text | JSON blob value |

Notable keys:
- `TopupGroupRatio` — JSON `{"group": multiplier}`
- `ModelRatio` — Per-model pricing (76K+ chars)
- `ModelPrice` — Base prices
- `Chats` — Model availability flags

```sql
SELECT key, substr(value, 1, 100) FROM options ORDER BY key;
```

## Useful Diagnostic Queries

### Get table list with row counts
```sql
SELECT schemaname, tablename, n_live_tup as row_estimate
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
```

### List all tables
```sql
\dt
-- or via SQL:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

### Explore table columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tokens'
ORDER BY ordinal_position;
```

### User quota summary
```sql
SELECT u.id, u.username, u.role,
       CASE WHEN u.role = 100 THEN 'admin' ELSE 'user' END as role_name,
       u.status, u.quota as total_quota,
       count(t.id) as token_count,
       COALESCE(sum(t.used_quota), 0) as total_used_quota
FROM users u
LEFT JOIN tokens t ON t.user_id = u.id AND t.deleted_at IS NULL
GROUP BY u.id, u.username, u.role, u.status, u.quota
ORDER BY u.id;
```

## Role Values

| role | Meaning |
|------|---------|
| 100 | Admin |
| 1 | Regular user |

## Channel Type Values

| type | Meaning |
|------|---------|
| 1 | OpenAI-compatible API |
| 14 | Claude API (Anthropic) |

## Container Access

```bash
# Execute psql directly in the postgres container
docker exec -e PGPASSWORD=xxx new-api-postgres psql -U newapi -d new-api -c "..."

# Find password from env
docker exec new-api-postgres printenv | grep POSTGRES_PASSWORD

# PostgreSQL 15 on Debian — peer auth works on local socket,
# but from docker exec you need explicit -U and -d flags
```
