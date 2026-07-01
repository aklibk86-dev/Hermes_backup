# Docker Container Memory Management on a Remote VPS

## Overview

When SSH'd into a VPS (via paramiko or other method), this reference covers the full workflow: diagnose which containers are hogging memory, identify root causes at the kernel level, and apply hard limits to prevent recurrence.

## Step 1: Quick Memory Snapshot

```bash
free -h
# Look at "available" column — this is the real free memory
# If < 10% of total, you're under pressure
```

Key `free -h` columns:
- **used**: includes file cache (reclaimable), NOT just application memory
- **available**: what's truly free + can be reclaimed from cache — **this is the real free memory**
- **Swap**: if 0/no swap configured and available is low, OOM risk is real

## Step 2: Identify Container-Level Hog

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}'
```

Look for:
- Containers using >50% of total host memory
- Containers with many PIDs (indicates thread/process leaks)
- `MemPerc` close to 100% — already hitting host limits

## Step 3: Deep Dive into Kernel Memory (if step 2 doesn't explain the gap)

Sometimes `docker stats` shows low usage but `free -h` shows high used. Check `/proc/meminfo`:

```bash
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Active\(anon\)|Inactive\(anon\)|AnonHugePages|Cached|Slab|Shmem|PageTables|KernelStack'
```

Key fields to watch:

| Field | What it means | Typical |
|-------|---------------|---------|
| `MemTotal` | Total RAM | 7.8Gi on 8Gi host |
| `MemAvailable` | **Real free memory** | Should be 15-30%+ |
| `Active(anon)` | Actively used process memory | Matches docker stats RSS |
| `Inactive(anon)` | Process memory not recently touched | Can be huge (memory waste) |
| `AnonHugePages` | Transparent HugePages (2MB pages) | Subset of anon memory |
| `Cached` | File cache | Automatically reclaimed |
| `Slab` | Kernel object cache | SReclaimable = can be freed |
| `Shmem` | Shared memory (tmpfs etc.) | Can be significant |

### Root cause: Inactive anonymous memory + Transparent HugePages

A large gap between "docker stats total RSS" and "used in free -h" is usually caused by:

1. **Transparent HugePages (THP)** — Kernel merges application memory into 2MB pages. Once allocated, they rarely get released. Check:
   ```bash
   cat /sys/kernel/mm/transparent_hugepage/enabled
   # [always] madvise never  — "always" means it's actively merging
   ```

2. **Inactive anonymous memory** — Memory the kernel allocated for processes but hasn't been accessed recently. Python processes are notorious for this — they allocate large arenas from the OS and never return them.

3. **Page table overhead** — THP creates page tables for 2MB pages; high THP usage means high page table memory.

## Step 4: Apply Memory Limits

### Set 1GB limit on ALL running containers:

```bash
docker update --memory=1g --memory-swap=1g $(docker ps -q)
```

- `--memory=1g` = hard RAM limit
- `--memory-swap=1g` = total memory + swap limit (set equal to memory to disable swap usage)
- If a container was using >1GB, it will be OOM-killed and restarted by `--restart unless-stopped`

### Set a specific container:

```bash
docker update --memory=1g --memory-swap=1g container_name
```

### Verify limits:

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'
# Note: MemUsage now shows "X MiB / 1GiB" instead of "X MiB / 7.8GiB"

docker inspect --format '{{.Name}}: {{.HostConfig.Memory}} bytes' $(docker ps -q)
# Should show 1073741824 (1GB) for each
```

## Step 5: Prevent Future Spikes

### Disable Transparent HugePages (prevents memory fragmentation):

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

To make permanent (survive reboot):
```bash
# Add to /etc/default/grub:
# GRUB_CMDLINE_LINUX_DEFAULT="... transparent_hugepage=never"
# Then: update-grub && reboot
```

### Set a per-container memory limit in Docker Compose:

```yaml
services:
  myapp:
    deploy:
      resources:
        limits:
          memory: 1G
```

Or for `docker run`:
```bash
docker run --memory=1g --memory-swap=1g ...
```

## Example Workflow (full session)

```python
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("host", port=22, username="root", password="pass", timeout=10)

# 1. Check current memory
stdin, stdout, stderr = ssh.exec_command("free -h")
print(stdout.read().decode())

# 2. List container memory usage
stdin, stdout, stderr = ssh.exec_command(
    "docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'"
)
print(stdout.read().decode())

# 3. Check THP state
stdin, stdout, stderr = ssh.exec_command("cat /sys/kernel/mm/transparent_hugepage/enabled")
print("THP:", stdout.read().decode().strip())

# 4. Apply 1GB limit to all containers
stdin, stdout, stderr = ssh.exec_command("docker update --memory=1g --memory-swap=1g $(docker ps -q)")
print(stdout.read().decode())

# 5. Disable THP
stdin, stdout, stderr = ssh.exec_command("echo never > /sys/kernel/mm/transparent_hugepage/enabled")
print("THP disabled")

# 6. Verify
stdin, stdout, stderr = ssh.exec_command("free -h")
print("After:", stdout.read().decode())

ssh.close()
```

## See Also

- [Disk Cleanup](disk-cleanup.md) — After setting memory limits, clean up unused Docker images and system caches to free disk space

## Caveats

- **Setting limits on all containers may OOM-kill heavy ones** (maxkb, halo, etc.) — they restart automatically if `--restart unless-stopped` is set
- **Databases (PostgreSQL, MariaDB)** can be slow to restart after OOM — they need recovery time
- **1GB may be too little for some containers** (e.g., heavy AI apps, large databases). Monitor after applying and increase if needed
- **THP disable doesn't immediately free existing huge pages** — it only prevents new ones. The existing pages free naturally as processes release them
- **No swap means OOM = immediate kill**, not gradual slowdown. Ensure important containers are restartable
