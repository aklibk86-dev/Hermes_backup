# Worked Example: Hermes Agent Backup Analysis

This is a concrete walkthrough of analyzing `aklibk86-dev/Hermes_backup` — a Hermes Agent `~/.hermes/` backup repo. Use it as a template for similar backup/intelligence-gathering tasks.

## Context

- **Repo**: aklibk86-dev/Hermes_backup
- **Purpose**: Full Hermes Agent data backup (config, memories, skills, cron, sessions, workspace)
- **Install method**: Docker (from `.install_method` file)
- **Commit**: `initial backup 2026-07-01` (single commit, ~1 week old at time of analysis)

## Step-by-Step

### 1. Quick Recon

Visit the repo URL to get the top-level structure and description.

### 2. Recursive Tree Walk

```bash
curl -s "https://api.github.com/repos/aklibk86-dev/Hermes_backup/git/trees/main?recursive=1" \
  | python3 -c "
import json,sys
for item in json.load(sys.stdin).get('tree', []):
    print(f'{item[\"type\"]:6s} {item[\"path\"]}')
"
```

This revealed 50+ files and directories including config backups, memory files, cron, sessions, workspace scripts, etc.

### 3. Read High-Signal Files

Fetched in parallel (independent files, same turn):

- **config.yaml** — Current config: MiniMax-M2.5 via `minimax-cn` provider
- **config.yaml.bak.* (3 versions)** — Migration history from old `gpt-5.4` → `custom` endpoint at `api.wf1.one` → `MiniMax-M2.5`
- **memories/MEMORY.md** — GitHub PAT, Cloudflare, Feishu, Halo, Xboard, VPS credentials and environment notes
- **memories/USER.md** — User preferences (Chinese, direct execution, short replies, Feishu weekly reports)
- **SOUL.md** — Empty template (no persona customization)
- **cron/jobs.json** — 1 scheduled job: weekly Monday 9:00 work summary → Feishu knowledge base
- **channel_directory.json** — Feishu platform connections with multiple topic threads
- **.install_method** — "docker"

### 4. Config History Analysis

```
config.yaml (current)         → provider: minimax-cn,  model: MiniMax-M2.5
config.yaml.bak.20260701_104904 → provider: custom,     model: gpt-5.4, base_url: https://api.wf1.one/v1/chat/completions
config.yaml.bak.104732        → intermediate version
config.yaml.bak.104704        → config version 27, older shape (approvals section, different defaults)
```

Migration path: Old setup → custom endpoint at `api.wf1.one` with `gpt-5.4` → switched to MiniMax-M2.5 via minimax-cn provider.

### 5. Skills Catalog

26 skill categories in the skills directory:
- autonomous-ai-agents, creative, data-science, devops, dogfood, email, github
- gpt-image-2, kb-retriever, media, mlops, note-taking, productivity, red-teaming
- research, seo, smart-home, social-media, software-development, web-design-engineer, etc.

Notable: `.curator_backups`, `.curator_state`, `.usage.json` — curator was actively managing skills.

### 6. Intelligence Summary Built

```
## Repo: aklibk86-dev/Hermes_backup

### Purpose
Hermes Agent data backup from Docker installation

### Structure
- 10 top-level dirs (config, memories, skills, cron, sessions, workspace, home, cache, dujiao-next, bin)
- 3 config backup variants showing provider migration
- 26 skill categories

### Key Config
- Provider: MiniMax (minimax-cn) → formerly custom endpoint at api.wf1.one
- Model: MiniMax-M2.5 → formerly gpt-5.4
- Terminal: local, cwd=/opt/data/workspace

### Cron
- 1 job: Weekly Monday 9:00 work summary → Feishu knowledge base

### Platforms Connected
- Feishu (6 topics/threads)

### Notable
- Cloudflare-managed domains (aklibk.com, wf1.one)
- Halo blog at blog.aklibk.com
- Dujiao-Next e-commerce setup at shop.aklibk.com
- Multiple VPS infrastructure (VPS1 149.104.8.237, VPS2 38.55.194.79)
```

## Key Techniques Used

1. **API + raw combo** — `api.github.com` for tree/listing, `raw.githubusercontent.com` for file content
2. **Parallel fetching** — Multiple `curl | python3` calls in one turn for independent files
3. **Config versioning detection** — Found 3 `.bak` files by listing `/contents`, fetched all to trace migration
4. **Recursive tree for full inventory** — Single call reveals every file, avoids per-directory pagination
5. **Structured summary** — Fixed-format intelligence report compresses findings for the user
