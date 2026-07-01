---
name: domain-checking
description: "Bulk-check domain availability for .com (and optionally other TLDs) using raw TCP whois to whois.verisign-grs.com:43. Generate candidate patterns (AABB, ABAB, NNCC, word-based, etc.) and batch-verify them with parallel sockets."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, domains, whois, networking]
    related_skills: [cloudflare]
---

# Domain Availability Checking

## Overview

Check whether domain names are available for registration by querying whois servers directly via raw TCP sockets. This works where the `whois` CLI isn't installed (no root access) and avoids dependency on third-party API services.

## When to Use

- User asks "查一下 X 域名能不能注册" or "看看还有哪些 4 位 .com 可用"
- User wants to find available domains matching a pattern (AABB, ABAB, numeric, keyword-based)
- User wants to bulk-check a list of candidate domains

## Core Technique: Raw Socket Whois

The authoritative whois server for `.com` (and `.net`) is `whois.verisign-grs.com` port 43. Send the domain followed by CRLF, read the response. If the response contains `"No match for"`, the domain is available.

```python
import socket

def is_domain_available(domain):
    """Check .com/.net domain via raw whois socket. Returns True if available."""
    server = "whois.verisign-grs.com"
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(8)
    try:
        sock.connect((server, 43))
        sock.send(f"{domain}\r\n".encode())
        response = b""
        while True:
            data = sock.recv(4096)
            if not data:
                break
            response += data
        sock.close()
        return "No match for" in response.decode("utf-8", errors="replace")
    except Exception:
        return None  # Transient error, caller can retry
```

## Common Domain Patterns to Generate

### AABB (`aabb`, `bbcc`, `ccdd`) — 676 candidates

```python
import string
letters = string.ascii_lowercase
domains = [f"{a}{a}{b}{b}.com" for a in letters for b in letters]
```

### ABAB (`abab`, `bcbc`, `cdcd`) — 676 candidates

```python
domains = [f"{a}{b}{a}{b}.com" for a in letters for b in letters]
```

**Results**: Typically 0/676 available for .com. For .net, expect ~10–20 available.

### AAAB (`aaab`, `bbbc`, `cccd`) — 676 candidates

```python
domains = [f"{a}{a}{a}{b}.com" for a in letters for b in letters if a != b]
```

**Results**: Typically 0/676 for .com. For .net, expect ~80–120 available.

### ABBB (`abbb`, `accc`, `bddd`) — 676 candidates

```python
domains = [f"{a}{b}{b}{b}.com" for a in letters for b in letters if a != b]
```

**Results**: Typically 0/676 for .com. For .net, expect ~60–90 available.

### NNCC (`11aa`, `22bb`, `a1b2`) — letter+number mixed

```python
import itertools
for combo in itertools.product(letters, "0123456789", letters, "0123456789"):
    domains.append(f"{combo[0]}{combo[1]}{combo[2]}{combo[3]}.com")
```

### Brand-Prefixed Patterns

When the user has a brand prefix (e.g. "wf") and wants short domains, generate variations:

**Prefix + 2 digits**: `wf00` through `wf99` (100 candidates)
```python
domains = [f"wf{d1}{d2}.net" for d1 in range(10) for d2 in range(10)]
```

**Prefix + 2 letters**: `wfaa` through `wfzz` (676 candidates)
```python
domains = [f"wf{a}{b}.net" for a in letters for b in letters]
```

**Prefix + 1 digit**: `wf0` through `wf9` (10 candidates — ultra short)
```python
domains = [f"wf{d}.net" for d in range(10)]
```

**Prefix + letter + digit**: `wf1a`, `wf2b`, etc.
```python
domains = [f"wf{d}{a}.net" for d in range(10) for a in letters]
```

**Braided**: `w1f2`, `w5f7` — number between prefix letters
```python
domains = [f"w{d1}f{d2}.net" for d1 in range(10) for d2 in range(10)]
```

### AABBC (5-letter) — expands the space

```python
domains = [f"{a}{a}{b}{b}{c}.com" for a in letters for b in letters for c in letters]
```

## Batch Checking (Parallel)

Use `concurrent.futures.ThreadPoolExecutor` with 16–32 workers for speed. Each socket is lightweight.

```python
import concurrent.futures

available = []
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
    futures = {executor.submit(is_domain_available, d): d for d in all_domains}
    for future in concurrent.futures.as_completed(futures):
        domain = futures[future]
        result = future.result()
        if result is True:
            available.append(domain)
```

Expect ~50–100 domains/second for 16 threads (676 domains in ~8s, 45,000 in ~10min).

## Domain Pattern Meaning Reference

| Pattern | Example | Meaning |
|---------|---------|---------|
| AABB | `aabb.com` | First two letters same, last two same |
| ABAB | `abab.com` | Alternating pairs |
| ABBA | `abba.com` | Palindrome pair pattern |
| ABCA | `abca.com` | First and last same |
| ABCC | `abcc.com` | Last two same |
| AABC | `aabc.com` | First two same |
| NNCC | `11aa.com` | Two numbers then two letters |

## Meaningful Name Suggestions (Business/Use-Case Driven)

Beyond pattern matching, suggest domain names based on **what the user's service does**. This is more effective for finding a usable domain that the user actually wants.

