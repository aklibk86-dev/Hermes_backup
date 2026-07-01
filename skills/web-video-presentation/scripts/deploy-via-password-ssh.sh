#!/usr/bin/env bash
# deploy-via-password-ssh.sh
# Deploy a vite build to a remote VPS via SSH with PASSWORD authentication
# using Python pexpect for the interactive SSH session.
#
# Usage:
#   ./scripts/deploy-via-password-ssh.sh <build_dir> <vps_ip> <port> <password> [remote_dir]
#
# Example:
#   ./scripts/deploy-via-password-ssh.sh ./dist 149.104.8.237 37926 "mypassword"
#
# Requires: python3 with pexpect installed
set -euo pipefail

BUILD_DIR="${1:?Usage: $0 <build_dir> <vps_ip> <port> <password> [remote_dir]}"
HOST="${2:?}"
PORT="${3:?}"
PASS="${4:?}"
REMOTE_DIR="${5:-/opt/presentation-demo}"

if [ ! -d "$BUILD_DIR" ]; then
  echo "ERROR: Build directory '$BUILD_DIR' not found"
  exit 1
fi

# Check pexpect
python3 -c "import pexpect" 2>/dev/null || {
  echo "Installing pexpect..."
  pip install pexpect -q
}

echo "→ Packing $BUILD_DIR..."
tar czf /tmp/deploy-web-video.tar.gz -C "$BUILD_DIR" .

python3 << PYEOF
import pexpect
import sys

host = "$HOST"
port = "$PORT"
password = "$PASS"
remote_dir = "$REMOTE_DIR"

# Step 1: SCP
print("→ Uploading to", host)
child = pexpect.spawn(
    f"scp -o StrictHostKeyChecking=no -P {port} /tmp/deploy-web-video.tar.gz root@{host}:/tmp/"
)
child.expect("password:")
child.sendline(password)
child.expect(pexpect.EOF, timeout=30)
result = child.before.decode(errors='replace')
if "100%" not in result:
    print("SCP result:", result)

# Step 2: SSH extract
print("→ Extracting on remote")
cmd = (
    f"ssh -o StrictHostKeyChecking=no -p {port} root@{host} "
    f"mkdir -p {remote_dir} && "
    f"cd {remote_dir} && "
    f"rm -rf * .??* 2>/dev/null && "
    f"tar xzf /tmp/deploy-web-video.tar.gz -C {remote_dir} && "
    f"rm /tmp/deploy-web-video.tar.gz && "
    f"ls -la {remote_dir}/index.html"
)
child = pexpect.spawn(cmd)
child.expect("password:")
child.sendline(password)
child.expect(pexpect.EOF, timeout=30)
print(child.before.decode(errors='replace'))

# Step 3: Verify
print("→ Verifying HTTP server...")
check_cmd = (
    f"ssh -o StrictHostKeyChecking=no -p {port} root@{host} "
    f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:9899/ 2>/dev/null || echo 'server not responding'"
)
child = pexpect.spawn(check_cmd)
child.expect("password:")
child.sendline(password)
child.expect(pexpect.EOF, timeout=10)
status = child.before.decode(errors='replace').strip()
if status == "200":
    print("✓ HTTP server responding on port 9899")
else:
    print(f"! Server check: {status}")
    print("  If server is not running, start it with:")
    print(f"  ssh -p {port} root@{host} 'cd {remote_dir} && nohup python3 -m http.server 9899 > /tmp/pres.log 2>&1 &'")

print("✓ Deploy complete!")
PYEOF

rm -f /tmp/deploy-web-video.tar.gz
