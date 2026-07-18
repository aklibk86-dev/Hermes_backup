# Stellar Theme + Xboard — aklibk86-dev 部署参考

## 部署环境

### Vercel 项目清单 (updated 2026-07-17)

| 项目名 | 用途 | 最新 URL |
|--------|------|----------|
| `stellar-vercel` | Stellar 前端 (Vercel build + env vars) | https://stellar-demo.aklibk.com |
| `stellar-docs` | Stellar 文档站点 | https://stellar.aklibk.wiki |
| `config-gen` | Stellar 配置生成器 (HTML tool) | https://config.aklibk.wiki |
| `pocket-bio` | 个人主页 (已有项目) | https://www.aklibk.com |

### 域名映射

| 域名 | 指向 | 用途 |
|------|------|------|
| stellar-demo.aklibk.com | Vercel → stellar-vercel 项目 | Stellar 前端 |
| stellar.aklibk.wiki | Vercel → stellar-docs 项目 | Stellar 文档 |
| config.aklibk.wiki | Vercel → config-gen 项目 | 配置生成器 |
| plan.aklibk.wiki | VPS1 nginx → plan-wiki 容器 (8081) | 修复计划 Docsify |
| uptime.aklibk.com | VPS1 127.0.0.1:3003 (Uptime-Kuma) | 监控 |
| umami.aklibk.com | VPS1 127.0.0.1:3002 (Umami) | 分析 |
| XBoard.Wf1.one | VPS1 127.0.0.1:7001 via 1Panel Nginx | Xboard 后端 |
| xbtest.aklibk.com | VPS1 127.0.0.1:7001 via 1Panel Nginx | Xboard 备用 |
| xbdemo.aklibk.com | VPS1 127.0.0.1:7001 via 1Panel Nginx | Xboard 备用 |
| xbdev.aklibk.com | VPS1 127.0.0.1:7001 via 1Panel Nginx | Xboard 备用 |

### Cloudflare 域名

| 域名 | Zone ID |
|------|---------|
| aklibk.com | db8c625f55e3608e51b3b5481337a1b7 |
| aklibk.wiki | d4e5c3a926cb0619ea9307330414d719 |
| wf1.one | 8ac66d14af8d5df62a46744f227f741f |

Credentials: Email=13180105117@163.com, Global API Key=76ab385916b3d0110d3dce4503eaf22fdcdd4

### VPS1

- 机器: #89311 MyServer847, 香港, Debian 12
- IP: 149.104.8.237:17422
- 账号: root / kkeuBUGK8191
- 规格: 4C/8G/50G, 40Mbps
- Docker 容器: xboard-xboard-1 (7001), 1Panel-openresty, 1Panel-hermes-agent, plan-wiki (8081), uptime-kuma (3003), umami-db, umami-app (3002)
- 1Panel: http://149.104.8.237:25763/5e664be799 | 859fdf178b / WFwufeng@2025
- 1Panel OpenResty conf.d: /opt/1panel/www/conf.d/

## env.js 标准配置 (prebuilt dist 方式)

位置: `dist/env.js`

```js
title: 'Stellar',
description: 'Stellar Panel',
landing_page_enabled: true,
url_mode: 'static',
static_base_urls: ['https://XBoard.Wf1.one', 'https://xbtest.aklibk.com', 'https://xbdemo.aklibk.com', 'https://xbdev.aklibk.com'],
check_enabled: true,
```

## Vercel Env Var 方式 (stellar-vercel 项目)

Script: `scripts/generate-env.js` reads Vercel env vars → generates `public/env.js` at build time.

**Build command in vercel.json:** `"node scripts/generate-env.js && npm run build"`

**All 25 Vercel env vars with Chinese notes:**

