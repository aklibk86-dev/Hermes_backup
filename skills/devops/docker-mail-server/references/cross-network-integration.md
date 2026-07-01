# Cross-Network Container Integration for docker-mailserver

When the mailserver and the consuming service (e.g., New-API) are on different Docker networks, they cannot reach each other by container name. This reference covers connecting them.

## The Problem

- `new-api` is on `new-api_new-api-network` (subnet 172.21.0.0/16)
- `mailserver` is on `mailserver_mailnet` (subnet 172.24.0.0/24)
- Default Docker DNS only resolves names within the same network
- `new-api` trying to reach `mailserver:25` → DNS resolution failure

## Solution: Connect the Consumer to the Mailserver's Network

### One-time command (immediate effect):

```bash
docker network connect mailserver_mailnet new-api
```

⚠️ **CRITICAL PITFALL: `docker network connect` can break port mappings.**

When you run `docker network connect`, Docker may drop the `docker-proxy` process that handles host-to-container port forwarding. The iptables DNAT rule may remain but without the user-space proxy, the host port becomes unreachable.

Symptoms:
- `docker inspect container` shows correct port mapping
- `docker port container` shows correct mapping
- `ss -tlnp | grep PORT` shows nothing
- Inside the container, the service listens fine
- From the host, `curl 127.0.0.1:PORT` returns `Connection refused`

**Fix:** Restart the container to re-establish the docker-proxy:
```bash
docker restart CONTAINER_NAME
```
After restart, verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:PORT/
# Expected: 200
```

This affects all Docker bridge network setups. The iptables DNAT rule still works for other Docker containers, but host-loopback connections (127.0.0.1) fail until the container is restarted.

### Verification (after connecting):

```bash
docker exec new-api sh -c "wget -q -O- -T 3 mailserver:25"
# Expected: "220 mail.aklibk.com ESMTP"
```

### Persist across restarts (docker-compose.yml):

Add the external network to the consumer's `networks:` section:

```yaml
services:
  new-api:
    networks:
      - new-api-network        # existing
      - mailserver_mailnet     # add this

networks:
  mailserver_mailnet:
    external: true             # must be declared as external
```

## What SnappyMail's Config Looks Like

Config lives in a Docker volume at `/var/lib/snappymail/_data_/_default_/domains/`:

| File | Purpose |
|------|---------|
| `default.json` | Domain config for auto-created accounts |
| `<hash>.json` | Per-domain config for manually added accounts |
| `admin_password.txt` | Web admin password |

Typical SMTP settings in these JSON files:

```json
{
  "SMTP": {
    "host": "mailserver",
    "port": 25,
    "type": 0,
    "useAuth": false,
    "setSender": false,
    "usePhpMail": false,
    "sasl": ["PLAIN", "LOGIN"]
  }
}
```

Key field: `"useAuth": false` — SnappyMail connects to port 25 without authentication because `PERMIT_DOCKER=network` adds the Docker bridge range (172.16.0.0/12) to Postfix's `mynetworks`.

## New-API SMTP Config (cross-network or same-host)

| Field | Value | Notes |
|-------|-------|-------|
| SMTP Host | `mailserver` | Container name (same network) or `127.0.0.1` (same host) |
| SMTP Port | `25` | Plain SMTP, no TLS needed from internal network |
| Encryption | None | Docker network is trusted via PERMIT_DOCKER |
| From Address | `no-reply@aklibk.com` | Any account that exists in postfix-accounts.cf |
| Username | (leave blank) | No auth needed from trusted network |
| Password | (leave blank) | No auth needed from trusted network |

If connecting from outside the Docker network (e.g., from another VPS), use port 587 with STARTTLS and full authentication.
