# Halo 2.x Content Creation via Direct API

Halo 2.x stores post content in **Snapshot** resources, not directly in the post's `htmlContent` field. The post references its content via three snapshot fields: `baseSnapshot`, `headSnapshot`, and `releaseSnapshot`.

## Complete Workflow

### Step 1: Create the Snapshot (stores actual content)

```python
import uuid, json
from datetime import datetime, timezone

snapshot_id = str(uuid.uuid4())
html_content = "<div>...</div>"  # Your full HTML

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
        "owner": "wufeng",                           # MUST match admin username
        "contributors": ["wufeng"],
        "lastModifyTime": datetime.now(timezone.utc).isoformat(),
        "parentSnapshotName": "",
        "subjectRef": {
            "group": "content.halo.run",
            "kind": "Post",
            "name": slug,                            # post name (slug)
            "version": "v1alpha1"
        }
    }
}

# POST /apis/content.halo.run/v1alpha1/snapshots
```

### Step 2: Create the Post (shell only)

Use the console API to create the post structure. Set `publish: True` and include the content-json annotation.

```python
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
            "title": "Post Title",
            "slug": slug,
            "publish": True,
            "visible": "PUBLIC",
            "allowComment": True,
            "tags": ["tag1", "tag2"],
            "htmlContent": html_content,
            "baseSnapshot": slug  # temporary, will be replaced
        }
    },
    "owner": {"displayName": "空缺", "name": "wufeng", "avatar": ""}
}

# POST /apis/api.console.halo.run/v1alpha1/posts
```

### Step 3: Link Post to Snapshot (critical — this is what makes content visible)

```python
# GET /apis/content.halo.run/v1alpha1/posts/{slug}
post = response.json()

post['spec']['baseSnapshot'] = snapshot_id
post['spec']['headSnapshot'] = snapshot_id
post['spec']['releaseSnapshot'] = snapshot_id

# Also set proper labels
from datetime import datetime
now = datetime.now()
post['metadata']['labels'] = {
    "content.halo.run/published": "true",
    "content.halo.run/deleted": "false",
    "content.halo.run/owner": "wufeng",
    "content.halo.run/visible": "PUBLIC",
    "content.halo.run/archive-year": str(now.year),
    "content.halo.run/archive-month": f"{now.month:02d}",
    "content.halo.run/archive-day": f"{now.day:02d}"
}

# Add missing annotations
post['metadata']['annotations']['content.halo.run/stats'] = '{"upvotes":0,"downvotes":0,"visits":0}'
post['metadata']['annotations']['content.halo.run/last-released-snapshot'] = snapshot_id

# PUT /apis/content.halo.run/v1alpha1/posts/{slug}
```

## Why This Matters

Without the Snapshot link, the post will:
- Show in the console listing
- Have the correct title and metadata
- **NOT show any content** — the body will be empty (0 chars)
- Return 404 when accessed publicly (no releaseSnapshot → no content to render)

## Critical: Console API publish=True does NOT trigger full publish

A key discovery: even when you create a post via the Console API with `publish: True`, Halo's publishing state machine does NOT fully process it. The spec shows `publish: True` but the label `content.halo.run/published` remains `"false"`, permalink stays `None`, and archive labels are never generated.

The `/publish` endpoint (`PUT /apis/api.console.halo.run/v1alpha1/posts/{name}/publish`) also does **not** work reliably — it returns 404 or times out.

**The only reliable publish workflow is to directly set the labels and snapshot links via the Content API**, as documented in Step 3.

The console API's publish endpoint (`PUT .../publish`) doesn't work reliably via PAT tokens (times out at 15s+). The direct Snapshot approach always works.

## Alternative: Direct Status Injection (Simple Posts)

For markdown posts where the Snapshot workflow is overkill, create directly via Content API with the `status` block:

```python
payload = json.dumps({
    'spec': {
        'title': 'Title', 'slug': 'slug', 'publish': True,
        'headSnapshot': md, 'baseSnapshot': md, 'releaseSnapshot': md,
        'publishTime': '2026-06-27T20:00:00Z', 'allowComment': True,
        'deleted': False, 'excerpt': {'autoGenerate': True},
        'pinned': False, 'priority': 0, 'visible': 'PUBLIC', 'owner': 'wufeng'
    },
    'status': {
        'phase': 'PUBLISHED',
        'conditions': [{'type':'PUBLISHED','status':'TRUE','reason':'Published'}],
        'contributors': ['wufeng'], 'permalink': '/archives/slug',
        'hideFromList': False, 'inProgress': False, 'observedVersion': 1
    },
    'apiVersion': 'content.halo.run/v1alpha1', 'kind': 'Post',
    'metadata': {
        'name': 'slug',
        'annotations': {'content.halo.run/content-json': 'true'},
        'labels': {'content.halo.run/owner': 'wufeng'}
    }
}).encode()
```

