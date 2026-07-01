# Session Examples

These are real command patterns used in a session against a Debian 13 VPS at 149.104.8.237:37926.

## Basic Connectivity Test

```bash
# Check if port is open
timeout 5 bash -c 'echo >/dev/tcp/149.104.8.237/37926' 2>&1 && echo OPEN || echo CLOSED

# Verbose SSH to see auth methods
ssh -v -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p 37926 root@149.104.8.237 'echo OK' 2>&1 | tail -20
```

## SSH_ASKPASS Script

```bash
cat > /tmp/askpass.sh << 'SCRIPT'
#!/bin/sh
echo "THE_PASSWORD_HERE"
SCRIPT
chmod +x /tmp/askpass.sh
```

## Running Commands on Remote

```bash
# Single command — use SSH variable for brevity
SSH_BASE="SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w ssh \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p 37926 root@149.104.8.237"

# Run a command
$SSH_BASE 'docker ps'

# Store in variable for reuse
SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w \
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p 37926 root@149.104.8.237 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

## SCP File Transfer

```bash
# Copy a local Python script to remote
SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w scp \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -P 37926 \
  /tmp/enable_api.py root@149.104.8.237:/tmp/enable_api.py

# Then execute it via SSH
SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w ssh \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -p 37926 root@149.104.8.237 'python3 /tmp/enable_api.py'
```

## Multi-step Workflow Pattern

```bash
# Combine file copy + exec in sequence
SSH_PREFIX="SSH_ASKPASS=/tmp/askpass.sh DISPLAY=none:0 setsid -w"
SCP="$SSH_PREFIX scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P 37926"
SSH="$SSH_PREFIX ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 37926 root@149.104.8.237"

$SCP /tmp/verify_api.py root@149.104.8.237:/tmp/verify_api.py
$SSH 'python3 /tmp/verify_api.py'
```
