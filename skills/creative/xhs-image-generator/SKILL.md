---
name: xhs-image-generator
description: Generate 小红书-style tutorial images (6-panel carousel) using Pillow. Produces soft pastel 1080×1440 PNGs with pastel tones, rounded cards, emoji, and code-block styling.
version: 1.0.0
author: Hermes Agent
metadata:
  hermes:
    tags: [xiaohongshu, pillow, image-generation, social-media, creative]
    related_skills: []
---

# 小红书图文笔记生成器

生成 6 张 1080×1440 小红书信息流图（封面→引言→步骤×3→引导），风格柔和温暖，纯 Pillow 绘制。

## 原理

纯 Python（Pillow）画图，不走 AI 生图或设计工具。每张图包含：
- 装饰椭圆色块 + 半透明遮罩柔化
- 圆角矩形卡片布局
- 粉彩色系（粉/桃/薄荷/薰衣草/天空蓝/奶油白）
- emoji + 大白话文案

## 前置条件

```bash
pip install Pillow
```

系统需要中文字体（自动查找 wqy-zenhei / 微软雅黑 / PingFang）。

## 使用方法

### 快速开始

```python
from xhs_generator import generate_all

generate_all()
# → 输出 xhs_output/01_封面.png ~ 06_引导私信.png
```

### 自定义内容

修改 `CONTENT_CONFIG` 字典中的文字即可换主题：

| Key | 说明 | 示例 |
|-----|------|------|
| `cover_title1/2` | 封面大标题 | `"国内用 GPT-4o"` |
| `cover_tags` | 3个标签 | `["国内直接可用", "3分钟搞定", ...]` |
| `intro_questions` | 痛点问题（3条） | `["想用但没境外卡？😫", ...]` |
| `intro_selling_point` | 核心卖点 | `"WF API中转站 · 国内直接用的 AI 接口"` |
| `step1_title/items/tip` | 步骤1 | 标题+步骤列表+提示 |
| `step2_title/items/tip` | 步骤2 | 同上 |
| `step3_title/items_intro/code_lines/tip` | 步骤3（代码编辑器风格） | 含代码行格式 |
| `cta_package_title/items/body/footer` | 引导页 | 资料包清单+话术 |

示例——换主题：

```python
config = {**CONTENT_CONFIG}
config["cover_title1"] = "小白也能懂的"
config["cover_title2"] = "AI 绘画入门"
# ...改其他字段
generate_all(config)
```

### CLI 直接运行

```bash
python3 /path/to/xhs_generator.py
```

## 文件结构

| 文件 | 说明 |
|------|------|
| `xhs_generator.py` | 主脚本（6 页生成 + 配置） |
| `xhs_output/` | 输出目录（自动创建） |

## 敏感词避坑

| ❌ 禁用词 | ✅ 替换 |
|-----------|--------|
| 翻墙、VPN、梯子、机场 | 国内直接可用 |
| 境外、科学上网 | 无需特殊网络环境 |
| 微信号、二维码、链接（正文） | 私信我 / 看置顶 |
| 代充、低价、代理 | （避开） |

## 扩展方向

1. **换配色**：改颜色常量数组
2. **加真实截图**：步骤页 `img.paste(screenshot, (x, y))`
3. **批量生产**：JSON 配置循环
4. **加二维码**：`draw.rectangle` 占位（小红书图片带码会降权，慎用）

## 参考文件

| `templates/xhs_generator.py` | 完整可运行脚本，含 6 页生成函数 + CONTENT_CONFIG 配置 |
| `scripts/demo.py` | 快速演示脚本（默认内容直接出图） |
