#!/usr/bin/env python3
"""
Sitemap 提交脚本（2026 新版）
============================
Google/Bing 已弃用旧版 ping 接口。新方案：
  1. 在 robots.txt 中声明 Sitemap（所有搜索引擎自动发现）
  2. 提供各站长平台直达链接
"""

def main():
    print("=" * 70)
    print("  Sitemap 提交方案（2026 新版）")
    print(f"  Google/Bing 已弃用旧版 ping 接口")
    print("=" * 70)
    print()

    sitemaps = [
        "https://blog.aklibk.com/sitemap.xml",
        "https://shop.aklibk.com/sitemap.xml",
    ]

    print("  📄 站点地图")
    for s in sitemaps:
        print(f"    {s}")
    print()

    # ── 方案 1: robots.txt ──
    print("─" * 70)
    print("  ✅ 方案一：robots.txt 声明（推荐，全搜索引擎通用）")
    print("─" * 70)
    print()
    print("  所有搜索引擎抓取 robots.txt 时自动发现站点地图。")
    print("  需要在以下文件添加 Sitemap 声明行：")
    print()

    robots_sites = [
        ("blog.aklibk.com", "Halo 博客", "/opt/.../halo 配置"),
        ("shop.aklibk.com", "Dujiao 商城", "通过 OpenResty 配置"),
        ("api.wf1.one", "New-API", "通过 OpenResty 配置"),
    ]

    for domain, name, _ in robots_sites:
        print(f"  • {domain} ({name})")
    print()

    # ── 方案 2: 站长平台提交 ──
    print("─" * 70)
    print("  📋 方案二：站长平台手动提交（推荐完成）")
    print("─" * 70)
    print()

    engines = [
        ("Google", "Search Console",
         "https://search.google.com/search-console",
         "① 添加 shop.aklibk.com / blog.aklibk.com → 验证所有权\n"
         "② 左侧 Sitemaps → 输入 sitemap.xml → 提交"),
        ("Bing", "Webmaster Tools",
         "https://www.bing.com/webmaster",
         "① 添加站点（可用 Google Search Console 导入）\n"
         "② Sitemaps → 提交 sitemap.xml"),
        ("百度", "站长沙龙",
         "https://ziyuan.baidu.com/site/index",
         "① 添加站点 → 验证所有权（建议用 CNAME 或 TXT）\n"
         "② 数据引入 → 站点地图 → 提交"),
        ("搜狗", "站长平台",
         "https://zhanzhang.sogou.com",
         "① 添加站点 → 验证所有权\n"
         "② 站点地图提交 → 输入 sitemap 链接"),
        ("360", "站长平台",
         "https://zhanzhang.so.com",
         "① 添加站点 → 验证所有权\n"
         "② 站点管理 → 站点地图提交"),
    ]

    for name, platform, url, steps in engines:
        print(f"  🌐 {name} ({platform})")
        print(f"     {url}")
        for line in steps.split("\n"):
            print(f"     {line}")
        print()

    # ── 方案 3: 自动收录优化 ──
    print("─" * 70)
    print("  🚀 方案三：加速收录设置")
    print("─" * 70)
    print()
    print("  1. 确保 robots.txt 正确（允许抓取，声明 Sitemap）")
    print("  2. 内部链接结构清晰（面包屑、相关文章）")
    print("  3. 提交 Google Indexing API（已写脚本）")
    print("  4. 百度快速收录工具（需站点达到一定权重）")
    print()


if __name__ == "__main__":
    main()
