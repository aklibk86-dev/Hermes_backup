# New-API REST API — Full Endpoint Catalog

Auth mechanisms:
- **TokenAuth**: `Authorization: Bearer <api_key>`
- **UserAuth**: Session cookie (after login)
- **AdminAuth**: Requires admin privileges
- **RootAuth**: Requires root/admin privileges

## 1. Public (No Auth)
- GET /api/status
- GET /api/uptime/status
- GET /api/notice
- GET /api/about
- GET /api/home_page_content
- GET /api/pricing
- GET /api/user-agreement
- GET /api/privacy-policy
- GET /api/rankings
- GET /api/perf-metrics/summary
- GET /api/perf-metrics

## 2. Auth
- POST /api/user/register
- POST /api/user/login
- POST /api/user/login/2fa
- POST /api/user/passkey/login/begin|finish
- GET /api/user/logout
- GET /api/oauth/:provider (Discord/LinuxDO/Telegram/OIDC)
- GET /api/verification
- GET /api/reset_password
- POST /api/user/reset

## 3. Self-Service (UserAuth)
- GET/PUT/DELETE /api/user/self
- GET /api/user/models
- GET /api/user/token
- GET/PUT /api/user/setting
- GET /api/user/2fa/status|setup|enable|disable|verify
- GET /api/user/aff
- GET/POST /api/user/topup/*
- POST /api/user/pay|amount
- POST /api/user/stripe/pay|amount
- POST /api/user/creem/pay
- POST /api/user/waffo/pay|amount
- POST /api/user/waffo-pancake/pay|amount
- GET/POST/DELETE /api/user/passkey/*

## 4. Token Management
- GET /api/token/
- GET /api/token/search
- GET /api/token/:id
- POST /api/token/
- PUT /api/token/
- DELETE /api/token/:id
- POST /api/token/batch
- POST /api/token/:id/key
- POST /api/token/batch/keys

## 5. Channel Management (AdminAuth)
- GET /api/channel/
- GET /api/channel/search
- GET /api/channel/models
- GET /api/channel/models_enabled
- GET /api/channel/ops
- GET /api/channel/:id
- POST /api/channel/
- PUT /api/channel/
- DELETE /api/channel/:id
- DELETE /api/channel/disabled
- POST /api/channel/status/batch
- POST /api/channel/:id/status
- GET /api/channel/test
- GET /api/channel/test/:id
- GET /api/channel/update_balance
- GET /api/channel/update_balance/:id
- POST /api/channel/:id/key (RootAuth)

## 6. Admin User Management
- GET /api/user/
- GET /api/user/search
- GET /api/user/:id
- POST /api/user/
- PUT /api/user/
- DELETE /api/user/:id
- DELETE /api/user/ (RootAuth)
- POST /api/user/manage

## 7. System Settings
- GET/PUT /api/option/
- GET/PUT /api/option/:key

## 8. Model Management
- GET/POST/PUT/DELETE /api/models/
- GET /api/models/search
- GET /api/models/:id
- GET/PUT /api/models/pricing

## 9. Logs
- GET/DELETE /api/log/
- GET /api/log/search
- GET /api/log/stat
- GET /api/log/self|self/search|self/stat
- GET /api/log/token

## 10. Redemption Codes
- GET/POST/PUT/DELETE /api/redemption/
- GET /api/redemption/search
- DELETE /api/redemption/invalid

## 11. Subscriptions
- GET /api/subscription/plans
- GET/PUT /api/subscription/self
- POST /api/subscription/balance/pay
- POST /api/subscription/epay/pay|stripe/pay|creem/pay|waffo-pancake/pay
- POST/GET /api/subscription/epay/notify

## 12. AI Model API (TokenAuth)
- GET /v1/models
- GET /v1/models/:model
- POST /v1/chat/completions
- POST /v1/completions
- POST /v1/responses
- POST /v1/responses/compact
- POST /v1/messages (Claude)
- POST /v1beta/models/*path (Gemini)
- GET /v1beta/models (Gemini list)
- POST /v1/images/generations|edits
- POST /v1/embeddings
- POST /v1/audio/transcriptions|translations|speech
- POST /v1/rerank
- GET /v1/realtime (WebSocket)
- POST /v1/moderations

## 13. Midjourney
- POST /mj/submit/imagine|change|action|shorten|modal|simple-change|describe|blend|edits|video
- POST /mj/submit/upload-discord-images
- POST /mj/insight-face/swap
- GET /mj/task/:id/fetch
- GET /mj/task/:id/image-seed
- POST /mj/task/list-by-condition
- GET /mj/image/:id

## 14. Suno
- POST /suno/submit/:action
- POST /suno/fetch
- GET /suno/fetch/:id

## 15. Video
- POST/GET /v1/video/generations
- POST /v1/videos/:video_id/remix
- POST/GET /v1/videos
- POST /kling/v1/videos/text2video|image2video
- GET /kling/v1/videos/*

## 16. Dashboard Billing
- GET /dashboard/billing/subscription
- GET /dashboard/billing/usage

## 17. Playground
- POST /pg/chat/completions
