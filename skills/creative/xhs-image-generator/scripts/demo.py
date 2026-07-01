#!/usr/bin/env python3
"""
小红书图文笔记生成器 — 快速演示
运行：python3 demo.py
输出：xhs_output/ 目录下 6 张 1080×1440 PNG
"""

import sys, os

# 从 skill 模板目录导入
skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(skill_dir, "templates"))

from xhs_generator import generate_all, CONTENT_CONFIG

if __name__ == "__main__":
    print("🚀 小红书图文生成器 — 演示模式")
    print(f"   使用默认配置（GPT-4o 教程主题）")
    print(f"   输出目录: xhs_output/\n")
    generate_all()
