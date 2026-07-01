#!/usr/bin/env python3
"""Update the About page with full rich content"""
import os, json, httpx
from datetime import datetime

base_url = os.environ.get("HALO_BASE_URL", "https://blog.aklibk.com")
token = os.environ.get("HALO_TOKEN", "")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

client = httpx.Client(verify=False, timeout=30)

name = "373a5f79-f44f-441a-9df1-85a4f553ece8"

# First get the full page data
r = client.get(f"{base_url}/apis/api.console.halo.run/v1alpha1/singlepages", headers=headers)
if r.status_code != 200:
    print(f"Error: {r.status_code}")
    exit(1)

page_data = None
for item in r.json().get("items", []):
    p = item.get("page", {})
    if p.get("metadata", {}).get("name") == name:
        page_data = p
        break

if not page_data:
    print("Page not found!")
    exit(1)

# Build rich HTML content for the About page
rich_html = """<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3em 2em; border-radius: 16px; color: white; text-align: center; margin: 2em 0;">
  <p style="font-size: 4em; margin: 0 0 0.2em;">🦥</p>
  <h1 style="font-size: 2.6em; margin: 0 0 0.3em; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">关于「空缺」</h1>
  <p style="font-size: 1.4em; opacity: 0.95; margin: 0; font-weight: 300;">一个专注于各种「折腾」的小白</p>
</div>

<div style="max-width: 720px; margin: 0 auto; padding: 0 1em;">

<blockquote style="border-left: 4px solid #f59e0b; background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02)); padding: 1.5em 2em; margin: 2em 0; border-radius: 0 16px 16px 0;">
  <p style="margin: 0; font-size: 1.3em; font-style: italic; color: #fbbf24; text-align: center; line-height: 1.8;">「<strong>生命不息，折腾不止</strong>」</p>
</blockquote>

<div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05)); border-radius: 16px; padding: 2em; margin: 2em 0;">
  <h2 style="margin-top: 0;">👋 嗨，我是空缺</h2>
  <p style="font-size: 1.1em; line-height: 1.9;">一个对技术和新鲜事物充满好奇心的 <strong>小白</strong>。虽然自称小白，但我相信——<strong>每个人都是自己生活里的极客</strong>。</p>
  <p style="font-size: 1.1em; line-height: 1.9;">做这个博客的初衷其实特别简单：我想有个地方能 <strong>记录折腾的过程</strong>。那些深夜debug到怀疑人生的时刻，那些第一次跑通一个服务时的狂喜，那些踩过的坑、绕过的路——都值得被好好记下来。</p>
</div>

<h2 style="display: flex; align-items: center; gap: 0.5em;">🎯 这个博客主要写什么</h2>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1em; margin: 1.5em 0;">

<div style="background: linear-gradient(135deg, #e0e7ff, #f0f0ff); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">🖥️</p>
  <h3 style="margin: 0 0 0.3em; color: #4338ca;">服务器运维</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">VPS、Docker、反向代理、域名折腾……从一台服务器开始的无限可能</p>
</div>

<div style="background: linear-gradient(135deg, #f3e8ff, #fff0ff); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">🧩</p>
  <h3 style="margin: 0 0 0.3em; color: #7c3aed;">自建服务</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">n8n 自动化、个人网盘、博客系统、笔记系统……打造属于自己的数字王国</p>
</div>

<div style="background: linear-gradient(135deg, #ffedd5, #fff8f0); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">🔧</p>
  <h3 style="margin: 0 0 0.3em; color: #d97706;">踩坑日志</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">各种翻车现场和解决办法，帮助后来人少走弯路</p>
</div>

<div style="background: linear-gradient(135deg, #d1fae5, #f0fff4); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">🤖</p>
  <h3 style="margin: 0 0 0.3em; color: #059669;">AI & 自动化</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">AI Agent、工作流自动化、效率工具……让技术服务于生活</p>
</div>

<div style="background: linear-gradient(135deg, #fce7f3, #fff0f5); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">🌐</p>
  <h3 style="margin: 0 0 0.3em; color: #db2777;">网络与安全</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">网络配置、安全加固、防火墙……安全地折腾才是好折腾</p>
</div>

<div style="background: linear-gradient(135deg, #e0f2fe, #f0faff); border-radius: 12px; padding: 1.5em; text-align: center;">
  <p style="font-size: 2em; margin: 0 0 0.3em;">✨</p>
  <h3 style="margin: 0 0 0.3em; color: #0369a1;">其他有趣的东西</h3>
  <p style="margin: 0; font-size: 0.95em; color: #475569;">想到什么折腾什么，这里没有边界</p>
</div>

</div>

<h2 style="display: flex; align-items: center; gap: 0.5em;">🛠️ 目前正在折腾</h2>

<ul style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(168, 85, 247, 0.04)); border-radius: 12px; padding: 1.5em 2em; line-height: 2; font-size: 1.05em;">
  <li>🌍 <strong>香港 VPS</strong>（149.104.8.237）上的各种服务搭建</li>
  <li>⚡ <strong>n8n 工作流自动化</strong>——把重复的事情交给机器</li>
  <li>☁️ <strong>Cloudreve 个人云盘</strong>——集成阿里云 OSS，随身上网</li>
  <li>📝 <strong>Halo 博客系统</strong>——就是你正在看的这个网站 🎉</li>
  <li>🤖 <strong>AI Agent</strong>——探索 AI 赋能日常的各种可能性</li>
  <li>🔐 <strong>Cloudflare CDN + SSL 优化</strong>——让网站又快又安全</li>
</ul>

<h2 style="display: flex; align-items: center; gap: 0.5em;">📬 找到我</h2>

<div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(251, 191, 36, 0.02)); border-radius: 12px; padding: 1.5em 2em; margin: 1.5em 0;">
  <p style="margin: 0.5em 0; font-size: 1.05em;">📧 <strong>邮箱</strong>：13180105117@163.com</p>
  <p style="margin: 0.5em 0; font-size: 1.05em;">🌐 <strong>博客</strong>：<a href="https://blog.aklibk.com" style="color: #6366f1;">blog.aklibk.com</a></p>
  <p style="margin: 0.5em 0; font-size: 1.05em;">☁️ <strong>云盘</strong>：<a href="https://pan.aklibk.com" style="color: #6366f1;">pan.aklibk.com</a></p>
</div>

<hr style="border: none; border-top: 1px solid rgba(99, 102, 241, 0.2); margin: 2em 0;" />

<div style="text-align: center; color: #64748b; padding: 1em;">
  <p style="font-size: 1.2em; font-style: italic; margin: 0 0 0.5em;">「生命不息，折腾不止」</p>
  <p style="font-size: 0.95em; margin: 0;">感谢你来到我的小站，希望这里的内容对你有帮助 🐝</p>
</div>

</div>"""

# Build update payload - use current page data
update = {
    "page": page_data,
    "content": {
        "raw": rich_html,
        "content": rich_html,
        "rawType": "HTML",
    }
}

r = client.put(f"{base_url}/apis/api.console.halo.run/v1alpha1/singlepages/{name}",
               headers=headers, json=update)
print(f"PUT result: {r.status_code}")
if r.status_code == 200:
    print("✅ Content updated successfully!")
else:
    print(r.text[:500])
    exit(1)

# Publish
r = client.put(f"{base_url}/apis/api.console.halo.run/v1alpha1/singlepages/{name}/publish",
               headers=headers, params={"async": "false"})
print(f"Publish result: {r.status_code}")
if r.status_code == 200:
    print("✅ About page published successfully!")
else:
    print(r.text[:500])

client.close()
