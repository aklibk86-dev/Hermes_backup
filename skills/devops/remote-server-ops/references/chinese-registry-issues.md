# Chinese Registry Connectivity Issues

When deploying Docker-based projects on a Hong Kong VPS that pull images from mainland Chinese registries (Alibaba Cloud CR, etc.), cross-border network issues are common.

## Symptoms

- `docker pull` or `docker compose up -d` hangs or fails with:
  - `failed to authorize: failed to fetch anonymous token`
  - `read: connection reset by peer` (often via IPv6)
  - `i/o timeout`
  - `curl: (23) Failure writing output to destination`

## Root Cause

Hong Kong VPS → mainland China Alibaba Cloud registry traffic is often throttled, reset, or routed over broken IPv6 paths. The registry itself is reachable (returns HTTP 401 / 200 on `curl`), but Docker's authentication handshake fails due to TCP RST.

## Diagnosis

```bash
curl -4s --connect-timeout 10 https://chaitin-registry.cn-hangzhou.cr.aliyuncs.com/v2/
curl -4s --connect-timeout 10 "https://dockerauth.cn-hangzhou.aliyuncs.com/auth?scope=repository:chaitin/test:pull&service=registry.aliyuncs.com:cn-hangzhou:china:cri-xxx"
```

## Attempted Fixes

1. **Force IPv4 in /etc/hosts** — resolve correct IPs first, add to hosts file
2. **Retry at different times** — cross-border connectivity varies by time of day
3. **Use a mainland China VPS** — the only reliable fix for Chinese-registry-based projects
