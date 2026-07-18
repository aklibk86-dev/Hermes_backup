# SSH with Password via Paramiko (Fallback Method)

When the sandbox lacks `sshpass` and `expect`, use paramiko via a temporary uv venv.

## Setup

```bash
uv venv /tmp/ssh_venv
uv pip install --python /tmp/ssh_venv/bin/python paramiko
```

## Full Script Template

```python
#!/tmp/ssh_venv/bin/python
import paramiko, sys, time

HOST = "149.104.8.237"
PORT = 17422
USER = "root"
PASSWORD = "..."
TIMEOUT = 120

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(hostname=HOST, port=PORT, username=USER,
                   password=PASSWORD, timeout=10)
    print("SSH_OK", flush=True)

    # Simple command (stdout + stderr)
    stdin, stdout, stderr = client.exec_command("command 2>&1")
    print(stdout.read().decode())

    # Long-running with streaming
    transport = client.get_transport()
    channel = transport.open_session()
    channel.get_pty()
    channel.exec_command("long_command 2>&1")
    start = time.time()
    while time.time() - start < TIMEOUT:
        if channel.recv_ready():
            print(channel.recv(4096).decode(errors='replace'), end='', flush=True)
        if channel.exit_status_ready():
            break
        time.sleep(0.5)
    
    exit_code = channel.recv_exit_status()
    print(f"\nEXIT: {exit_code}")
    client.close()
except Exception as e:
    print(f"ERROR: {e}")
    try: client.close()
    except: pass
```

## Run

```bash
/tmp/ssh_venv/bin/python /tmp/script.py
```

## Key Points

- **`AutoAddPolicy()`** avoids interactive host key prompts
- **`channel.get_pty()`** is required for commands that expect a terminal (docker compose with TTY)
- **`channel.recv(4096)`** streams output in real-time — avoids buffering until command completes
- **Drop `-it`** from docker commands when using non-interactive SSH since the TTY flag conflicts with non-TTY stdin
- **`2>&1`** is important because stderr is otherwise captured separately and may not print
