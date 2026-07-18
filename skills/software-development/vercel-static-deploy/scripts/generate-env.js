// Stellar 主题 - 运行时配置生成器
// 在 Vercel 构建时运行，将环境变量注入到 public/env.js
//
// Vercel 环境变量对照表（在项目 Settings / Environment Variables 中配置）：
//
//  环境变量名              默认值          说明
//  ──────────────────────  ─────────────  ──────────────────────────────────
//  STELLAR_TITLE            Stellar        站点标题（浏览器标签/侧边栏名称）
//  STELLAR_DESC             Stellar Panel  站点简介/页面描述
//  STELLAR_THEME_COLOR      default        主题主色
//  STELLAR_BG_URL           (空)           背景图片 URL
//  STELLAR_LOGO_URL         (空)           Logo URL
//  STELLAR_LANDING_MODE     dark           落地页默认主题：dark=深色 light=浅色
//  STELLAR_LANDING_ENABLED  true           落地页开关：true=开启 false=关闭
//  STELLAR_TG_GROUP         (空)           Telegram 群组完整 URL
//  STELLAR_API_ERR_CONTACT  (空)           API 检测失败时展示的联系信息
//  STELLAR_DL_WINDOWS       (空)           Windows 客户端下载 URL
//  STELLAR_DL_MACOS         (空)           macOS 客户端下载 URL
//  STELLAR_DL_ANDROID       (空)           Android 客户端下载 URL
//  STELLAR_DL_IOS           (空)           iOS 客户端下载 URL
//  STELLAR_DL_LINUX         (空)           Linux 客户端下载 URL
//  STELLAR_DL_ROUTER        (空)           路由器客户端下载 URL
//  STELLAR_API_MODE         static         API 模式：static=固定地址 auto=自动拼接
//  STELLAR_API_URLS         (空)           后端地址列表（逗号分隔多个地址）
//  STELLAR_CHECK_ENABLED    false          多地址健康检测开关：true=开启
//  STELLAR_AUTO_HOST        (空)           auto 模式：API 主机名
//  STELLAR_AUTO_PATH        (空)           auto 模式：API 路径前缀
//  STELLAR_AUTO_SAME_PROTOCOL  true        auto 模式：true=同协议 false=固定 https
//  STELLAR_PROXY_ENABLED    false          正向代理开关
//  STELLAR_PROXY_URL        (空)           代理服务器地址
//  STELLAR_PROXY_PATH       /api-proxy     代理路径前缀
//  STELLAR_PROXY_MODE       base64Path     代理寻址方式

import { writeFileSync } from 'fs'

const env = process.env

const output = `// ============================================================
// Stellar 主题 - 运行时配置
// 由 Vercel 环境变量自动生成，修改后重新部署即可生效
// 配置入口：Vercel Dashboard / Project / Settings / Environment Variables
// ============================================================

window.routerBase = '/'

window.settings = {
  // 浏览器标题、侧边栏和页面品牌名称
  title: ${JSON.stringify(env.STELLAR_TITLE || 'Stellar')},

  // 站点简介，可用于页面描述或品牌说明
  description: ${JSON.stringify(env.STELLAR_DESC || 'Stellar Panel')},

  // 公共静态资源目录（一般保持 '/assets'）
  assets_path: '/assets',

  theme: {
    // 主题主色配置：'default' 表示使用项目默认配色
    color: ${JSON.stringify(env.STELLAR_THEME_COLOR || 'default')},
  },

  // 前端展示的主题版本号
  version: '1.0.0',

  // 登录页或全局背景图片 URL；留空使用默认背景
  background_url: ${JSON.stringify(env.STELLAR_BG_URL || '')},

  // 品牌 Logo URL；留空使用项目默认图标或文字标识
  logo: ${JSON.stringify(env.STELLAR_LOGO_URL || '')},

  // 落地页默认主题：'dark'（深色）或 'light'（浅色）
  landing_theme_mode: ${JSON.stringify(env.STELLAR_LANDING_MODE || 'dark')},

  // 落地页开关：true 时访问首页显示落地页，false 时首页直接跳转到登录页/仪表盘
  landing_page_enabled: ${(env.STELLAR_LANDING_ENABLED !== 'false')},

  // Telegram 群组完整 URL；留空时尝试读取后端配置，仍为空则隐藏入口
  telegram_group: ${JSON.stringify(env.STELLAR_TG_GROUP || '')},

  // API 检测全部失败时展示的联系信息，可填写客服 URL 或提示文字；留空使用默认文案
  api_error_contact: ${JSON.stringify(env.STELLAR_API_ERR_CONTACT || '')},

  // 各平台客户端的官方下载 URL；对应项留空时不展示该平台的下载入口
  client_downloads: {
    windows: ${JSON.stringify(env.STELLAR_DL_WINDOWS || '')},
    macos: ${JSON.stringify(env.STELLAR_DL_MACOS || '')},
    android: ${JSON.stringify(env.STELLAR_DL_ANDROID || '')},
    ios: ${JSON.stringify(env.STELLAR_DL_IOS || '')},
    linux: ${JSON.stringify(env.STELLAR_DL_LINUX || '')},
    router: ${JSON.stringify(env.STELLAR_DL_ROUTER || '')},
  },

  api: {
    // API 地址生成模式：'static' 或 'auto'
    url_mode: ${JSON.stringify(env.STELLAR_API_MODE || 'static')},

    // static 模式的 XBoard 后端根地址列表（逗号分隔）
    static_base_urls: ${JSON.stringify((env.STELLAR_API_URLS || '').split(',').filter(Boolean))},

    // auto 模式的地址生成规则
    auto: {
      use_same_protocol: ${(env.STELLAR_AUTO_SAME_PROTOCOL !== 'false')},
      host: ${JSON.stringify(env.STELLAR_AUTO_HOST || '')},
      append_path: ${JSON.stringify(env.STELLAR_AUTO_PATH || '')},
    },

    // 是否在多个 static 地址之间执行可用性检测
    check_enabled: ${(env.STELLAR_CHECK_ENABLED === 'true')},

    check_path: '/api/v1/guest/comm/config',

    // 正向代理配置
    proxy_enabled: ${(env.STELLAR_PROXY_ENABLED === 'true')},
    proxy_url: ${JSON.stringify(env.STELLAR_PROXY_URL || '')},
    proxy_path: ${JSON.stringify(env.STELLAR_PROXY_PATH || '/api-proxy')},
    proxy_mode: ${JSON.stringify(env.STELLAR_PROXY_MODE || 'base64Path')},
  },
}
`

writeFileSync('public/env.js', output, 'utf-8')
console.log('OK env.js generated from Vercel env vars')
