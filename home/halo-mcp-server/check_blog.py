#!/usr/bin/env python3
"""Check blog structure: menus, pages, theme config"""
import os, json, httpx

base_url = os.environ.get("HALO_BASE_URL", "https://blog.aklibk.com")
token = os.environ.get("HALO_TOKEN", "")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

client = httpx.Client(verify=False, timeout=30)

print("=" * 60)
print("检查菜单结构")
print("=" * 60)

# List menus
r = client.get(f"{base_url}/apis/api.halo.run/v1alpha1/menus", headers=headers)
print(f"📋 菜单 GET {r.status_code}:")
data = r.json()
print(json.dumps(data, ensure_ascii=False, indent=2)[:2000])

# Check themes
r = client.get(f"{base_url}/apis/api.halo.run/v1alpha1/themes", headers=headers)
print(f"\n🎨 主题列表 ({r.status_code}):")
print(json.dumps(r.json(), ensure_ascii=False, indent=2)[:500])

# Check menu items
r = client.get(f"{base_url}/apis/api.halo.run/v1alpha1/menuItems", headers=headers)
print(f"\n🔗 菜单项 ({r.status_code}):")
print(json.dumps(r.json(), ensure_ascii=False, indent=2)[:500])

client.close()
