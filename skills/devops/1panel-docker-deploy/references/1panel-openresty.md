# 1Panel OpenResty (Nginx) Configuration

## Container Identity

The 1Panel-managed OpenResty container is typically named:
`1Panel-openresty-qMxV`

Verify with: `docker ps | grep openresty`

## Path Mappings (Host -> Container)

| Host | Container |
|------|-----------|
| /opt/1panel/apps/openresty/openresty/conf/nginx.conf | /usr/local/openresty/nginx/conf/nginx.conf |
| /opt/1panel/apps/openresty/openresty/conf/default/*.conf | /usr/local/openresty/nginx/conf/default/*.conf |
| **/opt/1panel/www/conf.d/*.conf** | **/usr/local/openresty/nginx/conf/conf.d/*.conf** |
| /opt/1panel/apps/openresty/openresty/log/ | /var/log/nginx/ |

## Common Commands

```bash
# Test config syntax
docker exec 1Panel-openresty-qMxV nginx -t

# Reload config (no downtime)
docker exec 1Panel-openresty-qMxV nginx -s reload

# Check logs
docker logs 1Panel-openresty-qMxV --tail 50
```

## Site Config Template

Save to either:
- `/opt/1panel/www/conf.d/<name>.conf` (preferred for manual reverse proxies)
- `/opt/1panel/apps/openresty/openresty/conf/default/<name>.conf` (for 1Panel-managed sites)

```nginx
server {
    listen 80;
    server_name <domain>;
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:<app_port>;
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

## SSL Notes

Cloudflare Flexible SSL is used: Cloudflare terminates HTTPS at edge, sends plain HTTP to origin on port 80.
The `listen 80;` config is sufficient. No local SSL certs needed.

## Important

- Always delete the config file from `default/` when removing a project
- Always run `nginx -t` before `nginx -s reload` to catch syntax errors
- If adding a catch-all IP config, user explicitly asked for this NOT to be done
- Existing sites on this setup: blog.aklibk.com (Halo), n8n.aklibk.com, pan.aklibk.com, shop.aklibk.com (Dujiao-Next), shop-admin.aklibk.com (Dujiao-Next admin), api.wf1.one (New API), telegram.wf1.one (TelegramMonitor)
