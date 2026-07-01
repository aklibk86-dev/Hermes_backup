# MCP Protocol Interaction Pattern (Python asyncio)

Use this template to interact with any MCP stdio server from a Python script.

## Basic Template

```python
import asyncio
import json
import os

async def main():
    # Start server from its .env directory (important for config loading)
    cwd = os.path.expanduser('~/halo-mcp-server')
    proc_env = os.environ.copy()
    # Remove token from env so server reads from .env file
    proc_env.pop('HALO_TOKEN', None)
    
    proc = await asyncio.create_subprocess_exec(
        'python3', '-u', '-m', 'halo_mcp_server',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd, env=proc_env
    )
    
    # Drain stderr in background (prevents buffer full)
    asyncio.create_task(drain_stderr(proc.stderr))
    await asyncio.sleep(1.5)  # Wait for server to init
    
    # 1. Initialize
    await mcp_send(proc, 1, 'initialize', {
        'protocolVersion': '2024-11-05',
        'capabilities': {},
        'clientInfo': {'name': 'client-name', 'version': '1.0.0'}
    })
    resp = await mcp_recv(proc)
    server_info = resp['result']['serverInfo']
    
    # 2. Call a tool
    await mcp_send(proc, 2, 'tools/call', {
        'name': 'tool_name',
        'arguments': {'key': 'value'}
    })
    resp = await mcp_recv(proc)
    result = resp.get('result', {})
    
    if result.get('isError'):
        error_text = result.get('content', [{}])[0].get('text', '')
        print(f'Error: {error_text}')
    else:
        success_text = result['content'][0]['text']
        print(f'Success: {success_text}')
    
    proc.kill()
    await proc.wait()

async def drain_stderr(stream):
    while True:
        line = await stream.readline()
        if not line:
            break

async def mcp_send(proc, id, method, params=None):
    req = {'jsonrpc': '2.0', 'id': id, 'method': method, 'params': params or {}}
    proc.stdin.write((json.dumps(req) + '\n').encode())
    await proc.stdin.drain()

async def mcp_recv(proc):
    line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
    return json.loads(line.decode())

asyncio.run(main())
```

## Halo API Direct Call Pattern (No MCP)

For operations that the MCP server's tools can't handle (e.g., hard delete via Content API), call Halo's REST APIs directly:

```python
import httpx
import os

# Read token from .env file to avoid terminal redaction
with open(os.path.expanduser('~/halo-mcp-server/.env')) as f:
    token = ''
    for line in f:
        if 'HALO_TOKEN' in line and '=' in line:
            token = line.split('=', 1)[1].strip()

BASE = 'https://blog.aklibk.com'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Console API (list, create)
r = httpx.get(f'{BASE}/apis/api.console.halo.run/v1alpha1/posts',
              headers=headers, params={'page': 0, 'size': 50})

# Content API (hard delete, label update)
r = httpx.delete(f'{BASE}/apis/content.halo.run/v1alpha1/posts/{name}',
                 headers=headers)

# Stats
r = httpx.get(f'{BASE}/apis/api.console.halo.run/v1alpha1/stats',
              headers=headers)
```

## Async MCP + Direct API Hybrid

For complex workflows, combine MCP tools with direct REST calls in one script.
