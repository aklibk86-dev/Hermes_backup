#!/usr/bin/env python3
"""
Google Indexing API 批量提交脚本

向 Google 提交网页更新通知（URL_UPDATED），加速新内容收录。
适用于博客文章、商城商品等时效性页面。

使用前准备：
  1. Google Cloud Console → 启用 Indexing API
  2. 创建服务账号 → 下载 JSON 密钥
  3. 在 Google Search Console 中将服务账号邮箱添加为每个域的拥有者

用法：
  python3 google-index-submit.py --help              # 查看帮助
  python3 google-index-submit.py --urls urls.txt     # 从文件提交
  python3 google-index-submit.py --sitemap URL       # 从 sitemap 提取
  python3 google-index-submit.py --setup             # 初始配置引导
  python3 google-index-submit.py --dry-run           # 预览不提交
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

DEFAULT_CREDENTIALS = "service-account.json"
DEFAULT_URLS_FILE = "urls.txt"
DEFAULT_CONCURRENCY = 5
DEFAULT_TYPE = "URL_UPDATED"


def load_credentials(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        log.error(f"凭证文件不存在: {path}")
        sys.exit(1)
    with open(p) as f:
        return json.load(f)


def get_access_token(creds: dict) -> str:
    import google.auth.transport.requests
    from google.oauth2 import service_account

    SCOPES = ["https://www.googleapis.com/auth/indexing"]
    credentials = service_account.Credentials.from_service_account_info(creds, scopes=SCOPES)
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token


def submit_url(token: str, url: str, update_type: str = "URL_UPDATED") -> dict:
    import urllib.request, urllib.error

    api_url = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    payload = json.dumps({"url": url, "type": update_type}).encode()
    req = urllib.request.Request(
        api_url, data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return {"url": url, "status": "ok", "result": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            err_detail = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            err_detail = {"raw": body[:500]}
        return {"url": url, "status": "error", "code": e.code, "detail": err_detail}
    except urllib.error.URLError as e:
        return {"url": url, "status": "error", "code": 0, "detail": str(e.reason)}


def load_urls(path: str) -> list:
    p = Path(path)
    if not p.exists():
        log.error(f"文件不存在: {path}")
        return []
    urls = []
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)
    return urls


def fetch_sitemap(sitemap_url: str) -> list:
    import urllib.request, xml.etree.ElementTree as ET

    log.info(f"获取 sitemap: {sitemap_url}")
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
    return urls


def print_report(results: list, elapsed: float):
    ok = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]
    print(f"\n提交完成: {len(ok)} 成功, {len(err)} 失败, {elapsed:.1f}s")
    for r in err[:5]:
        detail = r.get("detail", {})
        msg = detail.get("error", {}).get("message", str(detail)[:80]) if isinstance(detail, dict) else str(detail)[:80]
        print(f"  [{r['code']}] {r['url']} — {msg}")
    if err:
        print(f"  重试: python3 {sys.argv[0]} --urls fail.txt")


def interactive_setup():
    print("""
  Google Indexing API 初始配置

  1. https://console.cloud.google.com → 启用 Indexing API
  2. IAM → 服务账号 → 创建 → 下载 JSON 密钥
  3. https://search.google.com/search-console
     每个域名 → 设  → 用户和权限 → 添加服务账号邮箱为拥有者
  4. 重命名密钥为 service-account.json
""")


def main():
    parser = argparse.ArgumentParser(description="Google Indexing API 批量提交", formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--setup", action="store_true", help="初始配置引导")
    parser.add_argument("-c", "--credentials", default=DEFAULT_CREDENTIALS, help=f"服务账号 JSON (默认: {DEFAULT_CREDENTIALS})")
    parser.add_argument("-u", "--urls", default=DEFAULT_URLS_FILE, help=f"URL 文件 (默认: {DEFAULT_URLS_FILE})")
    parser.add_argument("-s", "--sitemap", help="从 sitemap.xml 提取 URL")
    parser.add_argument("-t", "--type", dest="update_type", default=DEFAULT_TYPE, choices=["URL_UPDATED", "URL_DELETED"])
    parser.add_argument("-w", "--workers", type=int, default=DEFAULT_CONCURRENCY, help=f"并发数 (默认: {DEFAULT_CONCURRENCY})")
    parser.add_argument("--batch", type=int, default=0, help="限制提交数量")
    parser.add_argument("--dry-run", action="store_true", help="仅预览")
    args = parser.parse_args()

    if args.setup:
        return interactive_setup()

    urls = fetch_sitemap(args.sitemap) if args.sitemap else load_urls(args.urls)
    if not urls:
        log.error("没有 URL 可提交")
        sys.exit(1)
    urls = sorted(set(urls))
    if args.batch > 0:
        urls = urls[:args.batch]
    log.info(f"待提交: {len(urls)} URL")

    if args.dry_run:
        print("\n".join(urls))
        return

    creds = load_credentials(args.credentials)
    token = get_access_token(creds)
    results = []
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        fm = {ex.submit(submit_url, token, u, args.update_type): u for u in urls}
        for i, f in enumerate(as_completed(fm), 1):
            r = f.result()
            results.append(r)
            log.info(f"[{i}/{len(urls)}] {'✅' if r['status']=='ok' else '❌'} {r['url']}")

    elapsed = time.time() - start
    print_report(results, elapsed)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    with open(f"google_index_report_{ts}.json", "w") as f:
        json.dump({"timestamp": datetime.now(timezone.utc).isoformat(), "total": len(results), "results": results}, f, indent=2)
    failed = [r for r in results if r["status"] == "error"]
    if failed:
        with open(f"google_index_retry_{ts}.txt", "w") as f:
            for r in failed:
                f.write(r["url"] + "\n")
        log.info(f"重试列表: google_index_retry_{ts}.txt")


if __name__ == "__main__":
    main()
