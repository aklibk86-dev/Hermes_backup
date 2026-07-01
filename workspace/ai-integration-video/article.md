# WF AI中转站 大模型对接完整教程

一文搞定所有主流软件的 AI 接口配置

## 📡 API 信息速览

- 中转站地址：https://api.wf1.one
- API BaseURL：https://api.wf1.one/v1
- 额度购买：shop.aklibk.com（自动发货，10元=20刀，1倍率）
- 模型与价格：api.wf1.one/pricing
- 支持协议：OpenAI 兼容接口（Chat Completions API）

## 📌 一、注册与登录

### Step 1 — 打开网址
浏览器访问 api.wf1.one

### Step 2 — 注册账户
点击「Sign up」进入注册页
填写 用户名 + 邮箱 + 密码 → 提交注册
⚠️ 注意：账户名和密码务必牢记，忘记后无法找回！建议将注册信息保存到密码管理器。

### Step 3 — 登录
使用刚注册的用户名和密码登录系统。

## 🔑 二、获取 API 令牌

### Step 1 — 兑换额度
点击左侧菜单「钱包」→「充值」
前往 shop.aklibk.com 购买额度，购买后自动发货兑换码
输入兑换码，点击「兑换」，额度即时到账

### Step 2 — 创建令牌
点击「令牌管理」→「添加令牌」，填写以下参数：
- 名称：随意填写，例如「我的主力令牌」
- 令牌分组：默认分组
- 过期时间：建议选择「永不过期」，也可设置具体时长
- 新建数量：需要几个令牌就填几（通常1个即可）
- 额度设置：每个令牌的额度上限。勾选「无限额度」则此设置自动失效

💡 提示：创建后请立即复制令牌字符串（sk-xxx），关闭页面后将无法再次查看完整令牌！

## ⚙️ 三、通用配置说明

所有接入本中转站的软件只需要配置以下三个通用参数：

📎 API BaseURL（接口地址） https://api.wf1.one/v1
🔑 API Key（密钥） 你在令牌管理中创建的 sk-xxx 字符串
🧠 Model（模型名称） 详见定价页面，常用模型示例：gpt-4o · claude-3.5-sonnet · gemini-pro · deepseek-chat · Qwen2.5-72B 等

## 📱 四、各大主流软件对接教程

### 💬 1. ChatBox — 全平台 AI 聊天客户端
支持 Windows / macOS / Linux / iOS / Android
打开 ChatBox → ⚙️ 设置 → 模型提供商
选择「OpenAI API」或「自定义」
填写：API 域名 https://api.wf1.one/v1，API Key 粘贴 sk-xxx，模型手动输入
保存并开始聊天 🎉

### 🧩 2. LobeChat — 现代化 AI 聊天框架
支持插件、知识库、多模态，可自部署
打开 LobeChat → 设置 → 语言模型
提供商选择「OpenAI」
自定义 API 地址：https://api.wf1.one/v1
API Key：粘贴 sk-xxx
默认模型：选择或输入你想要的模型
高级设置中可开启「自定义模型列表」→ 自行添加需要的模型

### 🖥️ 3. Cursor — AI 代码编辑器
打开 Cursor → Settings → Models
关闭默认的 OpenAI 模型
开启「Override OpenAI Base URL」
填写：Base URL https://api.wf1.one/v1，Default Model 输入模型名，API Key 粘贴 sk-xxx
在 Model Names 中手动添加你需要的模型名称
重启 Cursor 生效

### 🌊 4. Windsurf — AI 驱动 IDE
打开 Windsurf → 设置（Ctrl+Shift+P → Open Settings JSON）
在 settings.json 中添加：
{
  "windsurf.apiBaseUrl": "https://api.wf1.one/v1",
  "windsurf.apiKey": "你的 sk-xxx 令牌",
  "windsurf.model": "claude-3.5-sonnet"
}
保存后重启 Windsurf

### 🔌 5. VS Code + Continue 插件
VS Code 上最流行的 AI 编程助手插件
安装 Continue 插件（Marketplace 搜索 Continue）
打开 Continue 侧边栏 → ⚙️ 设置
编辑配置文件 ~/.continue/config.json
添加模型配置（含 tabAutocompleteModel）
保存后重新加载 Continue

### 🐍 6. Python — openai 库调用
使用 Python 的官方 SDK 接入
安装依赖：pip install openai
示例代码使用 OpenAI 客户端，配置 base_url 和 api_key，调用 chat.completions.create

### 🌐 7. Shell / curl — 快速验证令牌
使用 curl 命令直接调用 API，验证令牌是否有效

### 🤖 8. NextChat — 私人 AI 聊天助手
支持 Docker 自部署（推荐）或 Vercel 一键部署
配置环境变量：BASE_URL、API_KEY、模型代码

### 📝 9. Obsidian + Copilot 插件
在 Obsidian 笔记工具中配置 AI 助手
设置 Copilot 插件，选择 OpenAI 兼容提供商
填写 API BaseURL 和 API Key

### 🛠️ 10. OpenCat — macOS/iOS 原生客户端
原生 macOS/iOS 体验，支持 API 接入
添加自定义提供商，填写 BaseURL 和 Key

### 💻 11. JetBrains IDE 系列
包括 IntelliJ IDEA、PyCharm、WebStorm 等
安装 Continue 或通义灵码插件
配置 OpenAI 兼容 API

### 🌍 12. 浏览器插件
包括沉浸式翻译、OpenAI Translator 等
在插件设置中配置 API BaseURL 和 Key

## ❓ 五、常见问题

Q: 额度怎么查看？
A: 登录后台 → 钱包页面，实时显示剩余额度。

Q: 令牌丢了怎么办？
A: 已丢失的令牌无法找回，请在管理后台删除后重新创建。

Q: 模型请求超时？
A: 检查本地网络是否能正常访问 api.wf1.one，尝试切换网络环境。

Q: 为什么返回 401 错误？
A: 通常是因为 API Key 填错了或已过期，请在后台重新生成。
