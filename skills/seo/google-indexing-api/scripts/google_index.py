#!/usr/bin/env python3
"""
Google Indexing API 批量提交脚本
==================================
功能：自动向 Google 提交网页更新通知（URL_UPDATED）
适用：博客、商城、导航页等需要被 Google 快速收录的页面

使用前准备（只需一次）：
  1. 打开 https://console.cloud.google.com → 新建项目（或选择已有）
  2. 启用 Indexing API：搜索 "Indexing API" → 启用
  3. 创建服务账号：IAM与管理 → 服务账号 → 创建
     - 名称随意（如 "indexing-bot"）
     - 角色选 "基本 > 编辑者" 或直接跳过（后面配）
  4. 创建密钥：进入刚建的服务账号 → 密钥 → 添加密钥 → JSON
     - 下载的 JSON 文件就是本脚本需要的凭证文件
  5. 将服务账号邮箱添加到 Google Search Console：
     - 打开 https://search.google.com/search-console
     - 每个域名 → 设置 → 用户和权限 → 添加用户
     - 填入服务账号邮箱（类似 indexing-bot@xxx.iam.gserviceaccount.com）
     - 权限选 "拥有者"（Owner，必须是完整所有者）

用法：
  python3 google_index.py                           # 默认模式
  python3 google_index.py --help                    # 查看帮助
"""

import argparse
import json
import logging
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("google-index")

# ── 配置区 ──────────────────────────────────────────────────
# 可在此直接修改，也可通过命令行参数覆盖

DEFAULT_CREDENTIALS = "service-account.json"   # Google 服务账号 JSON 凭证文件
DEFAULT_URLS_FILE = "urls.txt"                  # URL 列表文件（每行一个）
DEFAULT_SITEMAP = ""                            # 可选：从 sitemap.xml 提取 URL
DEFAULT_CONCURRENCY = 5                         # 并发数（Indexing API 限制宽松）
DEFAULT_QUOTA_DAILY = 200                       # Google 每日配额提醒阈值
DEFAULT_TYPE = "URL_UPDATED"                    # URL_UPDATED 或 URL_DELETED
# ────────────────────────────────────────────────────────────


def load_credentials(path: str) -> dict:
    """加载 Google 服务账号 JSON 凭证"""
    p = Path(path)
    if not p.exists():
        log.error(f"凭证文件不存在: {path}")
        log.error("请先创建 Google Cloud 服务账号并下载 JSON 密钥")
        sys.exit(1)
    with open(p) as f:
        return json.load(f)


def get_access_token(creds: dict) -> str:
    """使用服务账号 JWT 获取 OAuth 2.0 access_token"""
    import google.auth.transport.requests
    from google.oauth2 import service_account

    SCOPES = ["https://www.googleapis.com/auth/indexing"]

    try:
        credentials = service_account.Credentials.from_service_account_info(
            creds, scopes=SCOPES
        )
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        return credentials.token
    except ImportError:
        log.error("缺少 google-auth 库，请安装：")
        log.error("  pip install google-auth")
        sys.exit(1)
    except Exception as e:
        log.error(f"获取 access_token 失败: {e}")
        sys.exit(1)


def submit_url(token: str, url: str, update_type: str = "URL_UPDATED") -> dict:
    """向 Google Indexing API 提交单个 URL"""
    import urllib.request
    import urllib.error

    api_url = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    payload = json.dumps({"url": url, "type": update_type}).encode()

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return {"url": url, "status": "ok", "result": result}
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            err_detail = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            err_detail = {"raw": body[:500]}
        return {"url": url, "status": "error", "code": e.code, "detail": err_detail}
    except urllib.error.URLError as e:
        return {"url": url, "status": "error", "code": 0, "detail": str(e.reason)}


def load_urls_from_file(path: str) -> list:
    """从文本文件读取 URL 列表"""
    p = Path(path)
    if not p.exists():
        log.error(f"URL 文件不存在: {path}")
        return []
    urls = []
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)
    log.info(f"从 {path} 读取到 {len(urls)} 个 URL")
    return urls


