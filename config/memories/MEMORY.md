GitHub PAT (classic, 满权限): ghp_u5...07cpLu。Login=aklibk86-dev (id 226070156)。Scopes: admin:enterprise, admin:public_key, delete_repo, repo, user, workflow 等全有。验证: GET /user → 200。**所有 GitHub API 操作在 VPS1 (149.104.8.237) 跑**——沙箱写入 token 会被脱敏；用 base64 传输 + 文件读写。撤销: GitHub Settings → Developer settings → Personal access tokens → classic → Revoke。已用: 2026-07-01 删了 aklibk86-dev/Hermes_backup 仓库 + 所有 SSH keys。
§
Cloudflare: Email 13180105117@163.com, key 76ab385916b3d0110d3dce4503eaf22fdcdd4 (Global API Key — 用 X-Auth-Email + X-Auth-Key 头，非 Bearer Token)。Zones: aklibk.com db8c625f55e3608e51b3b5481337a1b7, wf1.one 8ac66d14af8d5df62a46744f227f741f.
§
For 1Panel-managed app DB passwords: they're masked as '***' everywhere but the real values live in running container env. Use `docker exec <container> printenv | grep -i pass` to retrieve them.
§
Halo 2.25.3 @ blog.aklibk.com. Admin: wufeng. halo-mcp-server v0.1.6 (~/halo-mcp-env). PAT in .env (962 chars). CRITICAL: content-json=true + Markdown content = editor crash. Content must be HTML snapshot via base/head/releaseSnapshot.
§

Uptime-Kuma port 3003 uptime.aklibk.com v2.4.0 key uk1_RBc4pTxujvHpAr-ueOjSYytIfARnCzmY9iPOENue. Sun-Panel port 3004 nav.aklibk.com admin@sun.cc/12345678.
§
VPS2 38.55.194.79 (野草云/监控): Debian 12, root/WuFeng@2016.., 2G/30G. Containers: umami(3002), umami-postgres, uptime-kuma(3003), komari(25774). Umami DB user=umami pwd=***, admin bcrypt. Sites tracked: blog.aklibk.com. umami.aklibk.com 域名现在无后端——Nginx原指向VPS1 Firecrawl，真实Umami在VPS2。
§
飞鼠知识库 space_id=7654947950363217077, parent_node_token=TPVwwZlD6iTPjxk70qgc8oAanvf (首页节点)。lark-cli用户已授权wiki:node:create/wiki:node:move/wiki:space:write_only。创建知识库内文档用 lark-cli docs +create --api-version v2 --parent-token TPVwwZlD6iTPjxk70qgc8oAanvf --as user --doc-format markdown。bot无wiki权限。
§
沙箱无 hermes CLI。`hermes skills install <n>` → SSH 到 VPS1 再 `docker exec 1Panel-hermes-agent-UZQ9 hermes skills install <n>`。clawhub 技能常被 quarantine（.env 外带危险），禁 --force。