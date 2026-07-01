# Database Surgery: Direct Config Changes in Docker-Hosted Apps

## When to Use

- The web admin UI is inaccessible (wrong password, forgot password, locked out)
- You need to bulk-change config that the UI doesn't support
- You need to inspect or modify app configuration programmatically

## Pattern: Access Docker Container Database

### 1. Find DB Credentials

Most Docker-hosted apps expose database credentials via container environment variables:

```bash
# PostgreSQL
docker exec <container> printenv | grep -E '^POSTGRES'

# MySQL / MariaDB
docker exec <container> printenv | grep -i -E '^MYSQL|^MARIADB'

# Also check app-specific env vars
docker exec <container> printenv | grep -i -E 'PASSWORD|SECRET|DB_|DATABASE'
```

### 2. Connect to Database

#### PostgreSQL

```bash
# Single query
docker exec -e PGPASSWORD=XXX <pg-container> psql -U <user> -d <db> -c "SELECT ..."

# Interactive (via pxssh)
docker exec -i <pg-container> psql -U <user> -d <db>
```

Useful psql flags: `-t` (tuples only, no headers), `-A` (unaligned output), `-c "SQL"` (single command).

#### MySQL / MariaDB

```bash
docker exec <mariadb-container> mariadb -u <user> -p'PASSWORD' <db> -e "SELECT ..."
```

### 3. Common App Config Patterns

Many web apps store configuration in key-value tables with JSON values:

| App | Table | Key Column | Value Column | Notable Keys |
|-----|-------|-----------|-------------|-------------|
| **New-API** | `options` | `key` | `value` | `TopupGroupRatio` (JSON: `{"default": N, "vip": N, "svip": N}`), `ModelRatio` (per-model pricing, often 76K+ JSON), `ModelPrice` |
| **Xboard** | MariaDB tables | varies | varies | See `references/xboard-node-debugging.md` |
| **Halo** | PostgreSQL | schema-specific | schema-specific | See `halo-blog-deployment` skill |

### 4. Update Pattern

```bash
# 1. Read current value
docker exec -e PGPASSWORD=XXX <pg> psql -U <user> -d <db> -t -A -c "SELECT value FROM options WHERE key = 'TopupGroupRatio'"

# 2. Update (JSON string with proper quoting)
docker exec -i <pg> psql -U <user> -d <db> -c "UPDATE options SET value = '{\"default\": 1.5, \"vip\": 1.5, \"svip\": 1}' WHERE key = 'TopupGroupRatio'"

# 3. Verify
docker exec -e PGPASSWORD=XXX <pg> psql -U <user> -d <db> -t -A -c "SELECT value FROM options WHERE key = 'TopupGroupRatio'"

# 4. Restart app container to apply
docker restart <app-container>
```

**Important**: JSON keys in string values use `\"` for interior double quotes inside the shell string.

### 5. Restart Pattern

After direct DB modifications, **always restart the app container**:

```bash
docker restart <container-name>
# Wait for health check
sleep 3 && docker ps --filter name=<name> --format '{{.Names}} {{.Status}}'
```

The container should show `Up NN seconds (healthy)`.

## New-API Specific Reference

### TopupGroupRatio

Controls how many credits users get when they top up. Stored in `options` table:

```json
{
  "default": 1.5,
  "vip": 1.5,
  "svip": 1
}
```

Each group name maps to a `group` column value in the `users` table. The multiplier is applied to the top-up amount: user tops up $20 → gets $20 × multiplier in credits.

### ModelRatio

Per-model pricing multipliers. Stored as a flat JSON object (often ~76K chars) in `options` table with key `ModelRatio`. Each model name maps to its cost multiplier relative to upstream pricing.

### Users Table

```sql
SELECT id, username, role, status, "group", quota, used_quota 
FROM users;
```

- `role`: 100 = admin, 1 = regular user
- `status`: 1 = active
- `group`: maps to TopupGroupRatio keys

## Caution

1. **Backup first**: `docker exec <pg> pg_dump -U <user> <db> > /tmp/backup.sql`
2. **JSON quoting is tricky**: Test with `-c "SELECT '{\"key\": 1}'::json"` before real UPDATE
3. **Always restart**: DB changes are cached by the app process
4. **Invalid JSON breaks the app**: New-API will silently fail to parse malformed JSON in options
