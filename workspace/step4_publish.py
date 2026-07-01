import json, urllib.request, os
from datetime import datetime

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

headers = {
    "Authorization": f"Bearer {token_val}",
    "User-Agent": "Mozilla/5.0 (compatible)",
    "Content-Type": "application/json"
}

slug = "cursor-api-guide"
snapshot_id = "9fd5a294-fb72-4f6a-9274-4626895e5dfe"

req = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{slug}",
    headers=headers
)
resp = urllib.request.urlopen(req)
post = json.loads(resp.read().decode())
print(f"Current phase: {post.get('status', {}).get('phase')}")

now = datetime.now()
post["spec"]["baseSnapshot"] = snapshot_id
post["spec"]["headSnapshot"] = snapshot_id
post["spec"]["releaseSnapshot"] = snapshot_id
post["spec"]["publish"] = True

with open("/opt/data/workspace/cursor-tutorial.html") as f:
    html_content = f.read()

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
post["metadata"]["annotations"]["content.halo.run/last-released-snapshot"] = f"snapshot-{slug}-{now.strftime('%Y%m%d')}"

post.pop("status", None)

req2 = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{slug}",
    data=json.dumps(post).encode(),
    headers=headers,
    method="PUT"
)
try:
    resp2 = urllib.request.urlopen(req2)
    final = json.loads(resp2.read().decode())
    phase = final.get("status", {}).get("phase")
    print(f"Published! Phase: {phase}")
    print(f"URL: {base_url}/archives/{slug}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERROR {e.code}: {body[:1000]}")
