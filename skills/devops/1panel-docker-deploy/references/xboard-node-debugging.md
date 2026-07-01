# Xboard Node Debugging

## Overview

When an Xboard proxy node won't connect, the panel stores the node configuration in a SQLite database. This reference covers how to inspect and diagnose common node issues.

## SQLite Database Location

Xboard deployed via the 1Panel Docker Compose method stores its database at:

```
/www/.docker/.data/database.sqlite
```

Access it through the running container:

```bash
docker exec index-xboard-1 sqlite3 -header /www/.docker/.data/database.sqlite "SQL_QUERY;"
```

## Key Tables

| Table | Purpose |
|-------|---------|
| `v2_server` | Node/server definitions |
| `v2_server_group` | Group assignments |
| `v2_server_machine` | Machine/agent connections |
| `v2_server_route` | Route rules |
| `v2_stat_server` | Traffic statistics |

## Quick Diagnostics

### 1. List All Nodes

```bash
docker exec index-xboard-1 sqlite3 -header /www/.docker/.data/database.sqlite "
  SELECT id, name, type, host, port, server_port, enabled, show
  FROM v2_server;
"
```

### 2. Get Full Node Config (JSON)

```bash
docker exec index-xboard-1 sqlite3 -json /www/.docker/.data/database.sqlite "
  SELECT id, name, type, host, port, server_port, protocol_settings,
         transfer_enable, u, d, enabled
  FROM v2_server WHERE id = <node_id>;
" | python3 -m json.tool
```

### 3. Check protocol_settings JSON

The `protocol_settings` column contains a JSON object with these key fields:

```json
{
  "tls": 0|1|2,
  "network": "tcp|ws|grpc",
  "network_settings": {
    "path": "/",
    "headers": {"Host": "example.com"}
  },
  "reality_settings": {
    "server_name": "bing.com",
    "public_key": "...",
    "short_id": "3a"
  },
  "tls_settings": {
    "server_name": "example.com",
    "allow_insecure": true
  },
  "utls": {
    "enabled": true,
    "fingerprint": "edge|chrome|safari"
  },
  "multiplex": {
    "enabled": false,
    "protocol": "smux",
    "max_connections": 4
  },
  "encryption": {
    "enabled": false
  }
}
```

### 4. Check Traffic Usage

```bash
docker exec index-xboard-1 sqlite3 -header /www/.docker/.data/database.sqlite "
  SELECT id, name, u as upload_bytes, d as download_bytes,
         transfer_enable as limit_bytes
  FROM v2_server;
"
```

If `u` or `d` are > 0, data has been transferred — the node was working at some point.

## Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `enabled` is `null` | Node disabled | Set to `1` in admin panel |
| Client gets "no suitable server" | RS...e/WS combo | Change network to tcp for REALITY |
| Client connection timeout | Firewall blocking port | Open port on node server |
| Client "TLS handshake failed" | REALITY mismatch | Check public_key, server_name, short_id |
| Node shows 0 traffic forever | Node not connecting to panel | Check xboard-agent on node |
| Handshake/connection reset | port conflicts | Check server_port matches the actual listening port |
| `server_port` differs from actual Xray port | Config mismatch | Match both in admin and Xray config |

## REALITY + WebSocket Compatibility

**REALITY (tls=2) does NOT work with WebSocket transport.** REALITY is designed for TCP and gRPC. Using `network: "ws"` with REALITY will cause connection failures in all major clients (v2rayNG, Sing-box, Shadowrocket, etc.).

**Correct combinations:**

| Protocol | Network | TLS | Use Case |
|----------|---------|-----|----------|
| vless | tcp | 2 (REALITY) | Best stealth, recommended |
| vless | grpc | 2 (REALITY) | Good stealth, higher overhead |
| vless | ws | 1 (TLS) | Standard CDN-friendly |
| vmess | ws | 1 (TLS) | CDN-friendly, wider client support |
| vless | tcp | 0 (none) | Debug/testing only |

**To fix a broken node:**
1. In admin panel, edit the node
2. Change `network` from `ws` to `tcp`
3. Remove or simplify `network_settings` (path/headers not needed for TCP)
4. Save and redeploy node config

## Checking cert_config

The `cert_config` column controls certificate behavior:

```json
{"cert_mode": "self", "domain": "azure.com"}
```

- `cert_mode: "self"` — use self-signed cert
- `cert_mode: "dns"` — auto-provision via DNS-01 ACME

Having both `cert_config` with `cert_mode: self` AND `tls: 2` (REALITY) is contradictory but SQLite stores both — REALITY ignores the cert_config entirely. Not harmful but adds confusion.

## Checking Group Assignments

Nodes must be assigned to a group that users belong to:

```bash
docker exec index-xboard-1 sqlite3 -header /www/.docker/.data/database.sqlite "
  SELECT * FROM v2_server_group;
"
```

The node's `group_ids` column should contain the group ID: `["1"]`.

## Reading .env for DB config

For reference, the Xboard .env at `/www/.env` inside the container:

```bash
docker exec index-xboard-1 grep -E "^DB_|^APP_" /www/.env
```

In 1Panel deployments this typically uses SQLite (`DB_CONNECTION=sqlite`).
