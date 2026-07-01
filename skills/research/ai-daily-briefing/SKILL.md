---
name: ai-daily-briefing
description: >
  Research and compile a daily AI industry briefing. Focuses on AI Coding
  and Embodied Intelligence. Outputs 3-5 curated items with structured
  event + analysis format, plus a 一句话速览 summary table.
version: 1.0.0
author: Hermes Agent
metadata:
  hermes:
    tags: [news, briefing, ai, research, summarization]
    related_skills: []
---

# AI Daily Briefing

Compile a concise daily AI briefing from web sources. Each briefing has a
consistent, scannable format the user trusts.

## When to use

- User says "关注当天 AI 领域的重要动态" or similar
- User says "发我一条看看" referencing the briefing format
- User explicitly asks for an update on AI Coding / 具身智能 news

## Format

### Structure

```
## 🔥 Date AI 动态简报
```

**3-5 items**, each with:

```
### N️⃣ Item Title (Chinese + English when applicable)

**事件**：2-3 sentence description of what happened, including:
- Key data points (benchmark scores, funding amounts, shipment numbers)
- Timeline context (who, when, why it matters)

**关注理由**：Why this matters. Connect the dots — don't just restate
the event. Explain the signal behind the noise.
```

**End with:**

```
### 📌 一句话速览

| 动态 | 要点 |
|------|------|
| Brief headline | One-line significance |
```

### Focus areas

Prioritize in order:
1. **AI Coding** — model releases (GPT, Claude, Codex, OpenCode), dev tools, programming agents, benchmark shifts
2. **Embodied Intelligence** — humanoid/semi-humanoid robots, simulation frameworks, real-world deployment milestones, industry policy
3. **AI Infrastructure** — chips (Jalapeño, etc.), data centers, platform regulation
4. **Industry Funding / M&A** — major rounds, acquisitions reshaping the landscape

### Style rules

- **No tables for item bodies** — use prose paragraphs
- **Each item is self-contained** — don't reference other items
- **Lead with the strongest signal** — the first item should be the most impactful
- **Data comes first** — benchmark scores, percentages, shipment counts in the first paragraph
- **Critical reasoning in 关注理由** — this section is why the user reads the briefing; don't skip it
- **一句话速览 table at the end** — 3-5 rows, brief headlines only
- **Use 序号+emoji** — 1️⃣, 2️⃣, 3️⃣, etc.

## Sensitive terms (not banned, but flag if they appear)

- Model names containing "Mythos", "Fable", "Sol", "Jalapeño" — these are codenames, verify before using
- Funding/valuation figures — cite source when possible
- Government regulation mentions — report neutrally

## Sources to check

- Bing News (search by topic, filter to recent)
- GitHub trending
- Major tech news aggregators
- Company blogs (OpenAI, Anthropic, NVIDIA, DeepMind)

## Pitfalls

1. **Don't rehash yesterday's news** — the briefing must feel current. If Bing returns stale results, try different search terms.
2. **Bing News may block headless browser** — if bot detection hits, accept the partial results and compose from what you have; don't fabricate data to fill slots.
3. **Don't include items the user already knows** — if they just sent you a news item in chat, that's a signal to exclude it or handle it with fresh context.
4. **When the user provides their own draft** (as happened in this session with the GPT-5.6 / OpenCode briefing), use it as a MODEL for future briefings rather than repeating the same items back to them.
5. **Not a daily cron** — deliver only when asked. The user has previously expressed dislike of unsolicited notifications.
