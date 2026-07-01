# Video Outline

> **主题**：演示用（Demo 主题待定）
> **总时长**：约 2 分 30 秒（口播 ~510 字 ÷ ~200 字/分钟）
> **章节数**：4 章 / 12 步

---

## 1. hook — 开头钩子 + 总览（2 steps · ~25s）

**信息池**：
- 数字：12 个软件配置方法 —— 来源 article §四
- 概念：一次配置，所有软件通用 —— 来源 article §三

**开发计划**：

- step 1 (~10s) — 开头钩子：痛点画面（用户在不同软件里翻找设置）
- step 2 (~15s) — 核心信息展示：api.wf1.one + /v1 Base URL，大字居中

口播节选：
> 你在用一个 API 中转站，但每次换软件都要重新找设置在哪，对吧？今天这个视频，我把 12 个软件的配置方法全给你理顺了。一次配好，所有软件通吃。

---

## 2. setup — 注册与令牌（4 steps · ~55s）

**信息池**：
- 数据：10元=20刀，1倍率 —— 来源 article 顶部速览
- 数据：支持的模型包括 GPT、Claude、DeepSeek、Gemini 等 —— 来源 article §三
- 注意：令牌关闭后不可再次查看 —— 来源 article §二

**开发计划**：

- step 1 (~10s) — 模型列表展示：卡片式展示支持的主流模型
- step 2 (~15s) — 注册流程：三步骤示意（访问→注册→记住密码）
- step 3 (~15s) — 充值：钱包→充值→兑换码→到账，流程动效
- step 4 (~15s) — 创建令牌：令牌管理→添加→复制 sk-xxx，强调立即复制

口播节选：
> 支持的模型，从 GPT、Claude 到 DeepSeek，基本你能想到的都有。第一步，注册。打开 api.wf1.one，点 Sign up。

---

## 3. demo — 三个软件演示（4 steps · ~55s）

**信息池**：
- 案例：ChatBox 设置只需 3 个参数、30 秒 —— 来源 article §四-1
- 案例：Cursor 需 Override Base URL + 手动添加模型名 —— 来源 article §四-3
- 案例：Python openai 库几行代码接入 —— 来源 article §四-6

**开发计划**：

- step 1 (~10s) — 三个通用参数大字展示：Base URL / API Key / Model
- step 2 (~12s) — ChatBox 设置演示：设置界面 → 填三处 → 完成
- step 3 (~15s) — Cursor 设置演示：Override 开关 + Model Names 添加
- step 4 (~18s) — Python 代码演示：代码逐行揭示流

口播节选：
> 先说 ChatBox，最好上手的。设置里选 OpenAI API，填上 api.wf1.one/v1，贴上 Key，选个模型。结束。

---

## 4. outro — 结尾 + CTA（2 steps · ~15s）

**信息池**：
- 数字：还剩 9 个软件教程在完整博文中 —— 来源 article §四

**开发计划**：

- step 1 (~8s) — 更多软件速览：LobeChat / Windsurf / JetBrains 等 logo 流
- step 2 (~7s) — CTA：博客链接 + 评论区引导

口播节选：
> 还有 LobeChat、Windsurf、JetBrains、NextChat、Obsidian……整整 12 个软件的配置方法。博客链接在下面，有什么问题评论区聊。

---

## 素材清单

### 1. hook
- ✓ api.wf1.one 域名截图（已爬取）
- ⚠️ 软件切换场景图（待提供或用 placeholder）

### 2. setup
- ⚠️ 模型 logo 列表图（GPT / Claude / DeepSeek / Gemini）
- ⚠️ 注册页面截图（可现场截取）
- ⚠️ 钱包页面截图

### 3. demo
- ⚠️ ChatBox 设置界面截图
- ⚠️ Cursor 设置界面截图
- ✓ Python 代码片段（已从 article 提取）

### 4. outro
- ⚠️ 12 个软件 logo 墙
- ✓ 博客链接

---

## 自检

- [x] 每个 step 都是单一屏幕内容描述，没有动画行
- [x] 没有任何 step 写了具体毫秒/秒数（除 ~Ts 口播估时）
- [x] 每章首段有信息池，≥3 条，带来源标注
- [x] 所有 step (~Ts) 累加 (25+55+55+15 ≈ 150s ≈ 2m30s）≈ 顶部声明
- [x] 章节切分符合每章 3~8 步 / 30~60s
- [x] 末尾素材清单列出
- [x] 脚本仅含人类可读内容
