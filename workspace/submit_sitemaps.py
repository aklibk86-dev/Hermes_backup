#!/usr/bin/env python3
"""
Sitemap 批量提交脚本
====================
提交到国内外主流搜索引擎
"""

import json
import logging
import urllib.request
import urllib.error
import sys
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("sitemap-submit")

# 站点地图列表
SITEMAPS = [
    "https://blog.aklibk.com/sitemap.xml",
    "https://shop.aklibk.com/sitemap.xml",
]

# ── 搜索引擎提交 ──

def submit_google(sitemap_url: str) -> dict:
    """Google: 支持 ping 接口"""
    url = f"https://www.google.com/ping?sitemap={sitemap_url}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"engine": "Google", "url": sitemap_url, "status": "✅", "code": resp.getcode()}
    except Exception as e:
        return {"engine": "Google", "url": sitemap_url, "status": "❌", "error": str(e)[:80]}


def submit_bing(sitemap_url: str) -> dict:
    """Bing: 支持 ping 接口。需先验证站点所有权"""
    url = f"https://www.bing.com/ping?sitemap={sitemap_url}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"engine": "Bing", "url": sitemap_url, "status": "✅", "code": resp.getcode()}
    except Exception as e:
        return {"engine": "Bing", "url": sitemap_url, "status": "❌", "error": str(e)[:80]}


# ── 执行提交 ──

def main():
    print("=" * 60)
    print("  站点地图提交报告")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    results = []

    for sitemap in SITEMAPS:
        print(f"📄 {sitemap}")
        print("-" * 50)

        # Google
        r = submit_google(sitemap)
        results.append(r)
        print(f"  Google  {'✅' if r['status']=='✅' else '❌'}  ", end="")
        if "code" in r:
            print(f"HTTP {r['code']}")
        else:
            print(r.get("error", ""))

        # Bing
        r = submit_bing(sitemap)
        results.append(r)
        print(f"  Bing    {'✅' if r['status']=='✅' else '❌'}  ", end="")
        if "code" in r:
            print(f"HTTP {r['code']}")
        else:
            print(r.get("error", ""))

        print()

    # ── 汇总 ──
    print("=" * 60)
    print("  提交汇总")
    print("=" * 60)

    ok = [r for r in results if r["status"] == "✅"]
    fail = [r for r in results if r["status"] == "❌"]
    print(f"  成功: {len(ok)}")
    print(f"  失败: {len(fail)}")
    print()

    # ── 国内搜索引擎指引 ──
    print("─" * 60)
    print("  📋 国内搜索引擎（需手动提交）")
    print("─" * 60)
    print()
    print("  百度站长沙龙 (ziyuan.baidu.com)")
    print("    ① 登录 https://ziyuan.baidu.com")
    print("    ② 添加站点 shop.aklibk.com / blog.aklibk.com")
    print("    ③ 验证所有权")
    print("    ④ 提交站点地图")
    print("    ⑤ 可用 API 自动提交（需配置 token）")
    print()
    print("  搜狗站长平台 (zhanzhang.sogou.com)")
    print("    ① 登录 https://zhanzhang.sogou.com")
    print("    ② 添加站点 → 提交站点地图")
    print()
    print("  360站长平台 (zhanzhang.so.com)")
    print("    ① 登录 https://zhanzhang.so.com")
    print("    ② 添加站点 → 提交站点地图")
    print()
    print("  头条站长平台 (zhanzhang.toutiao.com)")
    print("    ① 登录 https://zhanzhang.toutiao.com")
    print("    ② 添加站点 → 提交站点地图")
    print()


if __name__ == "__main__":
    main()
