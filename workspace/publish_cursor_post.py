import json, urllib.request, uuid, time, os
from datetime import datetime, timezone

# Read token from .env file
env_path = os.path.expanduser("~/halo-mcp-server/.env")
with open(env_path) as f:
    env_data = f.read()

token = None
url = None
for line in env_data.splitlines():
    if line.startswith("HALO_TOKEN="):
        token = line.split("=", 1)[1].strip()
    elif line.startswith("HALO_BASE_URL="):
        url = line.split("=", 1)[1].strip()

if not token or not url:
    print("ERROR: Token or base URL not found")
    exit(1)

print(f"Token length: {len(token)}, starts with: {token[:12]}")
print(f"Base URL: {url}")

headers = {
    "Authorization": f"Bearer {token}",
    "User-Agent": "Mozilla/5.0 (compatible)",
    "Content-Type": "application/json"
}

# Read HTML content from file
with open("/opt/data/workspace/cursor-tutorial.html") as f:
    html_content = f.read()

slug = "cursor-api-guide"

# Step 1: Create draft via Console API
print("\n=== Step 1: Creating draft ===")

post_data = {
    "post": {
        "apiVersion": "content.halo.run/v1alpha1",
        "kind": "Post",
        "metadata": {
            "name": slug,
            "annotations": {
                "content.halo.run/content-json": json.dumps({
                    "raw": html_content,
                    "rendered": html_content
                })
            }
        },
        "spec": {
            "title": "Cursor 免费续杯！用自己的 API Key 替代官方订阅，省掉 $20/月",
            "slug": slug,
            "publish": False,
            "visible": "PUBLIC",
            "allowComment": True,
            "deleted": False,
            "pinned": False,
            "priority": 0,
            "excerpt": {"autoGenerate": True, "raw": ""},
            "htmlContent": html_content,
            "tags": ["Cursor", "API中转", "AI编程"],
            "categories": ["AI教程"]
        }
    },
    "owner": {
        "displayName": "wufeng",
        "name": "wufeng",
        "avatar": ""
    }
}

req = urllib.request.Request(
    f"{url}/apis/api.console.halo.run/v1alpha1/posts",
    data=json.dumps(post_data).encode(),
    headers=headers,
    method="POST"
)

resp = urllib.request.urlopen(req)
result = json.loads(resp.read().decode())
post_name = result.get("metadata", {}).get("name", slug)
print(f"Draft created: {post_name}, status: {resp.status}")

# Step 2: Create snapshot
print("\n=== Step 2: Creating snapshot ===")
snapshot_id = str(uuid.uuid4())
now = datetime.now(timezone.utc)

snapshot_data = {
    "apiVersion": "content.halo.run/v1alpha1",
    "kind": "Snapshot",
    "metadata": {
        "name": snapshot_id,
        "annotations": {"content.halo.run/keep-raw": "true"}
    },
    "spec": {
        "contentPatch": html_content,
        "rawPatch": html_content,
        "rawType": "HTML",
        "owner": "wufeng",
        "contributors": ["wufeng"],
        "lastModifyTime": now.isoformat(),
        "parentSnapshotName": "",
        "subjectRef": {
            "group": "content.halo.run",
            "kind": "Post",
            "name": post_name,
            "version": "v1alpha1"
        }
    }
}

req2 = urllib.request.Request(
    f"{url}/apis/content.halo.run/v1alpha1/snapshots",
    data=json.dumps(snapshot_data).encode(),
    headers=headers,
    method="POST"
)
try:
    resp2 = urllib.request.urlopen(req2)
    print(f"Snapshot created: {snapshot_id}, status: {resp2.status}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"POST snapshot error {e.code}: {body[:300]}")
    # Try PUT instead
    req2 = urllib.request.Request(
        f"{url}/apis/content.halo.run/v1alpha1/snapshots/{snapshot_id}",
        data=json.dumps(snapshot_data).encode(),
        headers=headers,
        method="PUT"
    )
    resp2 = urllib.request.urlopen(req2)
    print(f"Snapshot created via PUT: {snapshot_id}, status: {resp2.status}")

# Step 3: Get current post state
print("\n=== Step 3: Getting post state ===")
req3 = urllib.request.Request(
    f"{url}/apis/content.halo.run/v1alpha1/posts/{post_name}",
    headers=headers
)
resp3 = urllib.request.urlopen(req3)
post = json.loads(resp3.read().decode())
print(f"Got post, current phase: {post.get('status', {}).get('phase', 'none')}")

# Step 4: Publish via Content API
print("\n=== Step 4: Publishing ===")
now = datetime.now()
post["spec"]["baseSnapshot"] = snapshot_id
post["spec"]["headSnapshot"] = snapshot_id
post["spec"]["releaseSnapshot"] = snapshot_id
post["spec"]["publish"] = True
post["metadata"]["labels"] = {
    "content.halo.run/published": "true",
    "content.halo.run/deleted": "false",
    "content.halo.run/owner": "wufeng",
    "content.halo.run/visible": "PUBLIC",
    "content.halo.run/archive-year": str(now.year),
    "content.halo.run/archive-month": f"{now.month:02d}",
    "content.halo.run/archive-day": f"{now.day:02d}",
}
post["metadata"]["annotations"]["content.halo.run/stats"] = '{"upvotes":0,"downvotes":0,"visits":0}'
post["metadata"]["annotations"]["content.halo.run/content-json"] = json.dumps({
    "raw": html_content, "rendered": html_content
})

req4 = urllib.request.Request(
    f"{url}/apis/content.halo.run/v1alpha1/posts/{post_name}",
    data=json.dumps(post).encode(),
    headers=headers,
    method="PUT"
)
resp4 = urllib.request.urlopen(req4)
final = json.loads(resp4.read().decode())
phase = final.get("status", {}).get("phase", "unknown")
print(f"Published! Phase: {phase}")

# Step 5: Verify
print("\n=== Step 5: Verify ===")
time.sleep(2)
req5 = urllib.request.Request(
    f"{url}/apis/content.halo.run/v1alpha1/posts/{post_name}",
    headers=headers
)
resp5 = urllib.request.urlopen(req5)
final2 = json.loads(resp5.read().decode())
p = final2.get("status", {}).get("phase", "unknown")
labels = final2.get("metadata", {}).get("labels", {})
print(f"Phase: {p}")
print(f"Published label: {labels.get('content.halo.run/published')}")
print(f"Public URL: {url}/archives/{slug}")
print("\n=== DONE ===")
