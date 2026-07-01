# Finding Database Credentials for 1Panel-Managed Apps

## The Problem

1Panel masks database passwords as `***` in:
- `/opt/1panel/apps/<app>/<app>/.env`
- `docker exec <container> env`
- The 1Panel Web UI

The actual plaintext password exists but is hidden by 1Panel's display layer.

## The Solution: Check the Running Container

Docker Compose injects the **real password** as an environment variable into the running container. Get it directly:

```bash
docker exec <container_name> printenv | grep -i pass
```

## Example: Cloudreve + PostgreSQL

### App details (from 1Panel)

| Field | Value |
|-------|-------|
| App directory | `/opt/1panel/apps/cloudreve/cloudreve/` |
| Container name | `1Panel-cloudreve-XXXX` (suffix varies) |
| Postgres container | `1Panel-postgresql-XXXX` |
| Database name | `cloudreve_<random>` (from `.env`: `PANEL_DB_NAME`) |
| Database user | `cloudreve_<random>` (from `.env`: `PANEL_DB_USER`) |
| DB type | PostgreSQL (port 5432) |

### Step by step

```bash
# 1. Check app config
cat /opt/1panel/apps/cloudreve/cloudreve/.env
# PANEL_DB_USER='cloudreve_QQCPe2'
# PANEL_DB_NAME='cloudreve_7y6xt7'
# PANEL_DB_USER_PASSWORD='***'        <-- masked!

# 2. Get real password from container env
docker exec 1Panel-cloudreve-XXXX printenv | grep -i pass
# CR_CONF_Database.Password=cloudreve_PKCzQ6    <-- real password!

# 3. Find the postgres container
docker ps --format "{{.Names}}" | grep postgres
# 1Panel-postgresql-qqLl

# 4. Query the database
docker exec -e PGPASSWORD=cloudreve_PKCzQ6 1Panel-postgresql-qqLl \
  psql -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 \
  -c "SELECT id, email, nick, status FROM users"
```

## Generic Pattern (any 1Panel app)

```bash
# Step 1: Find the app's docker-compose
find /opt/1panel/apps/<app-name>/ -name docker-compose.yml -exec cat {} \;

# Step 2: Identify the env vars for DB credentials
# Look for: PANEL_DB_HOST, PANEL_DB_USER, PANEL_DB_NAME, PANEL_DB_PORT
# The password will be in PANEL_DB_USER_PASSWORD (masked)

# Step 3: Get the real password
# Find the app's container:
docker ps | grep <app-name>
# Check its env:
docker exec <app_container> printenv | grep -i pass
# Look for: CR_CONF_Database.Password, PGPASSWORD, or similar

# Step 4: Find the database container
docker ps | grep -E 'postgresql|mysql|mariadb'

# Step 5: Connect
docker exec -e PGPASSWORD=REAL_PASS <db_container> \
  psql -U <db_user> -d <db_name> -c "SQL"
```

## Provider-Specific Notes

### PostgreSQL (most common for 1Panel apps)
- Postgres hosted in its own container (`1Panel-postgresql-XXXX`)
- Role name is NOT `postgres` — it's custom, from `PANEL_DB_USER`
- Port: 5432 (internal, not exposed externally)
- Use `PGPASSWORD` env var to avoid interactive password prompt

### MySQL / MariaDB
- Same pattern, but use `mysql -u <user> -p<PASS> <db_name> -e "SQL"`
- Note: `-p<PASS>` has no space after `-p`

### Redis (caching only)
- Passwords also masked as `***`
- Get via `docker exec <redis_container> printenv | grep -i pass`
- Connect with `redis-cli -a <password>`