### Approach

1. **Understand the business**: Ask or infer the use case (e.g. "API中转站" = API relay station, "博客" = blog, "网盘" = cloud storage)
2. **Brainstorm keyword categories**:
   - Core English words: relay, proxy, hub, node, flow, gate, bridge, link, pipe, tunnel, route
   - Chinese-translated concepts: 云 (cloud), 流 (flow), 风 (wind), 速 (speed), 连 (link), 通 (through)
   - User's brand/name elements: wf (wufeng), initials, existing domain patterns
3. **Combine keywords** into 5-8 character candidates: `relayx`, `apixy`, `wfapi`, `yunfy`, `liufy`
4. **Check each candidate** with the raw socket whois technique
5. **Present results grouped by relevance** — best matches first, with meaning annotations

### Example from Real Session

For an API中转站 (API relay station):
```
relayx.net  ✅ — "Relay X" (最切题: 中转)
apixy.net   ✅ — "API XY" (简洁 API 感)
wfapi.net   ✅ — "WF API" (品牌 + API)
proxyu.net  ✅ — "Proxy U" (代理)
wfflow.net  ✅ — "WF Flow" (流/流转)
```

### Keyword Pool (API/tech oriented)

| Category | Keywords |
|----------|----------|
| **Core tech** | api, relay, proxy, node, hub, gate, link |
| **Flow** | flow, flux, stream, pipe, route |
| **Cloud/nature** | cloud, yun(云), feng(风), liu(流) |
| **Speed/performance** | speed, swift, rapid, zesty |
| **Prefix/suffix** | x, y, ly, ry, xy, ix, on, io, ai |

### Combining with User Brand

When the user has a brand prefix (e.g. "wf"), try:
- `{brand}{keyword}` — wfapi, wfrelay, wfnode
- `{keyword}{brand}` — apiwf, relaywf
- `{brand}{chinese-pinyin}` — wfyun, wffeng, wfliu

## User Style Preferences

### Pattern queries
When the user specifies a desired format (e.g. "最好是AABB的"), **just execute immediately** — generate the candidate list and run the check. Do not ask follow-up questions about preferences or propose alternatives until the initial result is delivered. If all candidates are taken, then present alternatives in a single concise follow-up. 

### TLD switching
When the user switches TLDs mid-conversation (e.g. from .com to .net to .cc), treat each as a fresh batch check. Don't comment on the switch — just run the check for the new TLD with the same pattern scope.

### Ambiguous or abbreviated TLD references
When the user says "nat" or other unclear TLD abbreviations, **ask a simple clarifying question** ("你是说 .net 吗？") instead of guessing and checking the wrong TLD. A 20-second clarification saves 200 domains worth of wrong checks.

### TLD use-case context
When the user asks what a TLD is for (e.g. "net后缀一般都是干什么的"), provide a **brief, practical answer** covering traditional use, modern reality, and relevance to their specific business (API relay, tech services, etc.). Keep it short — 3-4 bullet points max — then immediately return to the task at hand.
- Pure 4-letter patterns (AABB, ABAB, AAAB, ABBB)
- Meaningful word-based names (relayx, apixy, etc.)
- If .com pure-letter is exhausted, suggest .net (same patterns have much higher availability)

When a user explicitly says "可以不用固定XX这两个字母" (no need to stick to XX prefix), broaden your search space — don't limit to their brand prefix anymore.

## Pitfalls

1. **Most 4-letter .com domains are taken** — All 676 AABB, all 676 ABAB, AAAB, ABBB, etc., are typically registered. This is expected, not an error. **.net has much better availability** for the same patterns (typically 10–120 available per pattern). When the user asks about .net specifically, it can be helpful to briefly explain .net's traditional role (network infrastructure) and modern usage (.com alternative/backup) if they ask "net后缀是干什么的".
2. **Socket timeout** — whois.verisign-grs.com can be slow. Use 8s timeout; retry errors once.
3. **Rate limiting** — 16 threads is safe for 676 domains. For larger batches (10k+), reduce to 8 threads and add 0.1s delay between batches of 100.
4. **TLD-specific servers** — Only `.com`/`.net` use `whois.verisign-grs.com` (both Verisign-operated). Other TLDs (`.org`, `.io`, `.cc`) have different whois servers and may behave differently. Always verify the correct whois server first.
5. **Cloudflare Registrar** does NOT expose a public domain availability API — don't waste time probing Cloudflare for this.
6. **Brand-prefixed domains have high availability** — When checking `prefix + XX` patterns (e.g. wfXX.net), availability is often very high (~80–95%) because these are not standard 4-letter word patterns.

## Relationship to bulk-domain-availability

⚠️ This skill overlaps significantly with `research/bulk-domain-availability`. Both cover the same raw-socket WHOIS technique, same domain patterns (AABB, ABAB, AAAB, ABBB), same batch-checking approach, and same pitfalls. The `domain-checking` skill (devops) is the more comprehensive and actively-maintained version. Consolidation via the background curator is recommended.

## Verification Checklist

- [ ] Raw socket to whois.verisign-grs.com:43 works (no firewall block)
- [ ] "No match for" detection string is correct for .com
- [ ] Batch size fits within session timeout limits
- [ ] Results sorted alphabetically before presenting to user
