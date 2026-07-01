# API Referral Content Strategy

Writing blog tutorials to drive traffic to an API relay/token-selling business.
Applicable when the user runs a New-API/compatible relay and wants to sell tokens.

## Tool Selection Criteria

Pick tools that meet ALL of these:
1. **Needs an API key** to function (not free/open-endpoint)
2. **Popular right now** (high search volume, active community)
3. **Custom API endpoint is configurable** (supports `OPENAI_BASE_URL` or equivalent)
4. **Difficult to access directly from China** (users need a relay)

### Tier 1 (Best for 引流)
- **Cursor** — hottest AI coding editor, supports custom API URL in Settings > Models > Override OpenAI Base URL
- **LobeChat / NextChat** — open-source ChatGPT frontends, Docker/Vercel deploy, need API key + endpoint
- **Claude Code** — hottest AI coding agent CLI, needs Claude API key (hard to get in CN)

### Tier 2 (Higher per-user value)
- **Dify** — open-source agent/workflow platform, multi-model config, API call volume per user is high
- **Open WebUI** — Ollama frontend, supports OpenAI-compatible endpoints

## Article Structure Template

```
1. Hero banner — gradient background, emoji, title (catches attention)
2. Problem statement — why official is expensive/hard to access
3. Prerequisites — what user needs (API address, key)
4. Step-by-step setup — numbered steps, each in colored card
5. Screenshot placeholders — 【这里放截图X】 for user to fill later
6. Model recommendations — which models for which use case
7. Price comparison — official vs relay pricing table
8. FAQ — common concerns (safety, speed, ban risk)
9. CTA — contact info for buying tokens
```

## Screenshot Placeholder Convention

```
<div style="background: #f1f5f9; border: 2px dashed #94a3b8; ...>
  <span>🖼️</span>
  <p>【这里放截图1：描述截图内容】</p>
</div>
```

## Embedding the API Endpoint

Naturally work the API base URL into Step 1 (preparation):
- Show it as a code snippet: `https://api.wf1.one/v1`
- Include it in the "what you need" checklist
- DO NOT make the whole article feel like an ad — tutorial value first

## Publishing Flow (Halo Blog)

### Draft-first workflow (this user's preference)

1. Write full HTML article (rich formatting with gradients/cards)
2. Create draft via Console API POST `/apis/api.console.halo.run/v1alpha1/posts`
   - ALWAYS set `spec.publish: False` — the user decides when to go live
   - MUST include fields: `deleted: False`, `pinned: False`, `priority: 0` (required by schema, missing them causes 400 error)
3. Create Snapshot via Content API POST `/apis/content.halo.run/v1alpha1/snapshots`
4. Link snapshot to draft via Content API PUT `/apis/content.halo.run/v1alpha1/posts/{slug}`
   - Set `baseSnapshot` and `headSnapshot` to the snapshot UUID
   - If this returns 409 Conflict: the post was modified between GET and PUT. Fix: re-fetch the full post state, remove `status` field, then retry the PUT
5. Wait for user approval. When user says "发布":
   - GET current post state
   - Set `releaseSnapshot`, all archive labels, `published: "true"`
   - PUT via Content API
6. Verify: `GET /archives/{slug}` returns 200

### Common Publishing Pitfalls

| Error | Cause | Fix |
|:------|:------|:----|
| 400 Validation error | Missing `deleted`/`pinned`/`priority` in spec | Add all three fields |
| 409 Conflict on Content API PUT | Version mismatch between GET and PUT | Re-fetch post, remove `status`, retry |
| Page renders but article body blank | Snapshot not linked (no `baseSnapshot`/`releaseSnapshot`) | Create snapshot first, then link via PUT |
| Draft shows in console but 404 on public URL | Missing archive labels or `published` not set | Add all 3 archive-year/month/day labels |

## Delivery Pattern

- One article at a time (the user reviews/approves before next)
- Each article is a self-contained `.html` file in workspace
- Save as DRAFT only — let user decide when to publish (this user's explicit preference)
- LobeChat article is the natural follow-up to the Cursor article
