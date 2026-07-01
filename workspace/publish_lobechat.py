import json, urllib.request, os, uuid
from datetime import datetime, timezone

# Read token from .env file
env_path = os.path.expanduser("~/halo-mcp-server/.env")
with open(env_path) as f:
    env_data = f.read()

token_val = None
base_url = None
for line in env_data.splitlines():
    if "HALO_TOKEN=" in line:
        token_val = line.split("=", 1)[1].strip()
    elif "HALO_BASE_URL=" in line:
        base_url = line.split("=", 1)[1].strip()

if not token_val or not base_url:
    print("ERROR: Token or base URL not found")
    exit(1)

headers = {
    "Authorization": f"Bearer {token_val}",
    "User-Agent": "Mozilla/5.0 (compatible)",
    "Content-Type": "application/json"
}

# Read HTML content
with open("/opt/data/workspace/lobechat-tutorial.html") as f:
    html_content = f.read()

slug = "lobechat-deploy-guide"

print("=== Creating LobeChat tutorial draft ===")

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
            "title": "3 分钟部署自己的 LobeChat，支持 GPT/Claude/DeepSeek 全部模型",
            "slug": slug,
            "publish": False,
            "visible": "PUBLIC",
            "allowComment": True,
            "deleted": False,
            "pinned": False,
            "priority": 0,
            "excerpt": {"autoGenerate": True, "raw": ""},
            "htmlContent": html_content,
            "tags": ["LobeChat", "API中转", "AI客户端", "Docker部署"],
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
    f"{base_url}/apis/api.console.halo.run/v1alpha1/posts",
    data=json.dumps(post_data).encode(),
    headers=headers,
    method="POST"
)

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    post_name = result.get("metadata", {}).get("name", slug)
    print(f"Draft created: {post_name}")
    print(f"Title: {result.get('spec', {}).get('title')}")
    print(f"Status: DRAFT")
    print(f"Edit URL: {base_url}/console/posts/{post_name}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERROR {e.code}: {body[:1000]}")
    exit(1)

# Also create the snapshot so when user wants to publish, it's ready
print("\n=== Creating snapshot ===")
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
    f"{base_url}/apis/content.halo.run/v1alpha1/snapshots",
    data=json.dumps(snapshot_data).encode(),
    headers=headers,
    method="POST"
)
try:
    resp2 = urllib.request.urlopen(req2)
    print(f"Snapshot created: {snapshot_id}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Snapshot POST error {e.code}: {body[:300]}")
    # Try PUT
    req2 = urllib.request.Request(
        f"{base_url}/apis/content.halo.run/v1alpha1/snapshots/{snapshot_id}",
        data=json.dumps(snapshot_data).encode(),
        headers=headers,
        method="PUT"
    )
    resp2 = urllib.request.urlopen(req2)
    print(f"Snapshot created via PUT: {snapshot_id}")

# Also link the snapshot so it's fully ready to publish
print("\n=== Linking snapshot to post ===")
req3 = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{post_name}",
    headers=headers
)
resp3 = urllib.request.urlopen(req3)
post = json.loads(resp3.read().decode())

post["spec"]["baseSnapshot"] = snapshot_id
post["spec"]["headSnapshot"] = snapshot_id
post.pop("status", None)

req4 = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{post_name}",
    data=json.dumps(post).encode(),
    headers=headers,
    method="PUT"
)
resp4 = urllib.request.urlopen(req4)
print(f"Snapshot linked. Ready to publish.")

print(f"\n=== Post ready as DRAFT ===")
print(f"URL: {base_url}/archives/{slug}")
print(f"Just say '发布' when you want it live.")
