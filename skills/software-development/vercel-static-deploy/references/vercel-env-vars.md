# Vercel Environment Variable Reference

Full env var reference for Stellar Theme / similar Vite+Vue projects using a runtime config generator.

## Quick Reference Table

| Variable | Default | Description |
|----------|---------|-------------|
| `STELLAR_TITLE` | `Stellar` | 站点标题（浏览器标签/侧边栏名称） |
| `STELLAR_DESC` | `Stellar Panel` | 站点简介/页面描述 |
| `STELLAR_THEME_COLOR` | `default` | 主题主色 |
| `STELLAR_BG_URL` | `(empty)` | 背景图片 URL |
| `STELLAR_LOGO_URL` | `(empty)` | Logo URL |
| `STELLAR_LANDING_MODE` | `dark` | 落地页默认主题：dark=深色 light=浅色 |
| `STELLAR_LANDING_ENABLED` | `true` | 落地页开关：true=开启 false=关闭 |
| `STELLAR_TG_GROUP` | `(empty)` | Telegram 群组完整 URL |
| `STELLAR_API_ERR_CONTACT` | `(empty)` | API 检测失败时展示的联系信息 |
| `STELLAR_DL_WINDOWS` | `(empty)` | Windows 客户端下载 URL |
| `STELLAR_DL_MACOS` | `(empty)` | macOS 客户端下载 URL |
| `STELLAR_DL_ANDROID` | `(empty)` | Android 客户端下载 URL |
| `STELLAR_DL_IOS` | `(empty)` | iOS 客户端下载 URL |
| `STELLAR_DL_LINUX` | `(empty)` | Linux 客户端下载 URL |
| `STELLAR_DL_ROUTER` | `(empty)` | 路由器客户端下载 URL |
| `STELLAR_API_MODE` | `static` | API 模式：static=固定地址 auto=自动拼接 |
| `STELLAR_API_URLS` | `(empty)` | 后端地址列表（逗号分隔多个地址） |
| `STELLAR_CHECK_ENABLED` | `false` | 多地址健康检测开关：true=开启 |
| `STELLAR_AUTO_HOST` | `(empty)` | auto 模式：API 主机名（留空=当前主机） |
| `STELLAR_AUTO_PATH` | `(empty)` | auto 模式：API 路径前缀（如 /api） |
| `STELLAR_AUTO_SAME_PROTOCOL` | `true` | auto 模式：true=同协议 false=固定 https |
| `STELLAR_PROXY_URL` | `(empty)` | 代理服务器地址 |
| `STELLAR_PROXY_ENABLED` | `false` | 正向代理开关：true=开启 |
| `STELLAR_PROXY_PATH` | `/api-proxy` | 代理路径前缀 |
| `STELLAR_PROXY_MODE` | `base64Path` | 代理寻址方式 |

## Categorization

### Branding (user must fill)
- `STELLAR_TITLE`, `STELLAR_DESC`, `STELLAR_LOGO_URL`, `STELLAR_BG_URL`

### Landing Page
- `STELLAR_LANDING_ENABLED`, `STELLAR_LANDING_MODE`

### Social / Contact
- `STELLAR_TG_GROUP`, `STELLAR_API_ERR_CONTACT`

### Client Downloads
- `STELLAR_DL_WINDOWS`, `STELLAR_DL_MACOS`, `STELLAR_DL_ANDROID`, `STELLAR_DL_IOS`, `STELLAR_DL_LINUX`, `STELLAR_DL_ROUTER`

### API Connection
- `STELLAR_API_MODE`, `STELLAR_API_URLS`, `STELLAR_CHECK_ENABLED`

### Auto Mode (only used when STELLAR_API_MODE=auto)
- `STELLAR_AUTO_HOST`, `STELLAR_AUTO_PATH`, `STELLAR_AUTO_SAME_PROTOCOL`

### Proxy (only used when behind forward proxy)
- `STELLAR_PROXY_ENABLED`, `STELLAR_PROXY_URL`, `STELLAR_PROXY_PATH`, `STELLAR_PROXY_MODE`

## Setting Comments via API

The Vercel CLI cannot set the "Note (Optional)" field. Use the REST API PATCH endpoint
with field name `comment`:

```bash
VERCEL_TOKEN="xxx"
TEAM_ID="team_xxx"
PROJECT_ID="prj_xxx"

# Get env var IDs
curl -s "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"

# Set comment
curl -s -X PATCH "https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${ENV_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"comment":"站点标题（浏览器标签/侧边栏名称）"}'
```
