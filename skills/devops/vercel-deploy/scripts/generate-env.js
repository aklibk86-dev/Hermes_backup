/**
 * Stellar 主题 - 运行时配置生成器
 * 在 Vercel 构建时运行，将环境变量注入到 public/env.js
 *
 * Vercel 环境变量对照表（在项目 Settings / Environment Variables 中配置）：
 *
 *  变量名                 默认值         说明
 *  ─────────────────────  ────────────  ──────────────────────────────────
 *  STELLAR_TITLE           Stellar       站点标题（浏览器标签/侧边栏名称）
 *  STELLAR_DESC            Stellar Panel 站点简介/页面描述
 *  STELLAR_THEME_COLOR     default       主题主色
 *  STELLAR_BG_URL          (空)          背景图片 URL
 *  STELLAR_LOGO_URL        (空)          Logo URL
 *  STELLAR_LANDING_MODE    dark          落地页默认主题：dark=深色 light=浅色
 *  STELLAR_LANDING_ENABLED true          落地页开关：true=开启 false=关闭
 *  STELLAR_TG_GROUP        (空)          Telegram 群组完整 URL
 *  STELLAR_API_ERR_CONTACT (空)          API 检测失败时展示的联系信息
 *  STELLAR_DL_WINDOWS      (空)          Windows 客户端下载 URL
 *  STELLAR_DL_MACOS        (空)          macOS 客户端下载 URL
 *  STELLAR_DL_ANDROID      (空)          Android 客户端下载 URL
 *  STELLAR_DL_IOS          (空)          iOS 客户端下载 URL
 *  STELLAR_DL_LINUX        (空)          Linux 客户端下载 URL
 *  STELLAR_DL_ROUTER       (空)          路由器客户端下载 URL
 *  STELLAR_API_MODE        static        API 模式：static=固定地址 auto=自动
 *  STELLAR_API_URLS        (空)          后端地址列表（逗号分隔多个地址）
 *  STELLAR_CHECK_ENABLED   false         多地址健康检测开关：true=开启
 *  STELLAR_PROXY_ENABLED   false         正向代理开关
 *  STELLAR_PROXY_URL       (空)          代理服务器地址
 *  STELLAR_PROXY_PATH      /api-proxy    代理路径前缀
 *  STELLAR_PROXY_MODE      base64Path    代理寻址方式
 */
import { writeFileSync } from 'fs'

const env = process.env

const output = [
  '// ============================================================',
  '// Stellar 主题 - 运行时配置',
  '// 由 Vercel 环境变量自动生成，编辑后重新部署即可生效',
  '// 配置入口：Vercel Dashboard / Project / Settings / Environment Variables',
  '// ============================================================',
  '',
  'window.routerBase = \'/\'',
  '',
  'window.settings = {',
  '  // 浏览器标题、侧边栏和页面品牌名称',
  '  title: ' + JSON.stringify(env.STELLAR_TITLE || 'Stellar') + ',',
  '',
  '  // 站点简介，可用于页面描述或品牌说明',
  '  description: ' + JSON.stringify(env.STELLAR_DESC || 'Stellar Panel') + ',',
  '',
  '  assets_path: \'/assets\',',
  '',
  '  theme: {',
  '    // 主题主色配置：\'default\' 表示使用项目默认配色',
  '    color: ' + JSON.stringify(env.STELLAR_THEME_COLOR || 'default') + ',',
  '  },',
  '',
  '  // 背景图片 URL（留空使用默认）',
  '  background_url: ' + JSON.stringify(env.STELLAR_BG_URL || '') + ',',
  '',
  '  // 品牌 Logo URL（留空使用项目默认图标）',
  '  logo: ' + JSON.stringify(env.STELLAR_LOGO_URL || '') + ',',
  '',
  '  // 落地页默认主题：\'dark\'（深色）或 \'light\'（浅色）',
  '  landing_theme_mode: ' + JSON.stringify(env.STELLAR_LANDING_MODE || 'dark') + ',',
  '',
  '  // 落地页开关：true 时访问首页显示落地页，false 时直接跳转登录页/仪表盘',
  '  landing_page_enabled: ' + (env.STELLAR_LANDING_ENABLED !== 'false') + ',',
  '',
  '  // Telegram 群组完整 URL；留空时尝试读取后端配置',
  '  telegram_group: ' + JSON.stringify(env.STELLAR_TG_GROUP || '') + ',',
  '',
  '  // API 检测全部失败时展示的联系信息',
  '  api_error_contact: ' + JSON.stringify(env.STELLAR_API_ERR_CONTACT || '') + ',',
  '',
  '  // 各平台客户端下载地址（对应项留空则不展示该平台入口）',
  '  client_downloads: {',
  '    // Windows 客户端安装包 URL',
  '    windows: ' + JSON.stringify(env.STELLAR_DL_WINDOWS || '') + ',',
  '    // macOS 客户端安装包 URL',
  '    macos: ' + JSON.stringify(env.STELLAR_DL_MACOS || '') + ',',
  '    // Android 客户端安装包或应用商店 URL',
  '    android: ' + JSON.stringify(env.STELLAR_DL_ANDROID || '') + ',',
  '    // iOS 客户端的 App Store 或安装说明 URL',
  '    ios: ' + JSON.stringify(env.STELLAR_DL_IOS || '') + ',',
  '    // Linux 客户端安装包或使用说明 URL',
  '    linux: ' + JSON.stringify(env.STELLAR_DL_LINUX || '') + ',',
  '    // 路由器客户端固件/文档 URL',
  '    router: ' + JSON.stringify(env.STELLAR_DL_ROUTER || '') + ',',
  '  },',
  '',
  '  api: {',
  '    // 地址模式：\'static\'=固定地址列表  \'auto\'=自动拼接',
  '    url_mode: ' + JSON.stringify(env.STELLAR_API_MODE || 'static') + ',',
  '',
  '    // static 模式后端地址列表（逗号分隔，多个地址配合 check_enabled 实现故障转移）',
  '    static_base_urls: ' + JSON.stringify((env.STELLAR_API_URLS || '').split(',').filter(Boolean)) + ',',
  '',
  '    // auto 模式拼接规则',
  '    auto: {',
  '      use_same_protocol: ' + (env.STELLAR_AUTO_SAME_PROTOCOL !== 'false') + ',',
  '      host: ' + JSON.stringify(env.STELLAR_AUTO_HOST || '') + ',',
  '      append_path: ' + JSON.stringify(env.STELLAR_AUTO_PATH || '') + ',',
  '    },',
  '',
  '    // 是否启用健康检测（多地址时开启，自动切换可用节点）',
  '    check_enabled: ' + (env.STELLAR_CHECK_ENABLED === 'true') + ',',
  '    check_path: \'/api/v1/guest/comm/config\',',
  '',
  '    // 正向代理配置（用于跨域或内网穿透，通常保持禁用）',
  '    proxy_enabled: ' + (env.STELLAR_PROXY_ENABLED === 'true') + ',',
  '    proxy_url: ' + JSON.stringify(env.STELLAR_PROXY_URL || '') + ',',
  '    proxy_path: ' + JSON.stringify(env.STELLAR_PROXY_PATH || '/api-proxy') + ',',
  '    proxy_mode: ' + JSON.stringify(env.STELLAR_PROXY_MODE || 'base64Path') + ',',
  '  },',
  '}',
].join('\n')

writeFileSync('public/env.js', output, 'utf-8')
console.log('✓ public/env.js generated from Vercel environment variables')
