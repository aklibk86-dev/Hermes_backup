# Multi-Service SPA Reverse Proxy Behind 1Panel OpenResty

## When This Pattern Applies

Some web apps ship as **multiple containers**: a Go/Node.js **API backend**, a **user-facing SPA frontend**, and an **admin SPA frontend** — all running on different ports. The Nginx/OpenResty layer must route requests to the correct backend based on URL path:

| Path | Target | Service |
|------|--------|---------|
| `/` | SPA frontend | User/Admin SPA (port 8081/8082) |
| `/api/` | API backend | Go API server (port 8080) |
| `/uploads/` | API backend | File storage handler (same API server) |
| `/sitemap.xml` | API backend | Dynamic SEO content (same API server) |
| `/robots.txt` | API backend | Dynamic SEO content (same API server) |

## Concrete Example: Dujiao-Next

**Dujiao-Next** (dujiao-next.com) is an open-source digital goods sales platform with this architecture:

| Container | Port | Purpose |
|-----------|------|---------|
| `dujiaonext-api` | `127.0.0.1:8080` | Go API server |
| `dujiaonext-user` | `127.0.0.1:8081` | User-facing SPA (Vue) |
| `dujiaonext-admin` | `127.0.0.1:8082` | Admin SPA (Vue) |

### Frontend Nginx config (shop.aklibk.com)

```nginx
server {
    listen 80;
    server_name shop.aklibk.com;
    client_max_body_size 50m;

    # SEO — must bypass SPA catch-all, proxy to API backend
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080/sitemap.xml;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:8080/robots.txt;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads proxy to backend
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA frontend (catch-all)
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Admin Nginx config (shop-admin.aklibk.com)

```nginx
server {
    listen 80;
    server_name shop-admin.aklibk.com;
    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Key Principles

1. **Explicit order matters** — `location = /sitemap.xml` (exact match, highest priority) must come before `location /` (prefix match, lowest priority). Nginx processes `=` > `^~` > `~` > (plain prefix), so exact matches always win.

2. **SEO paths must bypass the SPA** — If `/sitemap.xml` and `/robots.txt` hit the SPA, they get served the `index.html` (SPA fallback) instead of the dynamic XML/text the search engine expects. Use `location =` for these exact paths.

3. **`trailing /` matters** — `proxy_pass http://127.0.0.1:8080/api/` (with trailing slash) strips the matched prefix. A request to `/api/v1/products` becomes `http://127.0.0.1:8080/api/v1/products`. Without the trailing slash, it'd become `http://127.0.0.1:8080/api/v1/products` too (Nginx appends the original URI), but *with* the trailing slash the behavior is more explicit and consistent.

4. **Docker port binding** — Bind API/SPA ports to `127.0.0.1` only, never `0.0.0.0`. The Docker compose port spec: `"127.0.0.1:8080:8080"`. This prevents direct public access while keeping services reachable via the host's OpenResty.

## Common Pitfalls

- **Empty `<title>` on SPA page** — If the SPA title is empty when proxied, check if the API proxy is needed for initial data fetch. Some SPAs SSR-render the title from API data.
- **`/api/` returns 404 on root** — Most APIs don't register a handler for `/api/` (only `/api/v1/...` etc.). This is normal — don't mistake root 404 for a routing failure.
- **Cloudflare proxied + HTTP-only backend** — With `proxied: true` (orange cloud), Cloudflare terminates HTTPS and forwards HTTP to your origin on port 80. The Nginx config only needs `listen 80` — no SSL certs needed on the origin.
