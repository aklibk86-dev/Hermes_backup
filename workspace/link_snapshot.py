import json, urllib.request, os

env_path = os.path.expanduser("~/halo-mcp-server/.env")
with open(env_path) as f:
    lines = f.read().splitlines()

token_val = None
base_url = None
for line in lines:
    if "HALO_TOKEN=" in line:
        token_val = line.split("=", 1)[1].strip()
    if "HALO_BASE_URL=" in line:
        base_url = line.split("=", 1)[1].strip()

headers = {
    "Authorization": f"Bearer {token_val}",
    "User-Agent": "Mozilla/5.0 (compatible)",
    "Content-Type": "application/json"
}

slug = "lobechat-deploy-guide"
snap = "364d299d-3e3b-4ebf-83d8-705789cabe7a"

req = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{slug}",
    headers=headers
)
post = json.loads(urllib.request.urlopen(req).read().decode())
print(f"Current phase: {post.get('status', {}).get('phase')}")

post["spec"]["baseSnapshot"] = snap
post["spec"]["headSnapshot"] = snap
post.pop("status", None)

req2 = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{slug}",
    data=json.dumps(post).encode(),
    headers=headers,
    method="PUT"
)
try:
    resp2 = urllib.request.urlopen(req2)
    print("Snapshot linked OK")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Error {e.code}: {body[:500]}")
