# Nginx CORS Configuration for Cross-Origin Deployments

When the frontend (Vercel) and backend (VPS1) are on different domains, the browser blocks cross-origin POST/PUT/DELETE requests unless the server responds with proper CORS headers.

## Symptom

- `请求方法不允许` (405) or CORS errors in browser console
- Login fails, API calls return blocked

## Nginx CORS Config

Add to the `location /` block of the backend's Nginx vhost:

```nginx
server {
    listen 80;
    server_name backend.example.com;
    charset utf-8;

    location / {
        # CORS headers for browser cross-origin requests
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header Access-Control-Expose-Headers 'Content-Length,Content-Range' always;

        # Handle preflight OPTIONS request (required before actual POST/PUT/DELETE)
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin '*' always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://127.0.0.1:7001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Key points:
- `add_header` directives MUST be inside the `location /` block (not at `server` level when mixed with `if`)
- The `if ($request_method = 'OPTIONS')` block handles the CORS preflight
- `Access-Control-Max-Age 1728000` = 20 days cache for preflight, reduces repeated OPTIONS calls

## Apply Config

```bash
# Write config, test, reload
docker exec 1Panel-openresty-z6Pg nginx -t
docker exec 1Panel-openresty-z6Pg nginx -s reload
```

## Verify CORS

```bash
curl -s -X OPTIONS -I 'http://127.0.0.1/' \
  -H 'Origin: https://frontend.example.com' \
  -H 'Access-Control-Request-Method: POST' | grep -i access-control
```

Expected response headers:
- `access-control-allow-origin: *`
- `access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS`