def fetch_urls_from_sitemap(sitemap_url: str) -> list:
    """从 sitemap.xml 提取所有 URL"""
    import urllib.request
    import xml.etree.ElementTree as ET

    log.info(f"正在获取 sitemap: {sitemap_url}")
    try:
        with urllib.request.urlopen(sitemap_url, timeout=30) as resp:
            raw = resp.read()
        root = ET.fromstring(raw)
        ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = []
        for loc in root.iterfind(".//ns:loc", ns):
            urls.append(loc.text.strip())
        if not urls:
            for loc in root.iter("loc"):
                urls.append(loc.text.strip())
        log.info(f"从 sitemap 提取到 {len(urls)} 个 URL")
        return urls
    except Exception as e:
        log.error(f"获取 sitemap 失败: {e}")
        return []


def print_report(results: list, elapsed: float):
    """打印提交报告"""
    ok = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]

    print()
    print("=" * 60)
    print("  提交报告")
    print("=" * 60)
    print(f"  总提交: {len(results)}")
    print(f"  成功:   {len(ok)}")
    print(f"  失败:   {len(err)}")
    print(f"  耗时:   {elapsed:.1f}s")
    print()

    if ok:
        print("  ✅ 成功提交的 URL:")
        for r in ok[:10]:
            print(f"     {r['url']}")
        if len(ok) > 10:
            print(f"     ... 及 {len(ok)-10} 个")
        print()

    if err:
        print("  ❌ 失败的 URL:")
        for r in err:
            detail = r.get("detail", {})
            if isinstance(detail, dict):
                msg = detail.get("error", {}).get("message", json.dumps(detail)[:100])
            else:
                msg = str(detail)[:100]
            print(f"     [{r['code']}] {r['url']}")
            print(f"            原因: {msg}")
        print()

    if len(ok) > DEFAULT_QUOTA_DAILY * 0.8:
        print(f"  ⚠️  注意：今日提交量已达 {len(ok)}，接近 Google 日配额上限")
        print(f"     Google 默认每日配额约 {DEFAULT_QUOTA_DAILY} 条")
        print()