**Caveat**: Sets phase=PUBLISHED but the reconciler may not process it. Post shows in console but public URL may 404. Snapshot workflow is more reliable.

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Only setting `htmlContent` in spec | Content field returns empty | Create Snapshot + link it |
| Setting `publish=True` without Snapshot | Post exists but returns 404 publicly | Add releaseSnapshot |
| Missing archive labels | Permalink = None | Add archive-year/month/day labels |
| Missing content-json annotation | Theme can't render rich content | Add annotation in metadata |
| Console API publish=True but labels not set | spec says published, label says not | Direct Content API PUT to set labels

## Full Python Pattern

```python
import urllib.request, json, uuid, os
from datetime import datetime

os.chdir('/path/to/halo-mcp-server')
with open('.env') as f:
    for line in f:
        k, v = line.strip().split('=', 1)
        os.environ[k] = v

base = os.environ['HALO_BASE_URL']
token = os.environ['HALO_TOKEN']
headers = {"Authorization": f"Bearer {token}", "User-Agent": "HaloBot/1.0"}

# Variables
slug = "my-post-slug"
html = "<h1>Hello</h1>"

# 1) Create snapshot
snap_id = str(uuid.uuid4())
snap = {
    "apiVersion": "content.halo.run/v1alpha1", "kind": "Snapshot",
    "metadata": {"name": snap_id, "annotations": {"content.halo.run/keep-raw": "true"}},
    "spec": {
        "contentPatch": html, "rawPatch": html, "rawType": "HTML",
        "owner": "wufeng", "contributors": ["wufeng"],
        "lastModifyTime": datetime.now().isoformat(), "parentSnapshotName": "",
        "subjectRef": {"group": "content.halo.run", "kind": "Post", "name": slug, "version": "v1alpha1"}
    }
}
req = urllib.request.Request(f"{base}/apis/content.halo.run/v1alpha1/snapshots",
    data=json.dumps(snap).encode(), headers=headers, method="POST")
urllib.request.urlopen(req)

# 2) Create post
content_json = json.dumps({"raw": html, "rendered": html})
post_data = {
    "post": {
        "apiVersion": "content.halo.run/v1alpha1", "kind": "Post",
        "metadata": {"name": slug, "annotations": {"content.halo.run/content-json": content_json}},
        "spec": {
            "title": "Title", "slug": slug, "publish": True,
            "visible": "PUBLIC", "allowComment": True,
            "tags": [], "htmlContent": html, "baseSnapshot": slug
        }
    },
    "owner": {"displayName": "空缺", "name": "wufeng", "avatar": ""}
}
req = urllib.request.Request(f"{base}/apis/api.console.halo.run/v1alpha1/posts",
    data=json.dumps(post_data).encode(), headers=headers, method="POST")
urllib.request.urlopen(req)

# 3) Link snapshot
req = urllib.request.Request(f"{base}/apis/content.halo.run/v1alpha1/posts/{slug}", headers=headers)
post = json.loads(urllib.request.urlopen(req).read())
now = datetime.now()
post['spec']['baseSnapshot'] = snap_id
post['spec']['headSnapshot'] = snap_id
post['spec']['releaseSnapshot'] = snap_id
post['metadata']['labels'] = {
    "content.halo.run/published": "true", "content.halo.run/deleted": "false",
    "content.halo.run/owner": "wufeng", "content.halo.run/visible": "PUBLIC",
    "content.halo.run/archive-year": str(now.year),
    "content.halo.run/archive-month": f"{now.month:02d}",
    "content.halo.run/archive-day": f"{now.day:02d}"
}
post['metadata']['annotations']['content.halo.run/stats'] = '{"upvotes":0,"downvotes":0,"visits":0}'
post['metadata']['annotations']['content.halo.run/last-released-snapshot'] = snap_id
req = urllib.request.Request(f"{base}/apis/content.halo.run/v1alpha1/posts/{slug}",
    data=json.dumps(post).encode(), headers=headers, method="PUT")
urllib.request.urlopen(req)
```
