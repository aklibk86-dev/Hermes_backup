# Linux Memory Debugging

A domain-specific extension of the Systematic Debugging 4-phase process, focused on "high memory usage" or "OOM" investigations on Linux.

## Phase 1: Root Cause Investigation

### 1a. Snapshot Surface State

```bash
free -h
```

**Read the output:**
- `total` = physical RAM
- `used` = total - free - buff/cache (this includes reclaimable cache, so it's misleadingly high)
- `available` = **the real free memory** — what's available for new allocations
- If `available` < 10% of total, the system is under memory pressure
- `Swap: 0B` means no swap — OOM is immediate when memory runs out

### 1b. Identify Container/Process Hogs

```bash
# Docker containers
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}'

# All processes
ps aux --sort=-%mem | head -20
```

**Signals:**
- A single container using >30% of total RAM
- Many processes each using a small amount (death by a thousand cuts)
- Unexplained gap between total RSS and free -h "used"

### 1c. Kernel-Level Deep Dive (the gap explanation)

```bash
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Active\(anon\)|Inactive\(anon\)|AnonHugePages|Cached|Slab|Shmem|PageTables|KernelStack'
```

**The gap formula:**

If `ps aux | awk '{sum+=$6} END {print sum/1024 " MB"}'` shows 750MB but `free -h` shows 6.8Gi used, the gap is in kernel-level accounting:

- **AnonHugePages** — Transparent HugePages. Kernel merges process memory into 2MB pages. These don't show up in per-process RSS. Typically 1-3 GiB on a Python-heavy system.
- **Inactive(anon)** — Anonymous pages not accessed recently. Processes (esp. Python) allocate large arenas and never release them.
- **Cached** — File cache (reclaimable, not "real" usage)
- **Slab** — Kernel object cache (partially reclaimable)

**Most likely root cause on Python-heavy Docker hosts:**
1. Python processes allocate big memory arenas (list/dict/cache)
2. THP merges them into 2MB huge pages
3. Kernel holds inactive anonymous pages even after the process frees them
4. No swap means no page-out — pages stay resident forever

### 1d. Check for Known Memory Wasters

```bash
# Transparent HugePages status
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] = actively merging, [madvise] = only on madvise, [never] = disabled

# Check if OOM killer has been active
dmesg | grep -i "out of memory\|OOM\|oom_kill" | tail -5
```

## Phase 3: Hypothesis Testing (Memory-Specific)

Common hypotheses and their quick tests:

| Hypothesis | Test | Verdict |
|------------|------|---------|
| Python process leak | Restart the process. Check if `free -h` usage drops | If drops by >20% = confirmed |
| THP is wasting memory | `echo never > /sys/kernel/mm/thp/enabled` | Check after 24h |
| Docker containers need limits | `docker update --memory=1g $(docker ps -q)` | Immediate effect from cgroup |
| Inactive anon pages not reclaimed | `echo 3 > /proc/sys/vm/drop_caches` (safe, just drops caches) | If available jumps = confirmed |

## Phase 4: Fix Implementation (Memory-Specific)

### Quick Fix (Firefighting)

1. **Restart the biggest process**
   ```bash
   kill <PID-of-biggest-process>
   ```
   If Docker: `docker restart <container>` (then the process restarts "clean")

2. **Drop caches** (safe, won't kill processes)
   ```bash
   sync && echo 3 > /proc/sys/vm/drop_caches
   ```

3. **Apply memory limits** to prevent recurrence
   ```bash
   docker update --memory=1g --memory-swap=1g $(docker ps -q)
   ```

### Medium Fix (Prevent Recurrence)

4. **Disable Transparent HugePages**
   ```bash
   echo never > /sys/kernel/mm/transparent_hugepage/enabled
   echo never > /sys/kernel/mm/transparent_hugepage/defrag
   ```
   Permanent: add `transparent_hugepage=never` to `GRUB_CMDLINE_LINUX_DEFAULT` and `update-grub`

### Long Fix (Architecture)

5. **Configure swap** (even 2Gi prevents immediate OOM)
6. **Add Docker Compose memory limits** to all services
7. **Set up monitoring alerts** (Prometheus + Alertmanager, Uptime-Kuma, etc.)

## Common Patterns

| Pattern | Symptom | Root Cause | Fix |
|---------|---------|------------|-----|
| Python memory hoarding | RSS low, used high, Inactive(anon) huge | Python's memory allocator | Restart, then limit memory |
| THP bloat | free -h drops 2-3Gi after start, no clear process | THP merges allocs | Disable THP |
| Docker unlimited | One container uses 30%+ of host RAM | No cgroup limit | `docker update --memory=1g` |
| No swap | OOM kills happen immediately | System can't page out | Add swap file |
| File cache spike | "used" high but "available" reasonable | Normal behavior | Ignore (it's reclaimable) |
