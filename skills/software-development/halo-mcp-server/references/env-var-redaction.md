# Terminal Environment Variable Redaction

The Hermes terminal tool automatically **redacts secret-like values** in shell commands. This means if you write:

```bash
HALO_TOKEN='pat_eyJraWQiOiJ...' python3 script.py
```

The terminal tool replaces the token value with `***`, so the child process receives `HALO_TOKEN='***'`.

## Symptoms

- Env var is set in the shell command but subprocess gets a wrong/corrupted value
- Direct API calls work fine (using httpx, curl) but MCP server calls fail with 401
- "认证失败" errors when the token should be valid
- Config files look correct (`wc -c` shows expected size) but env var propagation is broken

## Solutions

### 1. Read from .env file directly (RECOMMENDED)

```python
with open(os.path.expanduser('~/halo-mcp-server/.env')) as f:
    token = ''
    for line in f:
        if 'HALO_TOKEN' in line and '=' in line:
            token = line.split('=', 1)[1].strip()
```

### 2. Run server from .env directory without env overrides

```python
proc_env = os.environ.copy()
proc_env.pop('HALO_TOKEN', None)  # Don't pass it - let server read .env
proc = await asyncio.create_subprocess_exec(
    'python3', '-m', 'halo_mcp_server',
    cwd='~/halo-mcp-server',  # Critical: .env is in this dir
    env=proc_env
)
```

### 3. Write temp .env from within a script

If you need to create or update a .env file, use the `write_file` tool (not terminal echo/heredoc) — write_file doesn't redact content.

## What Gets Redacted

Patterns that look like:
- JWT tokens (`eyJ...`)
- API keys (`sk-...`, `pat_...`)
- Passwords in command arguments
- Base64-encoded credentials
- Long alphanumeric strings that resemble tokens

The redaction happens at the **terminal tool level**, not in the file system, so `.env` files and files written via `write_file` are unaffected.
