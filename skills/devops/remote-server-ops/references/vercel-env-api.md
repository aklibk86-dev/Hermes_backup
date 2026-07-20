# Vercel Environment Variables: API Management

When the `vercel env add` CLI fails with "already exists" errors or env vars get cleared to empty strings, use the Vercel REST API to PATCH values directly.

## Key Quirks

- `vercel env rm` doesn't always work — the CLI may report success but the API still shows the variable
- `vercel env add` fails with `Error: A variable with the name \`KEY\` already exists` for existing vars
- API returns empty values with `decrypt=true` for "encrypted" type variables (security feature)
- But PATCHING the value via API **does work** — the value is stored correctly even if the API won't show it

## Workflow: List, Find IDs, PATCH

```python
import json, subprocess

TOKEN = "vcp_..."
TEAM = "team_..."
PID = "prj_..."

# 1. List all env vars with their IDs
r = subprocess.run(["curl", "-s",
    f"https://api.vercel.com/v10/projects/{PID}/env?teamId={TEAM}",
    "-H", f"Authorization: Bearer {TOKEN}"], capture_output=True, text=True, timeout=15)
data = json.loads(r.stdout)
key_to_id = {item['key']: item['id'] for item in data.get('envs', [])}

# 2. PATCH each value
values = {
    "STELLAR_TITLE": "Stellar",
    "STELLAR_API_MODE": "static",
    "STELLAR_API_URLS": "https://api1.example.com,https://api2.example.com",
}

for key, val in values.items():
    eid = key_to_id.get(key)
    if not eid:
        print(f"SKIP {key}: no ID found")
        continue
    payload = json.dumps({"value": val})
    r = subprocess.run(["curl", "-s", "-X", "PATCH",
        f"https://api.vercel.com/v10/projects/{PID}/env/{eid}?teamId={TEAM}",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload], capture_output=True, text=True, timeout=10)
    resp = json.loads(r.stdout) if r.stdout else {}
    ok = "ok" if resp.get("key") == key else f"FAIL"
    print(f"{key:35s} -> {ok}")
```

## Trigger Deploy After PATCH

The PATCH takes effect on the **next deployment**. To force a deploy immediately:

```bash
cd /tmp/project-dir && vercel deploy --prod --yes --token YOUR_TOKEN
```

Or use the Vercel API deploy hook if one is configured.

## Setting "Note" (Comment) on Env Vars

Vercel's UI shows a "Note (Optional)" field for each env var. This maps to the `comment` field in the API:

```python
payload = json.dumps({"value": "new-value", "comment": "站点标题（浏览器标签名称）"})
r = subprocess.run(["curl", "-s", "-X", "PATCH",
    f"https://api.vercel.com/v10/projects/{PID}/env/{eid}?teamId={TEAM}",
    "-H", f"Authorization: Bearer {TOKEN}",
    "-H", "Content-Type: application/json",
    "-d", payload], ...)
```

## When to Deploy from GitHub (Connected Repo)

If the Vercel project is connected to a GitHub repo, the recommended workflow is:

1. Push code changes to GitHub (auto-deploy triggers)
2. To change env vars: use the API PATCH above
3. To force a deploy with new env vars without code changes:
   - PATCH the env vars via API
   - Then `vercel deploy --prod` from the local repo

## Key: Env Vars Look Empty But Are Set

The Vercel API with `decrypt=true` returns empty strings for "encrypted" type environment variables. This is normal — the value is stored but not readable through the API after initial creation. **The PATCH works anyway** — the value IS set correctly on subsequent deploys (verify by checking the generated env.js after deploy).
