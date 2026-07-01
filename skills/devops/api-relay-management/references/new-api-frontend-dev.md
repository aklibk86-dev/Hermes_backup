# New-API Frontend Development

## Frontend Architecture

New-API has two embedded frontend themes, compiled into the Go binary via `go:embed`:

| Theme | Path | Tech Stack |
|-------|------|------------|
| default (modern) | `web/default/` | React 19 + TanStack Router + TailwindCSS 4 + @base-ui + rsbuild |
| classic (legacy) | `web/classic/` | React 19 + Semi UI + rsbuild |

### Build Flow
```
web/default/src/ (React source)
  → bun install && bun run build (rsbuild)
web/default/dist/ (compiled static files)
  → go:embed into Go binary at build time
Go binary → Docker container → serves SPA on port 3000
```

## Front/Back Separation

Two options:

### Option A: FRONTEND_BASE_URL env var (cleanest)
```yaml
# docker-compose.yml
environment:
  - FRONTEND_BASE_URL=https://your-frontend.com
```
When set, New-API redirects all non-API paths to your frontend. No code changes needed.

### Option B: Nginx proxy with standalone frontend
```nginx
# API proxy
location /v1/ { proxy_pass http://127.0.0.1:3000; }
location /api/ { proxy_pass http://127.0.0.1:3000; }
# SPA
location / { root /opt/newapi-frontend; try_files $uri $uri/ /index.html; }
```

## REST API Overview (~150 endpoints)

Auth mechanisms:
- **None**: `/api/status`, `/api/notice`, `/api/about`
- **TokenAuth**: `Authorization: Bearer sk-xxx` — AI model API
- **UserAuth**: Session cookie after login
- **AdminAuth**: Admin role required
- **RootAuth**: Root role required

### Core AI API (OpenAI-compatible)
- `POST /v1/chat/completions` — Chat (supports SSE streaming)
- `POST /v1/responses` — OpenAI Responses format
- `POST /v1/messages` — Claude Messages format
- `POST /v1beta/models/*path` — Gemini format
- `POST /v1/images/generations` — Image generation
- `POST /v1/audio/speech|transcriptions|translations` — Audio
- `POST /v1/embeddings` — Embeddings
- `POST /v1/rerank` — Rerank
- `GET /v1/realtime` — WebSocket Realtime

### Auth
- `POST /api/user/login` — Returns session cookie
- `POST /api/user/register` — Registration
- `GET /api/user/self` — Get profile (UserAuth)
- `PUT /api/user/self` — Update profile (UserAuth)
- `GET|POST /api/user/topup` — Top-up (UserAuth)

### Admin
- `GET|POST|PUT|DELETE /api/user/` — User CRUD
- `GET|POST|PUT|DELETE /api/channel/` — Channel CRUD
- `GET|POST|PUT|DELETE /api/models/` — Model CRUD
- `GET|PUT /api/option/` — System settings
- `GET|DELETE /api/log/` — Logs
- `GET|POST|PUT|DELETE /api/redemption/` — Redemption codes

## Development Approaches

### 1. Full AI-Driven (Hermes orchestrates)
- Hermes scaffolds the project (Vite + React + TS)
- Hermes writes API client, routing, layout
- Hermes delegates page generation to subagents via `delegate_task`
- Hermes integrates, deploys, and handles Nginx config
- User only reviews and approves

### 2. Manual Fork + Modify
- Fork `github.com/QuantumNous/new-api`
- Modify `web/default/src/` components
- Run `cd web/default && bun run build`
- Rebuild Docker image

### 3. Standalone Frontend (no fork needed)
- Any framework (Vue/React/Svelte)
- Use New-API REST API as backend
- Deploy independently via Nginx
- Set `FRONTEND_BASE_URL` on New-API

## Recommended Tech Stack for Custom Frontend

| Layer | Recommendation | Alternatives |
|-------|---------------|-------------|
| Framework | React 19 + Vite | Vue 3 + Nuxt |
| UI | shadcn/ui | Naive UI, Ant Design |
| Routing | TanStack Router | React Router v6 |
| State | Zustand | Jotai, Context |
| API | fetch + TanStack Query | Axios + SWR |
| Styling | Tailwind CSS 4 | UnoCSS |
| Icons | lucide-react | @hugeicons/react |
| Package | Bun | pnpm |

## Phased Development Plan

| Phase | Content | Est. Time |
|-------|---------|-----------|
| 1 | Scaffold, login, layout, Nginx deployment | 1-2 days |
| 2 | User features: Token mgmt, logs, wallet, Playground | 3-4 days |
| 3 | Admin features: User/channel/model management | 4-5 days |
| 4 | System settings, redemptions, logs | 2-3 days |
| 5 | Dark mode, responsive, animations, polish | 2-3 days |
| **Total** | | **12-17 days** (manual) or **6-10 days** (AI-assisted) |

## Key Technical Details

- **SSE streaming**: Use Vercel AI SDK's `useChat()` hook for Playground — handles streaming, markdown rendering, abort, and state management
- **Error format**: `{"error": {"message": "...", "type": "...", "code": "..."}}`
- **Pagination**: `page` (1-indexed) + `pageSize` params; response includes `total`, `page`, `pageSize`
- **CORS**: Enables all origins by default; restrict in Nginx for production
- **WebSocket**: `/v1/realtime?token=sk-xxx` for Realtime API
- **Theme switching**: New-API supports runtime theme toggle between "default" and "classic" via UI; the `themeAwareFileSystem` dispatches to the correct embedded FS