| Vercel Env Var | 备注 (Note) |
|----------------|-------------|
| STELLAR_TITLE | 站点标题（浏览器标签/侧边栏名称） |
| STELLAR_DESC | 站点简介/页面描述 |
| STELLAR_THEME_COLOR | 主题主色，default=默认 |
| STELLAR_BG_URL | 背景图片 URL（留空使用默认） |
| STELLAR_LOGO_URL | Logo URL（留空使用默认图标） |
| STELLAR_LANDING_MODE | 落地页默认主题：dark=深色 light=浅色 |
| STELLAR_LANDING_ENABLED | 落地页开关：true=开启 false=关闭 |
| STELLAR_TG_GROUP | Telegram 群组完整 URL |
| STELLAR_API_ERR_CONTACT | API 检测失败时展示的联系信息 |
| STELLAR_DL_WINDOWS | Windows 客户端下载 URL |
| STELLAR_DL_MACOS | macOS 客户端下载 URL |
| STELLAR_DL_ANDROID | Android 客户端下载 URL |
| STELLAR_DL_IOS | iOS 客户端下载 URL |
| STELLAR_DL_LINUX | Linux 客户端下载 URL |
| STELLAR_DL_ROUTER | 路由器客户端下载 URL |
| STELLAR_API_MODE | API 模式：static=固定地址 auto=自动拼接 |
| STELLAR_API_URLS | 后端地址列表（逗号分隔多个地址） |
| STELLAR_AUTO_SAME_PROTOCOL | auto 模式：true=同协议 false=固定 https |
| STELLAR_AUTO_HOST | auto 模式：API 主机名（留空=当前主机） |
| STELLAR_AUTO_PATH | auto 模式：API 路径前缀（如 /api） |
| STELLAR_CHECK_ENABLED | 多地址健康检测开关：true=开启 |
| STELLAR_PROXY_ENABLED | 正向代理开关：true=开启 |
| STELLAR_PROXY_URL | 代理服务器地址 |
| STELLAR_PROXY_PATH | 代理路径前缀（默认 /api-proxy） |
| STELLAR_PROXY_MODE | 代理寻址方式 |

Notes set via API: `PATCH /v10/projects/{pid}/env/{envId}` with body `{"comment":"中文说明"}`

## Stellar 配置生成器 (config-gen)

纯 HTML 工具，用于可视化生成 Stellar 主题的 `env.js`。部署在 Vercel。

```bash
vercel deploy --prod --yes --token <TOKEN>
```

URL: https://config-gen-beta.vercel.app → https://config.aklibk.wiki

## 部署命令速查

### Prebuilt dist 方式 (stellar 项目)

```bash
# Clone + config
git clone --depth 1 https://github.com/aklibk86-dev/stellar.git /tmp/stellar
sed -i "s|landing_page_enabled: true|landing_page_enabled: false|" /tmp/stellar/dist/env.js
sed -i "s|url_mode: 'auto'|url_mode: 'static'|" /tmp/stellar/dist/env.js
sed -i "s|check_enabled: false|check_enabled: true|" /tmp/stellar/dist/env.js
sed -i "s|static_base_urls: \\\\[\\\\]|static_base_urls: ['https://XBoard.Wf1.one', 'https://xbtest.aklibk.com', 'https://xbdemo.aklibk.com', 'https://xbdev.aklibk.com']|" /tmp/stellar/dist/env.js

# Deploy
cd /tmp/stellar && vercel deploy --prod --yes --token <TOKEN>
vercel alias rm xbdev.aklibk.com --yes --token <TOKEN>
vercel alias set stellar-gold.vercel.app portal.aklibk.com --token <TOKEN>
```

### Vercel build 方式 (stellar-vercel 项目)

```bash
# Clone (has scripts/generate-env.js and updated vercel.json)
git clone --depth 1 https://github.com/aklibk86-dev/stellar.git /tmp/stellar-vercel
cd /tmp/stellar-vercel

# Set env vars (run inside linked dir)
echo "WF Portal" | vercel env add STELLAR_TITLE production --token <TOKEN>
echo "https://XBoard.Wf1.one,..." | vercel env add STELLAR_API_URLS production --token <TOKEN>

# Deploy (Vercel builds from source, scripts/generate-env.js runs during build)
vercel deploy --prod --yes --token <TOKEN>
```

### Fix aliases after deploy (always needed)

```bash
vercel alias rm xbdev.aklibk.com --yes --token <TOKEN>
vercel alias set <deployment-url> <target-domain> --token <TOKEN>
```
