# Uptime Kuma SQLite Monitor Management

## Background

Uptime Kuma v2 has **no REST API for monitor CRUD operations**. The API key (`uk1_...`) is read-only — it only works for status page data and Prometheus metrics. The WebSocket (Socket.IO) protocol is the only interactive API, and it's designed for the frontend, not scripts.

To programmatically add/remove/update monitors, modify the SQLite database directly at `/app/data/kuma.db` inside the container.

## Monitor Table Schema

Key columns (from `PRAGMA table_info(monitor)`):

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | INTEGER | auto | Primary key |
| name | VARCHAR(150) | required | Display name |
| type | VARCHAR(20) | required | 'http', 'ping', 'keyword', 'port', etc. |
| url | TEXT | null | URL to monitor (for http type) |
| active | BOOLEAN | 1 | 1 = active, 0 = paused |
| user_id | INTEGER | null | FK to user table (find with `SELECT id FROM user`) |
| interval | INTEGER | 20 | Check interval in seconds |
| maxretries | INTEGER | 0 | Retries before marking down |
| accepted_statuscodes_json | TEXT | '["200-299"]' | Acceptable HTTP status ranges |
| method | TEXT | 'GET' | HTTP method |
| created_date | DATETIME | DATETIME('now') | Auto-set |
| description | TEXT | null | Optional description |
| timeout | DOUBLE | 0 | Request timeout in seconds |
| maxredirects | INTEGER | 10 | Max HTTP redirects to follow |
| upside_down | BOOLEAN | 0 | Invert up/down logic |
| ignore_tls | BOOLEAN | 0 | Skip TLS certificate validation |
| keyword | VARCHAR(255) | null | For keyword/blocked keyword checks |
| invert_keyword | BOOLEAN | 0 | Invert keyword match |
| proxy_id | INTEGER | null | Proxy to use |
| weight | INTEGER | 2000 | Monitor weight (for load balancers) |
| resend_interval | INTEGER | 0 | Notification resend interval |
| push_token | VARCHAR(32) | null | For push monitors |
| headers | TEXT | null | Custom HTTP headers (JSON) |
| body | TEXT | null | HTTP request body |
| basic_auth_user | TEXT | null | HTTP basic auth username |
| basic_auth_pass | TEXT | null | HTTP basic auth password |
| bearer_token | TEXT | null | Bearer token auth |
| hostname | VARCHAR(255) | null | Hostname (for ping/port/ssl types) |
| port | INTEGER | null | Port (for port type) |
| grpc_* | various | null | gRPC-specific fields |
| database_* | various | null | Database query monitor fields |
| docker_* | various | null | Docker container monitor fields |
| mqtt_* | various | null | MQTT monitor fields |
| radius_* | various | null | RADIUS monitor fields |
| kafka_producer_* | various | null | Kafka monitor fields |
| snmp_* | various | null | SNMP monitor fields |
| rabbitmq_* | various | null | RabbitMQ monitor fields |
| smtp_security | VARCHAR(255) | null | SMTP security type |
| status_page | | | See status_page table for PSP integration |
| tag | | | See tag + monitor_tag tables for tags |

## Common Monitor Types

| type value | Description | Required fields |
|-----------|-------------|-----------------|
| 'http' | HTTP/HTTPS | url, accepted_statuscodes_json, method |
| 'ping' | ICMP Ping | hostname, packet_size |
| 'keyword' | HTTP + keyword search | url, keyword, invert_keyword |
| 'port' | TCP Port | hostname, port |
| 'push' | Push monitor | push_token |
| 'grpc' | gRPC health check | grpc_url, grpc_method, grpc_service_name |

## Inserting Monitors

