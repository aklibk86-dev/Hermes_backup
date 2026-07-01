import json, urllib.request, os

env_path = os.path.expanduser("~/halo-mcp-server/.env")
with open(env_path) as f:
    lines = f.read().splitlines()

token_val = None
base_url = None
for line in lines:
    key = "HALO_TOKEN="
    if key in line:
        token_val = line.split("=", 1)[1].strip()
    key2 = "HALO_BASE_URL="
    if key2 in line:
        base_url = line.split("=", 1)[1].strip()

headers = {
    "Authorization": f"Bearer {token_val}",
    "User-Agent": "Mozilla/5.0 (compatible)",
    "Content-Type": "application/json"
}

slug = "cursor-api-guide"

req = urllib.request.Request(
    f"{base_url}/apis/content.halo.run/v1alpha1/posts/{slug}",
    headers=headers
)
resp = urllib.request.urlopen(req)
post = json.loads(resp.read().decode())
phase = post.get("status", {}).get("phase")
labels = post.get("metadata", {}).get("labels", {})
print(f"Phase: {phase}")
print(f"Labels: {labels}")
print(f"Published label: {labels.get('content.halo.run/published')}")
rs = post.get("spec", {}).get("releaseSnapshot")
print(f"releaseSnapshot: {rs}")
print(f"baseSnapshot: {post.get('spec', {}).get('baseSnapshot')}")

# Check public URL
import ssl
ctx = ssl.create_default_context()
public_req = urllib.request.Request(
    f"{base_url}/archives/{slug}",
    headers={"User-Agent": "Mozilla/5.0 (compatible)"}
)
try:
    public_resp = urllib.request.urlopen(public_req, context=ctx)
    body = public_resp.read().decode()
    contains_article = ("cursor" in body.lower()) or ("API Key" in body)
    print(f"Public URL status: {public_resp.status}")
    print(f"Contains article content: {contains_article}")
    print(f"Page length: {len(body)} chars")
    print(f"First 200 chars: {body[:200]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Public URL error: {e.code}")
    print(f"Body: {body[:300]}")
