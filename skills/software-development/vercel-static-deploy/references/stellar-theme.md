# Stellar Theme - Vercel Deployment Reference

## Runtime Configuration (env.js)

The Stellar theme uses `dist/env.js` for runtime configuration. No rebuild needed — edit the file and refresh.

Key settings:

```js
window.settings = {
  // Branding
  title: 'WF Portal',
  description: 'WF Portal',
  
  // Landing page
  landing_page_enabled: false,      // false = skip landing, go straight to login/dashboard
  landing_theme_mode: 'dark',       // 'dark' or 'light'
  
  // API configuration
  api: {
    url_mode: 'static',             // 'auto' (same-domain) or 'static' (explicit URLs)
    static_base_urls: [
      'https://backend1.example.com',
      'https://backend2.example.com'
    ],
    check_enabled: true,            // health-check multiple backends
    check_path: '/api/v1/guest/comm/config',
    
    auto: {
      use_same_protocol: true,
      host: '',                     // API hostname for auto mode
      append_path: '',              // e.g. '/api' for same-domain proxy
    },
  },
}
```

## Vercel Config (vercel.json)

```json
{
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The rewrites block is required for Vue Router History mode — without it, refreshing any route returns 404.

## Recommended Approach: Vercel Environment Variables

Instead of editing `dist/env.js` directly (which gets overwritten on rebuild), use a build-time script that reads Vercel Environment Variables:

1. Add `scripts/generate-env.js` to the repo (see `vercel-static-deploy` skill's linked script)
2. Set `"buildCommand": "node scripts/generate-env.js && npm run build"` in `vercel.json`
3. Manage all config values in Vercel Dashboard → Project → Settings → Environment Variables

This way:
- No code changes needed for config updates
- Values are encrypted at rest
- Multiple environments (preview/production) can have different values
- Chinese comments can be added to each env var via the Vercel REST API (`comment` field)

### Env Var Prefix Convention

All Stellar-related env vars use the `STELLAR_` prefix:

| Group | Variables |
|-------|-----------|
| Branding | `STELLAR_TITLE`, `STELLAR_DESC`, `STELLAR_LOGO_URL`, `STELLAR_BG_URL` |
| Landing | `STELLAR_LANDING_ENABLED`, `STELLAR_LANDING_MODE` |
| Social | `STELLAR_TG_GROUP`, `STELLAR_API_ERR_CONTACT` |
| Downloads | `STELLAR_DL_WINDOWS`, `STELLAR_DL_MACOS`, `STELLAR_DL_ANDROID`, `STELLAR_DL_IOS`, `STELLAR_DL_LINUX`, `STELLAR_DL_ROUTER` |
| API | `STELLAR_API_MODE`, `STELLAR_API_URLS`, `STELLAR_CHECK_ENABLED` |
| Auto (mode=auto) | `STELLAR_AUTO_HOST`, `STELLAR_AUTO_PATH`, `STELLAR_AUTO_SAME_PROTOCOL` |
| Proxy | `STELLAR_PROXY_ENABLED`, `STELLAR_PROXY_URL`, `STELLAR_PROXY_PATH`, `STELLAR_PROXY_MODE` |

### Updating Values via API (for Chinese comments)

```bash
# Get env var IDs
curl -s "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"

# Set value via PATCH (preferred over CLI rm+add, which can leave values empty)
curl -s -X PATCH "https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${ENV_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"value":"WF Portal"}'

# Set Chinese comment on an env var
curl -s -X PATCH "https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${ENV_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"comment":"站点标题（浏览器标签/侧边栏名称）"}'
```

> ⚠️ CLI Pitfall: `vercel env rm KEY production --yes` + `vercel env add` can silently leave values empty if `add` times out. Prefer the REST API PATCH approach above.

## Quick Method (Edit dist/env.js directly)

For one-off deployments without setting up env vars:

```bash
cd /path/to/project-root
# Edit dist/env.js with sed or manually
sed -i "s|url_mode: 'auto'|url_mode: 'static'|" dist/env.js
sed -i "s|landing_page_enabled: true|landing_page_enabled: false|" dist/env.js
vercel deploy --prod --yes --token YOUR_TOKEN
```

## Deploy Command

```bash
cd /path/to/project-root
vercel deploy --prod --yes --token YOUR_TOKEN
```

## Version Updates

When the upstream GitHub repo updates:

1. Fresh clone: `git clone --depth 1 https://github.com/aklibk86-dev/stellar.git`
2. Copy over `scripts/generate-env.js` and `vercel.json` from previous deployment
3. Run `npm ci && npm run build` (if local build is needed) OR deploy directly and let Vercel build
4. Run `vercel deploy --prod --yes --token YOUR_TOKEN`
5. After deploy, check alias: it may attach to a stale domain — re-alias to correct one:
   ```
   vercel alias rm wrong-domain.com --yes
   vercel alias set production-url.vercel.app correct-domain.com
   ```
6. Verify env.js was generated correctly: `curl -s https://your-domain.com/env.js | grep title`
