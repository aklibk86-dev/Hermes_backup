---
name: vercel-static-deploy
description: "Deploy static SPA frontends (Vue/React) to Vercel: CLI setup, project config, custom domains, DNS alias management."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [Vercel, Deployment, SPA, Static-Site, Frontend, DevOps]
    related_skills: [vercel-static-deploy, github-auth]
---

# Vercel Static SPA Deployment

Deploy a static single-page application (Vue, React, etc.) to Vercel from a non-CI environment, including custom domain binding and Cloudflare DNS integration.

## Prerequisites

- Node.js + npm installed (`node --version && npm --version`)
- A Vercel account with a personal access token from https://vercel.com/account/tokens
- Built static files ready (typically in `dist/` or `build/` directory)
- (Optional) Cloudflare API credentials for DNS management

## Installation

```bash
# Install Vercel CLI globally (use --prefix if not root)
npm install -g vercel
# Or to a custom prefix:
npm install -g vercel --prefix /opt/data/.npm-global
export PATH="/opt/data/.npm-global/bin:$PATH"
```

## Deployment Steps

### 1. Project Config (vercel.json)

Create a `vercel.json` in the project root:

```json
{
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- `outputDirectory` — path to your built static files (e.g. `dist`, `build`, `out`)
- `rewrites` — essential for SPAs using History mode routing (Vue Router, React Router). Without this, direct URL access or refresh on sub-routes returns 404.

### 2. Authentication

```bash
# Using a personal access token (headless / CI)
vercel deploy --token YOUR_TOKEN

# Interactive browser login
vercel login
```

### 3. First Deploy

```bash
cd /path/to/project-root
vercel deploy --prod --yes --token YOUR_TOKEN
```

The first deploy creates a Vercel project and returns a production URL.

### 4. Subsequent Deploys

```bash
cd /path/to/project-root
vercel deploy --prod --yes --token YOUR_TOKEN
```

If the project already exists and `.vercel/project.json` exists locally, Vercel reuses the existing project.

### 5. Custom Domain

```bash
# Add domain to project
vercel domains add your-domain.com PROJECT_NAME --token YOUR_TOKEN

# Verify DNS configuration
vercel domains verify your-domain.com --token YOUR_TOKEN

# Alias the deployment to the domain
vercel alias set PRODUCTION_URL your-domain.com --token YOUR_TOKEN
```

### 6. Domain Removal

```bash
# Remove an alias
vercel alias rm unwanted-domain.com --yes --token YOUR_TOKEN

# Remove a domain from the project (also via API if CLI can't find it)
vercel domains rm unwanted-domain.com --project PROJECT_NAME --yes --token YOUR_TOKEN

# Force-remove a domain from one project so it can be added to another:
curl -s -X DELETE "https://api.vercel.com/v9/projects/PROJECT/domains/DOMAIN?teamId=TEAM_ID" \
  -H "Authorization: Bearer TOKEN"
```

> **Pitfall**: After each `vercel deploy --prod`, the previous production alias may re-attach. Always verify and re-alias to the correct domain after deployment.
>
> **Pitfall: Moving a domain between projects**: `vercel alias rm` only removes the alias — the domain stays registered on the original project. A subsequent `vercel domains add DOMAIN NEW_PROJECT` will fail with "already assigned to another project". You must first delete the domain from the source project via the REST API (shown above), then add it to the destination project.

## Common Configurations

### Vercel Environment Variable Injection (Recommended)

For projects with runtime config files (e.g. `public/env.js` in Stellar Theme), use a build-time script that reads Vercel environment variables and generates the config file. This lets you manage all settings through the Vercel Dashboard without editing files before each deploy.

#### Setup: generate-env.js

Create `scripts/generate-env.js` in the project root:

```js
// Reads Vercel env vars at build time, writes to public/env.js
import { writeFileSync } from 'fs'
const env = process.env