def interactive_setup():
    """引导用户创建服务账号并设置 Google Search Console"""
    print()
    print("=" * 60)
    print("  Google Indexing API 初始配置指南")
    print("=" * 60)
    print()
    print("  本脚本需要 Google Cloud 服务账号和 Search Console 权限。")
    print("  请按以下步骤操作：")
    print()
    print("  ┌─────────────────────────────────────────────────────────┐")
    print("  │  1. 打开 https://console.cloud.google.com              │")
    print("  │     新建项目或选择已有项目                               │")
    print("  │                                                        │")
    print("  │  2. 启用 Indexing API：                                │")
    print('  │     搜索 → "Indexing API" → 启用                      │')
    print("  │                                                        │")
    print("  │  3. 创建服务账号：                                     │")
    print("  │     IAM与管理 → 服务账号 → 创建服务账号               │")
    print("  │     名称: indexing-bot → 创建并继续                    │")
    print("  │     角色: 基本 → 编辑者 (可选) → 完成                  │")
    print("  │                                                        │")
    print("  │  4. 下载密钥：                                         │")
    print("  │     进入服务账号 → 密钥 → 添加密钥 → JSON             │")
    print("  │     下载后重命名为 service-account.json               │")
    print("  │                                                        │")
    print("  │  5. 添加 Search Console 权限（每个域名都要做）：       │")
    print("  │     https://search.google.com/search-console           │")
    print("  │     设置 → 用户和权限 → 添加用户                      │")
    print('  │     填入服务账号邮箱（xxx@xxx.iam.gserviceaccount.com）│')
    print('  │     权限选 "拥有者"（Owner）                           │')
    print("  └─────────────────────────────────────────────────────────┘")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Google Indexing API 批量提交脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 初始化引导（首次使用）
  python3 google_index.py --setup

  # 从文件提交 URL
  python3 google_index.py --urls urls.txt

  # 从 sitemap 获取 URL 并提交
  python3 google_index.py --sitemap https://blog.aklibk.com/sitemap.xml

  # 指定凭证文件
  python3 google_index.py --credentials my-key.json --urls urls.txt

  # 标记删除（URL 已移除时使用）
  python3 google_index.py --urls urls.txt --type URL_DELETED

  # 并发提交（提高速度）
  python3 google_index.py --urls urls.txt --workers 10
        """,
    )
    parser.add_argument("--setup", action="store_true", help="显示初始配置引导")
    parser.add_argument(
        "-c", "--credentials", default=DEFAULT_CREDENTIALS,
        help=f"服务账号 JSON 凭证文件 (默认: {DEFAULT_CREDENTIALS})",
    )
    parser.add_argument(
        "-u", "--urls", default=DEFAULT_URLS_FILE,
        help=f"URL 列表文件，每行一个 (默认: {DEFAULT_URLS_FILE})",
    )
    parser.add_argument(
        "-s", "--sitemap", default=DEFAULT_SITEMAP,
        help="从 sitemap.xml 提取 URL（优先级高于 --urls）",
    )
    parser.add_argument(
        "-t", "--type", dest="update_type", default=DEFAULT_TYPE,
        choices=["URL_UPDATED", "URL_DELETED"],
        help="通知类型 (默认: URL_UPDATED)",
    )
    parser.add_argument(
        "-w", "--workers", type=int, default=DEFAULT_CONCURRENCY,
        help=f"并发数 (默认: {DEFAULT_CONCURRENCY})",
    )
    parser.add_argument(
        "--batch", type=int, default=0,
        help="每批提交数（0=全部），用于分批次提交",
    )
    parser.add_argument("--dry-run", action="store_true", help="仅打印 URL，不实际提交")
    parser.add_argument("--quiet", action="store_true", help="只输出关键信息")

    args = parser.parse_args()

    if args.quiet:
        log.setLevel(logging.WARNING)

    if args.setup:
        interactive_setup()
        return

    urls = []
    if args.sitemap:
        urls = fetch_urls_from_sitemap(args.sitemap)
    if not urls:
        urls = load_urls_from_file(args.urls)

    if not urls:
        log.error("没有 URL 可提交。请提供 --urls 文件或 --sitemap")
        print()
        print("  快速开始：")
        print("    echo 'https://blog.aklibk.com' > urls.txt")
        print(f"    python3 {sys.argv[0]} --setup")
        print(f"    python3 {sys.argv[0]} --urls urls.txt")
        print()
        sys.exit(1)

    urls = sorted(set(urls))
    log.info(f"待提交 URL 共 {len(urls)} 个")

    if args.batch > 0:
        urls = urls[: args.batch]
        log.info(f"本次实际提交 {len(urls)} 个（限批 {args.batch}）")

    if args.dry_run:
        print(f"\n  DRY RUN — 以下 {len(urls)} 个 URL 将被提交:\n")
        for u in urls:
            print(f"    {u}")
        print()
        return

    creds = load_credentials(args.credentials)
    token = get_access_token(creds)
    log.info("OAuth token 获取成功")

    log.info(f"开始提交（并发 {args.workers}）...")
    start = time.time()
    results = []

    if args.workers <= 1:
        for i, url in enumerate(urls, 1):
            log.info(f"[{i}/{len(urls)}] {url}")
            result = submit_url(token, url, args.update_type)
            results.append(result)
            if result["status"] == "error" and result.get("code") in (403, 429):
                log.warning(f"遇到频率限制，暂停 5 秒...")
                time.sleep(5)
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            future_map = {
                executor.submit(submit_url, token, url, args.update_type): url
                for url in urls
            }
            for i, future in enumerate(as_completed(future_map), 1):
                url = future_map[future]
                try:
                    result = future.result()
                    results.append(result)
                    status = "✅" if result["status"] == "ok" else "❌"
                    log.info(f"[{i}/{len(urls)}] {status} {url}")
                except Exception as e:
                    results.append({"url": url, "status": "error", "code": 0, "detail": str(e)})
                    log.error(f"[{i}/{len(urls)}] ❌ {url} - {e}")

    elapsed = time.time() - start
    print_report(results, elapsed)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"google_index_report_{timestamp}.json"
    with open(report_file, "w") as f:
        json.dump(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total": len(results),
                "success": len([r for r in results if r["status"] == "ok"]),
                "failed": len([r for r in results if r["status"] == "error"]),
                "results": results,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    log.info(f"详细报告已保存到: {report_file}")

    failed = [r for r in results if r["status"] == "error"]
    if failed:
        retry_file = f"google_index_retry_{timestamp}.txt"
        with open(retry_file, "w") as f:
            for r in failed:
                f.write(r["url"] + "\n")
        log.info(f"失败的 URL 已保存到: {retry_file}")
        print(f"  重试命令: python3 {sys.argv[0]} --urls {retry_file}")
        print()


if __name__ == "__main__":
    main()
