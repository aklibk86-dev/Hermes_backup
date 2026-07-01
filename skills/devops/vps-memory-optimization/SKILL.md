---
name: vps-memory-optimization
description: "Diagnose VPS memory pressure, identify top consumers (Docker + host processes), and reclaim memory by removing or scaling down unused services."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vps, memory, diagnostics, optimization, cleanup, docker]
    related_skills: [1panel, docker-container-migration]
---

# VPS Memory Optimization

## When to Use

User says "内存又不够了", "内存占用太高", or any complaint about VPS memory pressure. Also when deploying new services and need to know if there's headroom.

Always run diagnostics first before suggesting removals.

## Diagnostics Workflow

### 1. Quick Overview

```bash
free -h                          # Total / Used / Available
cat /proc/meminfo | head -5      # Detailed breakdown (MemTotal, MemFree, MemAvailable)
```

### 2. Top Host Processes (by memory)

```bash
ps aux --sort=-%mem | head -20
```

Key columns: `%MEM`, `RSS` (resident set size in KB), `COMMAND`.

### 3. Docker Container Memory

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'
```

Look for containers near their memory limit (e.g. `82.14%` of 1Gi) — these are at risk of OOM kill.

### 4. Cross-Reference

Merge the two lists: a container showing high memory in Docker stats may correspond to a host process in `ps aux`. For example, `firecrawl-api-1` (2.4Gi in Docker) = `node dist/src/index.js` (312MB RSS in ps).

It's normal for Docker stats to report higher than `ps aux` RSS because Docker includes shared memory, caches, and the container's allocated pages.

## Identifying Optimization Targets

### High-Value Targets (largest gains)

| Target | Typical Memory | Notes |
|--------|:------------:|-------|
| Large Node.js apps (Firecrawl, etc.) | 2-5 Gi | Multiple workers + queue system + DB |
| Java apps (Halo, etc.) | 500-600 Mi | JVM heap + JIT cache |
| PHP apps (XBoard, etc.) | 800+ Mi | PHP-FPM workers if misconfigured |
| Heavy DB containers (Postgres) | 30-130 Mi | Usually fine, don't remove |
| RabbitMQ / Redis | 10-270 Mi | Usually fine, don't remove |

### Low-Value Targets (small gains)

- Redis, Postgres, Nginx — essential, small footprint (<130Mi each)
- Simple static sites (Sun-Panel, etc.) — <25Mi

## Cleanup Options

Ask the user which approach they prefer, or present the analysis and let them decide.

### D. Add Swap (insurance against OOM)

If `Swap: 0B` in `free -h` and physical memory is close to its limit, add swap **without rebooting**. The step-by-step pattern lives in `remote-ssh-access` skill → `references/disk-cleanup.md` → "Edge Case: Adding Swap Without Rebooting the VPS". Quick version:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness = 10' >> /etc/sysctl.conf
free -h    # verify Swap: 4.0Gi
```

**Why this matters for the OOM-risk path**: even after Step A, A+B+C, if the VPS host runs with 0 swap and memory still tight, the next memory spike will OOM-kill the largest process. Swap is the cheap insurance that turns a "process dies at 100% memory" into "graceful paging at 95% memory".

## Pitfalls

1. **No swap = OOM kill at limit** — VPSes often have swap disabled. If memory hits 100%, the kernel kills the largest process. Keep 15-20% headroom. **Fix**: add swap without reboot — see `references/disk-cleanup.md` in remote-ssh-access under the "Adding Swap Without Rebooting" section.
2. **Docker stats vs ps aux discrepancy** — Docker's MemUsage includes the container's cgroup memory (cache + shared pages). Always trust `free -h` available memory for the host's true picture.
3. **Removing a service ≠ removing its config** — Always clean up Nginx configs and DNS records, otherwise the domain will 502/404 and confuse future troubleshooting.
4. **Don't remove DBs without user approval** — PostgreSQL/MySQL containers often hold important data.
5. **Firecrawl is the #1 memory hog on any VPS** — Its 6+ containers (API + workers + RabbitMQ + Postgres + FoundationDB + Playwright) easily consume 4-5Gi. The NUQ workers are the heaviest individual processes at ~270-310Mi each.
6. **`docker system prune -f` will silently drop images that stopped containers still need** — If you have stopped containers you plan to restart, their images get removed too. Use targeted deletion instead: see `references/disk-cleanup.md` in remote-ssh-access under "Edge Case: `docker image prune -a` reports 0B reclaimed".

1. **Stop and remove containers**:
   ```bash
   docker rm -f container-name
   ```

2. **Remove associated Docker network**:
   ```bash
   docker network rm project-name_backend
   ```

3. **Delete project data directory**:
   ```bash
   rm -rf /opt/project-name
   ```

4. **Remove Nginx config if domain proxied**:
   ```bash
   rm -f /opt/1panel/apps/openresty/openresty/conf/default/domain.conf
   docker exec 1Panel-openresty-qMxV nginx -s reload
   ```

5. **Confirm release**:
   ```bash
   free -h
   ```

### B. Scale Down Resources (moderate gain)

- Reduce worker count: adjust `NUM_WORKERS_PER_QUEUE` env var in docker-compose
- Lower container memory limits: add `mem_limit` to docker-compose service definition
- Reduce Postgres `shared_buffers` if oversized

### C. Migrate to Second VPS (reorganize)

- Use `docker-container-migration` skill to move services to another VPS
- Common candidates: Halo blog, Umami analytics, development/staging apps

### D. Add Swap (insurance against OOM)## Pitfalls

1. **No swap = OOM kill at limit** — VPSes often have swap disabled. If memory hits 100%, the kernel kills the largest process. Keep 15-20% headroom.
2. **Docker stats vs ps aux discrepancy** — Docker's MemUsage includes the container's cgroup memory (cache + shared pages). Always trust `free -h` available memory for the host's true picture.
3. **Removing a service ≠ removing its config** — Always clean up Nginx configs and DNS records, otherwise the domain will 502/404 and confuse future troubleshooting.
4. **Don't remove DBs without user approval** — PostgreSQL/MySQL containers often hold important data.
5. **Firecrawl is the #1 memory hog on any VPS** — Its 6+ containers (API + workers + RabbitMQ + Postgres + FoundationDB + Playwright) easily consume 4-5Gi. The NUQ workers are the heaviest individual processes at ~270-310Mi each.

## Reference Files

| File | Description |
|------|-------------|
| `references/firecrawl-cleanup.md` | Real-world Firecrawl teardown: 7 containers, data dir, network, Nginx config, memory reclaimed 6.7Gi→3.7Gi |