const output = `window.routerBase = '/'

window.settings = {
  title: ${JSON.stringify(env.STELLAR_TITLE || 'Stellar')},
  description: ${JSON.stringify(env.STELLAR_DESC || 'Stellar Panel')},
  landing_page_enabled: ${(env.STELLAR_LANDING_ENABLED !== 'false')},
  telegram_group: ${JSON.stringify(env.STELLAR_TG_GROUP || '')},
  api_error_contact: ${JSON.stringify(env.STELLAR_API_ERR_CONTACT || '')},
  client_downloads: {
    windows: ${JSON.stringify(env.STELLAR_DL_WINDOWS || '')},
    macos: ${JSON.stringify(env.STELLAR_DL_MACOS || '')},
    android: ${JSON.stringify(env.STELLAR_DL_ANDROID || '')},
    ios: ${JSON.stringify(env.STELLAR_DL_IOS || '')},
    linux: ${JSON.stringify(env.STELLAR_DL_LINUX || '')},
    router: ${JSON.stringify(env.STELLAR_DL_ROUTER || '')},
  },
  api: {
    url_mode: ${JSON.stringify(env.STELLAR_API_MODE || 'static')},
    static_base_urls: ${JSON.stringify((env.STELLAR_API_URLS || '').split(',').filter(Boolean))},
    check_enabled: ${(env.STELLAR_CHECK_ENABLED === 'true')},
    proxy_enabled: ${(env.STELLAR_PROXY_ENABLED === 'true')},
    proxy_url: ${JSON.stringify(env.STELLAR_PROXY_URL || '')},
    proxy_path: ${JSON.stringify(env.STELLAR_PROXY_PATH || '/api-proxy')},
  },
}`
writeFileSync('public/env.js', output, 'utf-8')
```

#### Update vercel.json

```json
{
  "buildCommand": "node scripts/generate-env.js && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Manage Environment Variables

```bash
# Add a new env var
echo "WF Portal" | vercel env add STELLAR_TITLE production --token YOUR_TOKEN

# Update (remove + re-add — Sensitive-type vars cannot be overwritten, must delete first)\nvercel env rm STELLAR_TITLE production --yes --token YOUR_TOKEN\necho "New Value" | vercel env add STELLAR_TITLE production --token YOUR_TOKEN

# List all vars
vercel env ls --token YOUR_TOKEN

# Deploy (build script reads current env vars)
vercel deploy --prod --yes --token YOUR_TOKEN
```

Add Chinese comments to env vars via the Vercel REST API (field is `comment`, not `note`):

```bash
# Get env var IDs
curl -s "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" | python3 -c "
import json,sys
for item in json.load(sys.stdin).get('envs', []):
    print(f\"{item['id']} | {item['key']}\")"

# Set comment on one env var
curl -s -X PATCH "https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${ENV_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"comment":"站点标题（浏览器标签/侧边栏名称）"}'
```

Naming convention for env vars: `PREFIX_KEY` (e.g. `STELLAR_TITLE`, `STELLAR_API_URLS`). Group by category: branding, API, proxy, downloads, etc.

### Direct env.js Edit (Quick Method)

For one-off edits without setting up env var injection:

```bash
sed -i "s|url_mode: 'auto'|url_mode: 'static'|" dist/env.js
sed -i "s|landing_page_enabled: true|landing_page_enabled: false|" dist/env.js
vercel deploy --prod --yes --token YOUR_TOKEN
```

### Cross-Server Transfer Pattern

When building on a remote server and deploying from a sandbox:

```bash
# On build server:
cd /tmp/project && tar czf dist.tar.gz dist

# Transfer via SFTP using paramiko:
# sftp.get("/tmp/dist.tar.gz", "/tmp/dist.tar.gz")

# On deployment machine:
tar xzf dist.tar.gz -C /tmp/deploy-dir

# Ensure vercel.json is present at the deploy root
cat > /tmp/deploy-dir/vercel.json << 'EOF'
{ "outputDirectory": "dist", "rewrites": [{"source": "/(.*)", "destination": "/index.html"}] }
EOF

cd /tmp/deploy-dir && vercel deploy --prod --yes --token YOUR_TOKEN
```

## Cloudflare DNS Integration

When using Cloudflare for DNS with Vercel custom domains:

```bash
# Add CNAME record via Cloudflare API
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: YOUR_EMAIL" \
  -H "X-Auth-Key: YOUR_GLOBAL_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"subdomain","content":"cname.vercel-dns.com","proxied":false,"ttl":120}'

# Delete existing record
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "X-Auth-Email: YOUR_EMAIL" \
  -H "X-Auth-Key: YOUR_GLOBAL_API_KEY"

# List records
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=A&name=domain.com" \
  -H "X-Auth-Email: YOUR_EMAIL" \
  -H "X-Auth-Key: YOUR_GLOBAL_API_KEY"
```

> **Note**: Vercel requires `proxied: false` (gray cloud) for CNAME records. Cloudflare proxy (orange cloud) is not compatible with Vercel's CNAME setup.

### Fixing Cloudflare 525 (SSL Handshake Failure)

When Cloudflare returns **525** (SSL handshake failure), it means Cloudflare is trying to connect to your origin via HTTPS but the server has no SSL certificate:

```bash
# Set Cloudflare SSL mode to "flexible" via API
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/ssl" \
  -H "X-Auth-Email: YOUR_EMAIL" \
  -H "X-Auth-Key: YOUR_GLOBAL_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"value":"flexible"}'
```

This makes Cloudflare connect to the origin over HTTP while still serving HTTPS to visitors. Use this when the origin server can't provide SSL (e.g. Docker container without cert, plain HTTP Nginx config).

## Docsify Deployment

Docsify is a runtime-rendered documentation site (loads Markdown from the browser). Unlike SPA frameworks, its HTML is minimal — the real content comes from `.md` files.

### Project Structure

```
docsify-site/
├── index.html          # Docsify entry + config
├── README.md           # Homepage content
├── _sidebar.md         # Sidebar navigation
├── .nojekyll           # Disable GitHub Pages Jekyll processing
├── guide/              # Documentation pages
│   ├── quickstart.md
│   └── editing.md
└── about/
    └── tech-stack.md
```

### Essential Config (index.html)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css">
<body>
  <div id="app"></div>
  <script>
    window.$docsify = {
      name: 'Site Name',
      repo: '',
      loadSidebar: true,        // Enable _sidebar.md
      subMaxLevel: 3,
      search: {
        placeholder: '搜索...',
        noData: '没有结果'
      }
    }
  </script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js"></script>
</body>
```

Use full `https://cdn.jsdelivr.net` URLs (not `//cdn.jsdelivr.net`) to avoid mixed-content issues on Vercel.

### Vercel Config

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Deploy

```bash
cd /path/to/docsify-site
vercel deploy --prod --yes --token YOUR_TOKEN
```

## Pitfalls

| Issue | Fix |
|-------|-----|
| `Error: The --prebuilt option was used, but no prebuilt output found in .vercel/output` | Don't use `--prebuilt` for simple static deployments. Just use `vercel deploy --prod` without it. |
| Domain keeps aliasing to wrong deployment | Remove the stale alias first: `vercel alias rm stale-domain.com --yes`, then re-alias and verify. Stale aliases may persist across deploys. |
| Vercel shows \\"Redirecting...\\" for env.js | The `outputDirectory` isn't set correctly in vercel.json, or vercel.json is missing from the deploy root. |
| SPA routes return 404 on refresh | Add rewrites to vercel.json: `{\"source\": \"/(.*)\", \"destination\": \"/index.html\"}` |
| Docsify shows 404 or blank page | Use full `https://cdn.jsdelivr.net` URLs (not `//cdn.jsdelivr.net`), and ensure vercel.json has SPA rewrites. |
| `npm install -g vercel` fails with EACCES | Use `npm install -g vercel --prefix /path/to/writable/dir` and add to PATH. |
| Custom domain verification fails | Check DNS: subdomains need a CNAME to `cname.vercel-dns.com` (or a specific `*.vercel-dns-xxx.com` target). Apex domains need A records pointing to Vercel's IPs. |
| Cloudflare 525 after adding domain | Set SSL mode to `flexible` via API (see Cloudflare section above). |
| Domain keeps aliasing to wrong deployment | Remove the stale alias first: `vercel alias rm stale-domain.com --yes`, then re-alias to the correct URL. Stale aliases may persist across deploys — always verify after deploy. |
| Env var values go missing after CLI rm/add | Vercel's `vercel env rm KEY production --yes` then `vercel env add` can leave values empty if add times out. Prefer REST API PATCH: `curl -s -X PATCH \"https://api.vercel.com/v10/projects/PROJECT_ID/env/ENV_ID?teamId=TEAM_ID\" -H \"Authorization: Bearer TOKEN\" -H \"Content-Type: application/json\" -d '{\"value\":\"new-value\"}'` |
| Domain stuck on wrong project (400 error) | `vercel alias rm` is not enough — domain stays registered on source project. Delete via REST API: `curl -X DELETE https://api.vercel.com/v9/projects/SOURCE/domains/DOMAIN?teamId=TEAM_ID -H "Authorization: Bearer TOKEN"`, then re-add to correct project. |",
"path": "software-development/vercel-static-deploy/SKILL.md"