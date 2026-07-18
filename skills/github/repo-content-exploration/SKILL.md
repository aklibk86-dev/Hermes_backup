---
name: repo-content-exploration
description: "Explore and extract intelligence from GitHub repo contents programmatically — list trees, read files, compare configs, build structured summaries via the GitHub REST API and raw.githubusercontent.com, all without cloning."
version: 1.0.0
author: Agent (created from session)
platforms: [linux, macos]
metadata:
  hermes:
    tags: [GitHub, API, Exploration, Repo-Analysis, Discovery, Intelligence]
    related_skills: [github-repo-management, codebase-inspection]
---

# Repo Content Exploration

Explore a GitHub repo's structure and extract meaningful intelligence from its file tree and raw contents — without cloning. The browser gives a first glance; the GitHub REST API + `raw.githubusercontent.com` drive deep, structured exploration.

## When to Use

- User shares a GH repo URL and asks "what's in it?" or "analyze this repo"
- You need to understand a repo's file structure, config, or data without cloning
- Auditing Hermes Agent config/skill/memory backups
- Discovering service configuration, secrets footprint, or architecture from a repo
- Comparing config versions across backup files

## Prerequisites

```bash
# GitHub token (recommended — 5000 req/hr vs 60 req/hr unauthenticated)
# Set as env var or found in .hermes/.env automatically
export GITHUB_TOKEN="ghp_..."
```

## Workflow

### Phase 1: Quick Recon (browser)

Get the page title, description, top-level directory listing, and latest commit info:

```
browser_navigate(url="https://github.com/owner/repo-name")
# → page title, description, file tree, branch info
```

Then switch to the API — the browser truncates complex pages.

### Phase 2: Programmatic Tree Walk (GitHub API, 1-3 calls)

```bash
# Get the FULL recursive file tree — single API call
curl -s "https://api.github.com/repos/OWNER/REPO/git/trees/main?recursive=1" \
  | python3 -c "
import json,sys
tree = json.load(sys.stdin).get('tree', [])
for item in tree:
    print(f'{item[\"type\"]:6s} {item[\"path\"]}')
" | head -100
```

This reveals every file in the repo without pagination. Use `| wc -l` to count files.

```bash
# List a specific directory's contents if the tree is too large
curl -s "https://api.github.com/repos/OWNER/REPO/contents/path/to/dir" \
  | python3 -c "
import json,sys
for f in json.load(sys.stdin):
    print(f'{f[\"type\"]:8s}  {f[\"name\"]:30s}  {f.get(\"size\",0):>8} bytes')
"
```

### Phase 3: Raw Content Extraction

Read key files via `raw.githubusercontent.com`:

```
https://raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH/TO/FILE
```

Fetch multiple independent files in parallel to save turns.

**High-signal files in Hermes backups and config repos:**

| File | What it reveals |
|------|----------------|
| `config.yaml` + `*.bak.*` | Current config, provider model, config migration history |
| `memories/MEMORY.md` | Stored credentials, environment notes, VPS access info |
| `memories/USER.md` | User preferences, style, workflow conventions |
| `SOUL.md` | Agent persona (usually a blank template) |
| `cron/jobs.json` | Scheduled tasks, delivery targets, schedule expressions |
| `channel_directory.json` | Platform connections (Feishu, Telegram, etc.) |
| `auth.json` | OAuth tokens and credential pool structure |
| `skills/` (dir listing) | Installed skill categories |
| `workspace/` | Active project files and scripts |
| `.install_method` | How the installation was done (docker/pip/git) |
| `docker-compose*.yml` | Service architecture |

### Phase 4: Config History & Drift Analysis

Compare multiple config backups to trace migration:

```python
import json, sys
# Fetch current and all .bak versions, extract model/default/provider/base_url
# across all versions to identify the migration chain
```

**What to look for in config diffs:**
- `model.default` and `model.provider` changes — provider migration
- `model.base_url` changes — endpoint migration (self-hosted → cloud)
- `terminal.backend` changes — docker ↔ local ↔ ssh
- `agent.max_turns` changes — quality vs cost tuning
- `toolsets` changes — feature enablement history

### Phase 5: Intelligence Summary

Build a structured summary:

```
## Repo: owner/repo-name

### Purpose
<from description and file contents>

### Structure
<key directories and their roles>

### Key Config
- Provider: <value>
- Model: <value>
- Terminal backend: <value>

### Cron Jobs
<N jobs, brief descriptions>

### Notable Data
<credentials footprint, special configs, unique aspects>
```

## Known Hermes Backup Structure

A Hermes Agent `~/.hermes/` backup has this layout:

```
.config/pulse/       # Pulse runtime state
bin/                 # Executable tools (tirith, etc.)
cache/               # Screenshots, model catalog
cron/jobs.json       # Scheduled task definitions
dujiao-next/         # Dujiao shop configuration
home/                # User home files (.bashrc, .bash_history)
memories/MEMORY.md   # Cross-session durable memory
memories/USER.md     # User profile
sessions/            # Session JSON dumps
skills/              # Installed skills (category subdirectories)
workspace/           # Active project files
config.yaml          # Current configuration
SOUL.md              # Agent identity
auth.json + .lock    # Credential pools
channel_directory.json  # Platform connectivity
```

## Recipes

### Get a directory listing (compact)

```bash
curl -s "https://api.github.com/repos/OWNER/REPO/contents" \
  | python3 -c "import json,sys; data=json.load(sys.stdin); [print(f['name']) for f in data]"
```

### Get recursive file tree (compact for piped processing)

```bash
curl -s "https://api.github.com/repos/OWNER/REPO/git/trees/main?recursive=1" \
  | python3 -c "import json,sys; [print(i['path']) for i in json.load(sys.stdin).get('tree',[])]"
```

### Count files by type in the repo

```bash
curl -s "https://api.github.com/repos/OWNER/REPO/git/trees/main?recursive=1" \
  | python3 -c "
import json,sys
from collections import Counter
exts = Counter()
for item in json.load(sys.stdin).get('tree', []):
    if '.' in item['path']:
        ext = '.' + item['path'].rsplit('.', 1)[1]
        exts[ext] += 1
for ext, count in exts.most_common():
    print(f'  {ext:12s} {count:5d} files')
"
```

### Fetch and compare config versions

```bash
for f in config.yaml config.yaml.bak.*; do
  echo "=== $f ==="
  curl -s "https://raw.githubusercontent.com/OWNER/REPO/main/$f" | grep -E '^(model:|default:|provider:|base_url:)' | head -4
  echo
done
```

## Pitfalls

1. **Rate limits bite without auth** — 60 req/hr unauthenticated is tight. Set `GITHUB_TOKEN` for 5000 req/hr.
2. **Private repos return 404** — the Contents API won't show private repos without authorization. The browser shows a sign-in page, not the data. Check with curl first.
3. **Browser page truncation** — GitHub repo pages can exceed the tool's 8000-char snapshot limit. Always fall back to the API for complete data.
4. **Large repos** — the recursive tree endpoint with large repos can return many K items. Use `| head -N` to preview, then narrow with directory-specific queries.
5. **Binary files** — raw.githubusercontent.com serves bytes. For images, either use `browser_navigate` to the file or `vision_analyze` on a local copy.
6. **Branch name matters** — default branch might be `main`, `master`, or `develop`. Use `curl` + the repos API to detect it: `curl -s https://api.github.com/repos/OWNER/REPO | python3 -c "import json,sys; print(json.load(sys.stdin)['default_branch'])"`.