```sql
-- Find the admin user ID (usually 1)
SELECT id, username FROM user;

-- Insert HTTP monitors (batch)
INSERT INTO monitor (name, type, url, active, user_id, interval, maxretries, accepted_statuscodes_json, method, created_date)
VALUES
('My Service 1', 'http', 'https://service1.example.com', 1, 1, 60, 0, '["200-299"]', 'GET', datetime('now')),
('My Service 2', 'http', 'https://service2.example.com', 1, 1, 60, 0, '["200-299"]', 'GET', datetime('now'));

-- Insert a Ping monitor
INSERT INTO monitor (name, type, hostname, active, user_id, interval, packet_size, created_date)
VALUES ('My Server', 'ping', '10.0.0.1', 1, 1, 60, 56, datetime('now'));

-- Insert a TCP Port monitor
INSERT INTO monitor (name, type, hostname, port, active, user_id, interval, created_date)
VALUES ('My SSH Port', 'port', '10.0.0.1', 22, 1, 1, 60, datetime('now'));

-- Insert a Keyword monitor (checks if keyword appears in response)
INSERT INTO monitor (name, type, url, keyword, invert_keyword, active, user_id, interval, created_date)
VALUES ('Check Login Page', 'keyword', 'https://example.com/login', 'Welcome', 0, 1, 1, 300, datetime('now'));
```

## Verification

```sql
-- List all monitors
SELECT id, name, url FROM monitor ORDER BY id;

-- Count active monitors
SELECT COUNT(*) FROM monitor WHERE active=1;

-- Check if monitors exist
SELECT id, name, type, active FROM monitor;
```

## After Insertion

The container caches monitor data in memory. After inserting via SQLite, **restart the container**:

```bash
docker restart uptime-kuma
```

Wait a few seconds, then verify it's healthy:

```bash
docker ps --filter name=uptime-kuma --format "{{.Names}} {{.Status}}"
```

The container will immediately start monitoring new entries after restart. First check results appear within the configured interval (e.g., 60 seconds).

## Updating Monitors

```sql
-- Pause a monitor (set inactive)
UPDATE monitor SET active=0 WHERE name='My Service 1';

-- Change check interval
UPDATE monitor SET interval=300 WHERE id=5;

-- Change URL
UPDATE monitor SET url='https://new-url.example.com' WHERE id=5;

-- Delete a monitor
DELETE FROM monitor WHERE id=5;

-- Delete all heartbeats for a monitor (clean up before migration)
-- DELETE FROM heartbeat WHERE monitor_id=5;
```

After updates, restart the container: `docker restart uptime-kuma`.

## Pitfalls

1. **The API key is NOT for CRUD** — `uk1_...` keys are read-only (status page data + Prometheus). Don't waste time trying REST endpoints.
2. **Monitor type mismatch** — Using `type='ping'` without setting `hostname` will result in a broken monitor. Each type has specific required fields.
3. **Container restart required** — SQLite changes are not hot-reloaded. Always restart the container after INSERT/UPDATE/DELETE.
4. **SQL injection via user input** — The agent is trusted, but if building a tool that takes user monitor names, use parameterized queries.
5. **JSON escaping in SQL INSERT/UPDATE** — The `accepted_statuscodes_json` column requires valid JSON: `["200-299"]` (double-quoted). A common mistake is omitting the inner double quotes, writing `[200-299]` instead of `["200-299"]`. This causes a JSON parse error (`Expected ',' or ']' after array element`) when Uptime Kuma tries to read the monitor list after login, making the entire web UI unusable. **Fix**: update the column via SQL, then restart the container.

   **SQL string escaping note**: Avoid passing the SQL through SSH command-line arguments with nested quotes — the JSON double quotes inside SQL single quotes inside shell double quotes create an unmanageable escaping chain. Instead, write the SQL to a file via SFTP or heredoc, then `docker cp` + `docker exec ... sqlite3 < file`.

6. **`execute_code` + SSH limitation** — Do not embed SSH commands inside `terminal()` calls from `execute_code` when the target environment lacks Docker. Write a paramiko script to `/tmp/`, install paramiko with `uv pip install paramiko`, then run with `/opt/hermes/.venv/bin/python3 /tmp/script.py`.
