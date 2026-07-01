# Firecrawl Cleanup (2026-06-30)

## Context

VPS1 (149.104.8.237, 8GB RAM) had 6.7Gi/7.8Gi used (86%). Firecrawl was the #1 consumer at ~4.8Gi total.

Memory was at 86% utilization — only 1.1Gi available, no swap. User said "删了吧".

## Containers Removed

7 containers stopped and deleted:

| Container | Image | Memory |
|-----------|-------|:------:|
| firecrawl-api-1 | ghcr.io/firecrawl/firecrawl | 2.4Gi |
| firecrawl-rabbitmq-1 | rabbitmq:3-management | 273Mi |
| firecrawl-redis-1 | redis:alpine | 10Mi |
| firecrawl-nuq-postgres-1 | ghcr.io/firecrawl/nuq-postgres | 128Mi |
| firecrawl-foundationdb-1 | foundationdb/foundationdb:7.3.63 | 69Mi |
| firecrawl-foundationdb-init-1 | foundationdb/foundationdb:7.3.63 | 0 (exited) |
| firecrawl-playwright-service-1 | ghcr.io/firecrawl/playwright-service | 244Mi |

## Other Resources Removed

- Docker network: `firecrawl_backend`
- Project directory: `/opt/firecrawl` (entire repo + data)
- Nginx config: `/opt/1panel/apps/openresty/openresty/conf/default/umami.conf` (was proxying to Firecrawl port 3002)

## Result

- Before: **6.7Gi / 7.8Gi used** (86%, 1.1Gi available)
- After: **3.7Gi / 7.8Gi used** (47%, 4.1Gi available)
- **3Gi reclaimed** (38% of total RAM)

## Note on umami.aklibk.com

The domain `umami.aklibk.com` was proxying to Firecrawl on port 3002. After cleanup, the domain will 502 unless:

1. DNS is updated to point to VPS2 (38.55.194.79) where the real Umami instance runs on port 3002
2. Or a new Nginx config is created on VPS1 to proxy to VPS2's Umami

## Future Reference

Firecrawl's self-hosted mode is memory-heavy. Before deploying again:
- Reduce `NUM_WORKERS_PER_QUEUE` from default 8 to 2-3
- Set container memory limits per service
- Consider using the Firecrawl Cloud API instead if self-hosting is not required
