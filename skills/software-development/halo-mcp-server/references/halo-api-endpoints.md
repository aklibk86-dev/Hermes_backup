# Halo API Endpoint Reference (v2.25.x)

Base URL pattern: `https://{blog-domain}/apis/{group}/{version}/{resource}`

## Authentication

All endpoints use `Authorization: Bearer {pat_token}` header.

## Content API (Core REST — full CRUD, works with PAT)

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| GET | `/content.halo.run/v1alpha1/posts` | List all posts (published) |
| GET | `/content.halo.run/v1alpha1/posts/{name}` | Get post detail |
| PUT | `/content.halo.run/v1alpha1/posts/{name}` | Update/fix post metadata |
| DELETE | `/content.halo.run/v1alpha1/posts/{name}` | Hard-delete post (permanent) |
| GET | `/content.halo.run/v1alpha1/singlepages` | List single pages |
| GET | `/content.halo.run/v1alpha1/singlepages/{name}` | Get single page detail |
| PUT | `/content.halo.run/v1alpha1/singlepages/{name}` | Update single page |
| DELETE | `/content.halo.run/v1alpha1/singlepages/{name}` | Hard-delete single page |
| GET | `/content.halo.run/v1alpha1/snapshots/{name}` | Get snapshot content (rawPatch = HTML content) |
| **POST** | `/content.halo.run/v1alpha1/snapshots` | **Create snapshot (stores actual article content)** |
| **PUT** | `/content.halo.run/v1alpha1/snapshots/{name}` | **Update/create snapshot** |
| GET | `/content.halo.run/v1alpha1/categories` | List categories |
| GET | `/content.halo.run/v1alpha1/tags` | List tags |

### Snapshot Spec Fields

The snapshot resource requires these fields in `spec`:

| Field | Type | Description |
|:------|:-----|:------------|
| `contentPatch` | string | Rendered HTML content (the article body) |
| `rawPatch` | string | Raw content (same as contentPatch for HTML type) |
| `rawType` | string | `"HTML"` or `"markdown"` |
| `owner` | string | Username (e.g. `"wufeng"`) |
| `contributors` | string[] | Array with owner username |
| `parentSnapshotName` | string | Empty string `""` for new posts |
| `lastModifyTime` | string | ISO 8601 datetime |
| `subjectRef` | object | Reference to parent post |

`subjectRef` structure:
```json
{
  "group": "content.halo.run",
  "kind": "Post",
  "name": "post-slug-name",
  "version": "v1alpha1"
}
```

## Console API (Admin operations)

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| GET | `/api.console.halo.run/v1alpha1/posts` | List posts (full detail) |
| POST | `/api.console.halo.run/v1alpha1/posts` | Create post (sets owner + contributor) |
| PUT | `/api.console.halo.run/v1alpha1/posts/{name}/publish?async=false` | Publish post (may not work reliably on Halo 2.25.3) |
| GET | `/api.console.halo.run/v1alpha1/singlepages` | List single pages (returns `{page, content}` structure) |
| PUT | `/api.console.halo.run/v1alpha1/singlepages/{name}` | Update single page (requires `{page, content}` payload) |
| PUT | `/api.console.halo.run/v1alpha1/singlepages/{name}/publish?async=false` | Publish single page |
| GET | `/api.console.halo.run/v1alpha1/stats` | Dashboard stats (posts, comments, visits) |

## UC API (User Center — per-user operations)

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| GET | `/uc.api.content.halo.run/v1alpha1/posts` | List current user's posts |
| PUT | `/uc.api.content.halo.run/v1alpha1/posts/{name}` | Update post metadata |
| PUT | `/uc.api.content.halo.run/v1alpha1/posts/{name}/draft?patched=false` | Get/update post draft (content) |

## Menu API

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| GET | `/api.halo.run/v1alpha1/menus/-` | Get primary menu (returns embedded menuItems array) |

Menu items are **embedded** in the menu resource itself, not a separate list. The menu is identified by the `-` placeholder (single menu instance).
