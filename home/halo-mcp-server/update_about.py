#!/usr/bin/env python3
"""Update the About single page in Halo"""
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

# Step 1: Get current page via content API (read-only)
r = client.get(f"{base_url}/apis/content.halo.run/v1alpha1/singlepages/{name}", headers=headers)
if r.status_code != 200:
    print(f"ERROR getting page: {r.status_code} {r.text[:200]}")
    exit(1)

page = r.json()
print(f"Current page: {page.get('spec',{}).get('title','?')}")
print(f"Current slug: {page.get('spec',{}).get('slug','?')}")
print(f"Head snapshot: {page.get('spec',{}).get('headSnapshot','?')}")

# Step 2: Get the content from the head snapshot
# Snapshots live under /apis/content.halo.run/v1alpha1/snapshots
snapshot_name = page.get("spec", {}).get("headSnapshot", "")
r = client.get(f"{base_url}/apis/content.halo.run/v1alpha1/snapshots/{snapshot_name}", headers=headers)
print(f"\nSnapshot GET: {r.status_code}")
if r.status_code == 200:
    snap = r.json()
    print(f"  rawType: {snap.get('spec',{}).get('rawType','?')}")
    raw = snap.get("spec", {}).get("rawPatch", "")
    print(f"  rawPatch length: {len(raw)}")
    print(f"  rawPatch preview: {raw[:200] if raw else '(empty)'}")
else:
    print(f"  {r.text[:300]}")

# Step 3: Update the page via console API  
# Create a content snapshot first
# In Halo 2.x, updating content requires creating a new snapshot,
# which is done through the draft API

# Let me try the console API PUT with updated metadata
# First get the full page via console API
r = client.get(f"{base_url}/apis/api.console.halo.run/v1alpha1/singlepages", headers=headers)
if r.status_code != 200:
    print(f"ERROR: {r.status_code} {r.text[:200]}")
    exit(1)

console_data = r.json()
for item in console_data.get("items", []):
    meta = item.get("page", {}).get("metadata", {})
    if meta.get("name") == name:
        page_full = item.get("page", {})
        print(f"\nConsole API page title: {page_full.get('spec',{}).get('title','?')}")
        print(f"Version: {page_full.get('metadata',{}).get('version','?')}")
        
        # Update the title
        page_full["spec"]["title"] = "关于空缺 | 生命不息，折腾不止"
        page_full["spec"]["slug"] = "about"
        page_full["metadata"]["version"] = meta.get("version", 1)
        
        # Use unique name to avoid conflict
        new_name = f"about-page-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create update payload
        update_payload = {
            "page": page_full,
            "content": {
                "raw": "<h1>内容占位</h1>",
                "content": "<h1>内容占位</h1>",
                "rawType": "HTML"
            }
        }
        
        # PUT to update
        r2 = client.put(f"{base_url}/apis/api.console.halo.run/v1alpha1/singlepages/{name}", 
                       headers=headers, 
                       json=update_payload)
        print(f"\nPUT result: {r2.status_code}")
        print(r2.text[:500])
        break

client.close()
