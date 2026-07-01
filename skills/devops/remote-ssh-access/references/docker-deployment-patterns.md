# Docker Deployment Patterns (via Remote SSH)

## Docker Port Mapping Lost After `docker network connect`

**Symptom**: After running `docker network connect <network> <container>`, the container's published port becomes unreachable from the host (`Connection refused` on `127.0.0.1:PORT`). The docker-proxy process for that port mapping disappears even though `docker port <container>` still shows the mapping.

**Root cause**: `docker network connect` recreates the container's network interfaces, which can cause the docker-proxy to detach from the port mapping on the host side. The iptables DNAT rule may remain but there's no userspace proxy serving the connection.

**Fix**: Restart the container to re-establish the port mapping:
```bash
docker restart <container>
```

**Prevention**: If you need to connect a container to a secondary network, add the network connection to the docker-compose.yml instead of using the CLI command. This ensures the port mapping and network are set up together during container creation.

---

## docker-mailserver: "Relay access denied" Between Containers

**Symptom**: A webmail container (SnappyMail/Roundcube) or app container connecting to docker-mailserver on port 25 gets `554 5.7.1 <recipient>: Relay access denied`.

**Root cause**: docker-mailserver's Postfix has an empty `mynetworks` by default. It only permits relaying from `127.0.0.0/8` (localhost). Other Docker containers on the same network are not trusted.

**Fix**: Set the `PERMIT_DOCKER` environment variable on the mailserver container:

| Value | Effect |
|-------|--------|
| `container` | Adds only the container's own IP to `mynetworks` (usually insufficient) |
| `network` | Adds the entire Docker bridge subnet (e.g. `172.16.0.0/12`) to `mynetworks` — allows all containers on the same host to relay |

```yaml
# docker-compose.yml
services:
  mailserver:
    image: mailserver/docker-mailserver:latest
    environment:
      - PERMIT_DOCKER=network
```

After setting, verify with:
```bash
docker exec mailserver grep "^mynetworks" /etc/postfix/main.cf
# Should show: mynetworks = 127.0.0.0/8 [::1]/128 [fe80::]/64 172.16.0.0/12
```

**SnappyMail SMTP config** (when on the same Docker network):
- Host: `mailserver` (container name)
- Port: `25`
- Auth: none required (`useAuth: false`)
- Encryption: none (Plain)

No username or password needed when connecting from within the Docker network.

**App containers on different networks**: If the app (e.g. New-API) is on a different Docker network, connect it to the mailserver's network:
```bash
docker network connect mailserver_mailnet new-api
```

Or add the network in docker-compose.yml:
```yaml
services:
  new-api:
    networks:
      - new-api-network
      - mailserver_mailnet  # external network

networks:
  mailserver_mailnet:
    external: true
```

---

## Cross-Server Data Migration (Docker Volume/Container)

Pattern for migrating a Docker container with its data from one VPS to another.

### Step 1: Pack data on source

```bash
# Docker volume (named)
tar -czf /tmp/app-data.tar.gz -C /var/lib/docker/volumes/<volume-name>/_data .

# Bind mount
tar -czf /tmp/app-data.tar.gz -C /opt/app/data .
```

### Step 2: Transfer to destination

Set up SSH_ASKPASS on the source VPS, then SCP directly:
```bash
cat > /tmp/askpass.sh << 'SCRIPT'
#!/bin/sh
echo "DEST_VPS_PASSWORD"
SCRIPT
chmod +x /tmp/askpass.sh

SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w scp \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  /tmp/app-data.tar.gz root@DEST_IP:/tmp/
```

### Step 3: Extract and deploy on destination

```bash
mkdir -p /opt/app/data
tar -xzf /tmp/app-data.tar.gz -C /opt/app/data

docker run -d --name app --restart unless-stopped \
  -p 127.0.0.1:PORT:CONTAINER_PORT \
  -v /opt/app/data:/app/data \
  IMAGE:TAG
```

### Step 4: Update DNS and Nginx

- Change Cloudflare A record from source IP to destination IP
- Create or update Nginx reverse proxy config on the destination
- Reload Nginx
- Stop and remove the old container on source

---

## 1Panel Non-Interactive Install

1Panel's `install.sh` prompts interactively for language, directory, port, etc. To automate:

```bash
cd 1panel-v1.10.34-lts-linux-amd64

# Pipe answers to the script
{
  echo "2"          # Language: Chinese (1=English, 2=Chinese)
  sleep 1
  echo ""           # Install dir: default (/opt)
  sleep 1
  echo "n"          # No accelerator
  sleep 1
  echo "14084"      # Panel port
  sleep 1
  echo "admin"      # Entrance path
  sleep 1
  echo "admin"      # Username
  sleep 1
  echo "mypassword" # Password
  sleep 1
  echo "mypassword" # Confirm password
  sleep 2
  echo ""           # Press Enter to continue
} | bash install.sh
```

The password prompt is tricky — if piped input doesn't match the `read -p` timing, the script falls back to auto-generating a password (printed at the end). You can later reset it via the 1Panel web UI or by editing the database.
