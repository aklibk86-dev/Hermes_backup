# SPA API Route Discovery via Browser Fetch Interception

## When to Use

The web app's API routes are **obfuscated/hashed/dynamically-constructed** and standard paths (`/api/v3/user/session`, `/api/v4/...`) all return 404. The frontend still talks to the backend successfully — you just can't guess the paths.

Common scenario: **Cloudreve v4+** (compiled Go frontend with hashed routes), but any SPA that minifies route strings qualifies.

## Technique

### 1. Navigate to the page and install a fetch interceptor

From the browser console (use `browser_console` with `expression`):

```js
const origFetch = window.fetch;
window.fetch = function(...args) {
  console.log('NET_REQ:', JSON.stringify({url: args[0], method: args[1]?.method, body: args[1]?.body?.substring(0,200)}));
  return origFetch.apply(this, args).then(async r => {
    const text = await r.clone().text();
    console.log('NET_RES:', JSON.stringify({url: args[0], status: r.status, body: text.substring(0,300)}));
    return r;
  });
};
"Interceptor installed"
```

### 2. Trigger the action in the browser UI

Use `browser_type`, `browser_click` normally — the interceptor logs every fetch call the app makes, including hidden routes.

### 3. Read the captured network calls

Call `browser_console()` (no expression) to see all NET_REQ / NET_RES entries. The `url` field shows the exact obfuscated endpoint.

### 4. (Alternative) Probe the JS bundle for route fragments

If routes are dynamically concatenated from string fragments:

```bash
curl -s -k 'https://<host>/assets/index-<hash>.js' | grep -oP '"[a-z]+/[a-z]+(?:/[a-z]+)*"' | sort -u
```

Common fragments found in Cloudreve v4 JS bundles:
- `"oauth/new"`
- `"policy/oauth"`

These get combined with the API base (`/api/v4/`) at runtime.

## Real Example: Cloudreve v4 Login

- API base path: `/api/v4/` (found in JS: `const fN=["v1","v2","v3"],pN=["v4"]`)
- Login flow is TWO-STEP (email → password)
- The actual login API endpoint is dynamically resolved from route fragments — not directly `<base>/user/session`
- Direct curl calls to `/api/v4/user/session`, `/api/v4/user/login`, `/api/v4/admin/login` all return 404
- Reliable way to discover: install fetch interceptor → click Sign in → read the NET_REQ output

## Pitfalls

- **Don't break fetch twice**: if you install the interceptor and later try `window.fetch = window.origFetch`, make sure `origFetch` isn't scoped away. Use a fresh page load to reset.
- **Some apps use XMLHttpRequest, not fetch**: if the interceptor logs nothing, the app uses XHR — intercept `XMLHttpRequest.prototype.open` instead.
- **React strict mode may double-fire** requests; dedupe by URL.
- **The interceptor blocks if the app uses `fetch` before your override runs** — load the page fresh, inject the interceptor immediately, then interact.
