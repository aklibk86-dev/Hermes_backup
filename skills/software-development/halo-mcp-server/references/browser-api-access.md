# Browser Console API Access (Cloudflare Bypass)

When Cloudflare blocks external curl/python API calls (error 1010), use the browser's JavaScript console as a fallback. The browser already has auth cookies from logging into the admin console, so fetch calls work without needing to pass the PAT.

## Prerequisites
- Logged into `https://blog.example.com/console` as admin
- Browser DevTools console open

## Finding a Post's Metadata Name

From the posts list page (`/console/posts`), find the editor URL for any article:

```js
document.querySelector('a[href*="openclaw"]')?.href
// → "https://blog.example.com/console/posts/editor?name=openclaw-local-deploy-guide"
```

The `name` query parameter is the post's `metadata.name` (its slug).

## Reading Post Content via API

```js
(async () => {
  var r = await fetch('/apis/api.console.halo.run/v1alpha1/posts?page=0&size=20&sort=publishTime,desc');
  var d = await r.json();
  window._postData = d; // store globally for inspection
  console.log('Total:', d.total);
  d.items.forEach(i => console.log(i.post.metadata.name, i.post.spec.title));
})();
```

## Inspecting Stored Data

```js
// Check keys
Object.keys(window._postData);

// List all post names + titles
window._postData.items.forEach(i =>
  console.log(i.post.metadata.name, i.post.spec.title)
);

// Get specific post detail
(async () => {
  var r = await fetch('/apis/api.console.halo.run/v1alpha1/posts/post-name');
  var d = await r.json();
  console.log(d.post.spec.title, d.post.status.phase);
})();
```

## Reading Post Draft Content (Snapshot)

```js
(async () => {
  var r = await fetch('/apis/content.halo.run/v1alpha1/snapshots/snapshot-uuid');
  var d = await r.json();
  console.log(d.spec.rawPatch); // the HTML content
})();
```

## Common Issues

### API returns 404
Check that the API version is `v1alpha1`, not `v1`. Halo 2.x console API endpoints live under:
- `/apis/api.console.halo.run/v1alpha1/posts` — ✅ correct
- `/apis/api.console.halo.run/v1/posts` — ❌ 404 (wrong version)

### No output from fetch
Console.log inside async functions may be silently swallowed. Store the result in a global variable first, then inspect it in a separate expression. Use `window._var = result` pattern instead of `console.log`.

### Content API vs Console API endpoint versions
The Halo 2.x content API lives under `/apis/content.halo.run/v1alpha1/` — this is for raw CRUD on resources (posts, snapshots, single pages). Use it when:
- Creating/updating snapshots with full HTML content
- Hard-deleting posts (bypass recycle bin)
- Directly setting labels and annotations

The console API at `/apis/api.console.halo.run/v1alpha1/` is for the admin UI workflows (list, create draft, publish). Prefer it for initial creation as it sets owner/contributor correctly.

### Snapshot content inspection
When a post's editor won't load, check if the snapshot contains valid HTML:
```js
(async () => {
  var r = await fetch('/apis/content.halo.run/v1alpha1/posts/post-name');
  var p = await r.json();
  var snapName = p.spec.headSnapshot;
  if (!/^[0-9a-f-]{36}$/.test(snapName)) {
    console.log('headSnapshot is NOT a UUID — stored as raw content, editor will crash');
    console.log('Preview:', snapName?.substring(0, 200));
  } else {
    var r2 = await fetch('/apis/content.halo.run/v1alpha1/snapshots/' + snapName);
    var s = await r2.json();
    console.log('Snapshot rawType:', s.spec.rawType);
    console.log('Content preview:', s.spec.rawPatch?.substring(0, 300));
  }
})();
```

### Page returns empty snapshot
The SPA content loads asynchronously. Navigate to the target page first, wait 2-3 seconds, then inspect the DOM.
