---
name: documentation-lookup
description: 使用 Context7 MCP 获取最新的库/框架文档，避免依赖训练数据。适用于设置问题、API 参考、代码示例等场景。
category: software-development
triggers: 
  - library
  - framework
  - docs
  - API reference
origin: ECC / SkillsHub
---

# Documentation Lookup (Context7)

当用户询问关于库、框架或 API 的问题时，通过 Context7 MCP 获取最新文档，而不是依赖训练数据。

> ✅ Context7 CLI 已配置，使用 `npx ctx7 library` 和 `npx ctx7 docs` 命令查询最新文档。

## 核心概念

- **Context7**: 提供实时文档的 MCP 服务器
- **resolve-library-id**: 从库名和查询中返回 Context7 兼容的库 ID
- **query-docs**: 根据库 ID 和问题获取文档和代码片段

## 使用时机

当用户：
- 询问设置或配置问题
- 需要依赖某个库的代码
- 需要 API 或参考信息
- 提到特定框架或库（React、Vue、Next.js、Prisma、Supabase 等）

## 工作流程

### 步骤1: 解析库 ID
运行终端命令：
```bash
npx ctx7 library "库名称" "用户的问题"
```

### 步骤2: 选择最佳匹配
根据名称匹配度、基准分数、来源信誉、版本号选择最佳结果。

### 步骤3: 获取文档
运行终端命令：
```bash
npx ctx7 docs "库ID" "用户的具体问题"
```

限制：每个问题最多调用 3 次。

### 步骤4: 使用文档
用获取的最新信息回答问题，包含相关代码示例。

## 示例

### Next.js 中间件
1. `npx ctx7 library "Next.js" "How to set up middleware"` → 获取 /vercel/next.js
2. `npx ctx7 docs "/vercel/next.js" "How do I set up Next.js middleware?"`
3. 用返回的文档信息回答

### Prisma 查询
1. `npx ctx7 library "Prisma" "How to query with relations"` → 获取 /prisma/prisma
2. `npx ctx7 docs "/prisma/prisma" "How do I query with relations in Prisma?"`
3. 用返回的 Prisma 查询模式示例回答

## 最佳实践
- 查询时使用英文关键词获得更好的结果
- 有版本信息时优先使用版本特定 ID
- 不要将敏感数据（API Key、密码等）传入查询
