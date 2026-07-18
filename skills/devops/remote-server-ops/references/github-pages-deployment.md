# GitHub Pages Static Site Deployment

Deploy pre-built static sites (VitePress, Hugo, plain HTML/CSS/JS) to GitHub Pages, with optional Cloudflare custom domain.

## Workflow

### 1. Build the project locally

```bash
git clone --depth 1 https://github.com/USER/REPO.git
cd REPO
npm ci
npm run build
# Build output is typically in .vitepress/dist/ or dist/
```

### 2. Create and push gh-pages branch

```bash
# Save build output
mkdir -p /tmp/dist
cp -r .vitepress/dist/* /tmp/dist/

# Create orphan gh-pages branch from a fresh clone
cd /tmp
git clone --depth 1 https://github.com/USER/REPO.git gh-deploy
cd gh-deploy
git checkout --orphan gh-pages
rm -rf $(ls -A | grep -v .git)  # Remove all tracked files but keep .git
cp -r /tmp/dist/* .
git add -A
git -c user.email="you@users.noreply.github.com" -c user.name="you" commit -m "deploy gh-pages"
git remote set-url origin https://TOKEN@github.com/USER/REPO.git
git push origin gh-pages --force
```

### 3. Enable GitHub Pages via API

```bash
# Check current status
curl -s -H "Authorization: token TOKEN" \
  "https://api.github.com/repos/USER/REPO/pages"

# Enable/update Pages from gh-pages branch root
curl -s -X POST -H "Authorization: token TOKEN" -H "Content-Type: application/json" \
  "https://api.github.com/repos/USER/REPO/pages" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}'

# Set custom domain (optional)
curl -s -X PUT -H "Authorization: token TOKEN" -H "Content-Type: application/json" \
  "https://api.github.com/repos/USER/REPO/pages" \
  -d '{"cname":"custom.domain.com"}'
```

### 4. Cloudflare DNS

Add CNAME record in Cloudflare:

| Type | Name | Target |
|------|------|--------|
| CNAME | subdomain | `USER.github.io` |

**Important**: Proxy (orange cloud) works fine with GitHub Pages. No need to disable it.

### 5. Verify

```bash
curl -sI --connect-timeout 10 https://custom.domain.com/ | head -5
# Expect: HTTP/2 200, server: cloudflare
```

## CNAME + Cloudflare Ordering

1. Add Cloudflare CNAME record FIRST (pointing to `USER.github.io`)
2. Set custom domain via GitHub Pages API SECOND (`cname` field)
3. GitHub Pages auto-provisions an SSL cert for the custom domain

If you set the CNAME before the Cloudflare DNS record exists, GitHub Pages will reject it.

## Vercel + GitHub Pages Coexistence

The same repo can be deployed to both Vercel (auto-build from main branch) and GitHub Pages (manual gh-pages branch). Just change the Cloudflare CNAME target to whichever service you want active.

## vs Vercel

| | GitHub Pages | Vercel |
|---|---|---|
| Build | Manual (gh-pages branch push) | Auto (from repo) |
| SSL | Auto (Let's Encrypt) | Auto + custom domain |
| CI/CD | Needs GitHub Actions or manual | Built-in |
| Performance | Good (CDN) | Better (edge functions) |
| Custom domain | Via API + Cloudflare DNS | Via CLI or dashboard |

Use GitHub Pages when:
- You don't need server-side logic
- The project is a simple static site (VitePress, Hugo, Jekyll)
- You want to keep everything on GitHub

Use Vercel when:
- You need environment variables at build time
- You want auto-deploy on git push
- You need serverless functions or middleware
