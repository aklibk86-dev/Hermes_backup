# Halo 2.x SEO Configuration

SEO for Halo 2.x blog has multiple layers. This reference covers all of them.

## 1. Halo Admin Console — Basic SEO Settings

Navigate: **Console → Settings → Basic** (or directly `https://<domain>/console/settings`)

Configure these fields:

| Field | What to set | Example |
|-------|-------------|---------|
| Site title | Brand + keyword-rich description | `空缺的BLOG — API 中转站配置与 AI 集成教程` |
| Subtitle | Tagline | `自建服务 · API 中转 · AI 集成 · 运维笔记` |
| Site description | SEO meta description (150-160 chars) | `提供 AI 集成指南、API 中转站配置教程、自建服务部署经验，涵盖 ChatBox/Cursor/Python 等 12 个软件配置方法。` |
| Keywords | Comma-separated keywords | `API中转站, AI集成, 自建服务, Halo博客, Cursor配置, ChatBox教程, 香港VPS` |

**These are rendered in `<title>`, `<meta name="description">`, and Open Graph tags.**

## 2. Per-Article SEO

Each post in Halo has:
- **Slug** — URL path. Halo auto-generates from title. For SEO, manually shorten it to contain the primary keyword.
- **Meta description** — Some themes support per-post meta description. Set uniquely per post.
- **Tags/categories** — Create keyword-rich tags that form the blog's topic cluster.

## 3. Static Assets

### Sitemap (auto-generated)
```
https://<domain>/sitemap.xml
```
Halo generates this automatically. Contains all published posts, categories, tags, and pages.

### robots.txt (auto-generated)
```
https://<domain>/robots.txt
```
Halo auto-serves `robots.txt`. Default content:
```
User-agent: *
Allow: /
Disallow: /console/

Sitemap: https://<domain>/sitemap.xml
```

Cloudflare may inject additional managed rules before Halo's robots.txt. Ensure the Sitemap line is present.

## 4. Search Engine Verification

### Baidu 百度站长验证

1. In Baidu Zhanzhang (`ziyuan.baidu.com`), add domain and get verification code
2. Deploy HTML file at blog root: `https://<domain>/baidu_verify_codeva-<hash>.html`
3. The HTML file contains just the verification code as content
4. Configure Nginx location or place the file in Halo attachment storage served at root

### Bing Webmaster Tools

1. In Bing Webmaster Tools, add site and get XML verification content
2. Deploy `BingSiteAuth.xml` at blog root:
```xml
<?xml version="1.0"?>
<users><user><verification_hash></user></users>
```
3. Serve via Nginx location block or Halo's theme static files

### Google Search Console

1. Add property in Google Search Console
2. Choose HTML file verification or DNS TXT record
3. For DNS: add TXT record in Cloudflare with the verification value

## 5. Open Graph / Twitter Cards

Halo 2.x auto-generates OG and Twitter Card tags from:
- `og:title` → site title (or post title on article pages)
- `og:description` → site description (or post excerpt)
- `og:image` → site logo (configured in theme settings)
- `og:locale` → `zh_CN`

## 6. Structured Data (JSON-LD)

Halo 2.x does NOT auto-generate JSON-LD structured data. This can be added via:

**Option A: Theme customization**
Add to theme's `<head>` template:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "{{site.title}}",
  "description": "{{site.description}}",
  "url": "https://blog.example.com",
  "author": {
    "@type": "Person",
    "name": "{{site.author}}"
  }
}
</script>
```

**Option B: Plugin**
Search Halo plugin marketplace for structured data / schema.org plugins.

## 7. SEO Health Checklist

- [ ] Site title contains target keywords + brand name (≤ 60 chars)
- [ ] Meta description is unique per page (150-160 chars)
- [ ] Each post has custom slug (short, keyword-dense)
- [ ] Sitemap accessible at `https://<domain>/sitemap.xml` (200 OK)
- [ ] robots.txt accessible (200 OK) with Sitemap declaration
- [ ] Baidu/Bing/Google verification files deployed
- [ ] OG tags render correctly (test via Facebook Sharing Debugger)
- [ ] Each article has 3-5 relevant tags forming topic clusters
- [ ] Category URLs are logical (e.g., `/categories/api-guide` not `/categories/1`)
- [ ] No duplicate meta titles across pages
- [ ] Canonical URLs set (Halo handles this automatically)
- [ ] Mobile responsive (Google mobile-first indexing)
- [ ] Page load time < 3s (use Cloudflare CDN + Halo caching)

## 8. Common Pitfalls

**Pitfall 1: Cloudflare blocks API-based settings changes**
Halo's admin API is behind Cloudflare. Cloudflare's bot protection may return `error code: 1010` for API requests with `Authorization: Bearer`. Options:

- **Use the browser-based admin console** (recommended for manual changes)
- **Add a firewall rule** to bypass Cloudflare protection for your PAT's IP
- **Access Halo directly via the Docker container port** (bypasses Cloudflare entirely):

```python
# Find the host-mapped port for Halo's internal port 8090
# docker ps shows something like: halo 0.0.0.0:40034->8090/tcp
# Access via Docker gateway IP from inside another container:
HALO_INTERNAL_API = "http://172.17.0.1:40034"
# NOT https://blog.aklibk.com (which goes through Cloudflare)
headers = {"Authorization": "Bearer " + pat_token, "Content-Type": "application/json"}

# ConfigMaps
GET /api/v1alpha1/configmaps/{name}
PUT /api/v1alpha1/configmaps/{name}

# Posts (CRUD)
GET /apis/content.halo.run/v1alpha1/posts
PUT /apis/content.halo.run/v1alpha1/posts/{name}
DELETE /apis/content.halo.run/v1alpha1/posts/{name}
```
Note: The PAT token still authenticates — the Docker bypass only avoids Cloudflare's bot detection, not Halo's auth.

**Pitfall 2: Theme `siteInfo.title` overrides system basic `title`**
Some themes (most notably **Serenity**) have their own `title` and `description` fields in the theme configmap that take precedence over the system-level `basic.title`:

```python
# Serenity theme stores its own title/description in:
# ConfigMap: theme-Serenity-configmap (or theme-<name>-configmap)
# under the key "basic" → JSON → "siteInfo"

cm = GET "/api/v1alpha1/configmaps/theme-Serenity-configmap"
data = json.loads(cm["data"]["basic"])
# data["siteInfo"]["title"] — this is what appears in <title>
# data["siteInfo"]["description"] — this is what appears in <meta name="description">

# Update by modifying the JSON and re-PUTting the entire ConfigMap:
data["siteInfo"] = {
    "title": "空缺的BLOG - API中转站配置 | AI集成教程 | 自建服务指南",
    "author": "空缺",
    "description": "API中转站配置教程、AI集成指南、Cursor/LobeChat等软件接入教程"
}
cm["data"]["basic"] = json.dumps(data)
PUT "/api/v1alpha1/configmaps/theme-Serenity-configmap", cm
```

**Theme SEO section**: Some themes also have a `seo` key in their configmap with verification and canonical settings:
```json
{
  "baiduSiteVerification": "codeva-...",
  "bingSiteVerification": "...",
  "googleSiteVerification": "",
  "enableCanonical": true
}
```
Set these in the `seo` sub-object of the theme configmap rather than in system code-injection.

**Pitfall 3: Updating per-post SEO via the correct API endpoint**
Posts use the `content.halo.run` API group, NOT the `api.halo.run` group:

```python
# ✅ Correct endpoint
GET/PUT/DELETE /apis/content.halo.run/v1alpha1/posts/{name}

# ❌ Wrong - these return 404
/api/v1alpha1/posts/{name}
/apis/api.halo.run/v1alpha1/posts/{name}

# Set per-post SEO:
post["spec"]["metaDescription"] = "Custom 150-char description"
post["spec"]["headMeta"] = {"keywords": "keyword1, keyword2, keyword3"}

# Then PUT the full post object (keep apiVersion and kind)
PUT "/apis/content.halo.run/v1alpha1/posts/{name}"
```

**Pitfall 4: ConfigMap PUT requires preserving the full object structure**
When updating a ConfigMap via PUT, keep all fields including `version` in metadata. If you strip `version`, the PUT may fail with HTTP 500. The `data` dict values are JSON-serialized strings:
```python
# data["basic"] is a JSON string, not a JSON object
basic = json.loads(sys_cm["data"]["basic"])  # → Python dict
basic["title"] = "New title"
sys_cm["data"]["basic"] = json.dumps(basic)  # → re-serialize to string
PUT result = ...  # Keep version, annotations etc. intact
```

**Pitfall 5: JSON-LD structured data via code injection**
Halo does NOT auto-generate JSON-LD. Add it via the system ConfigMap's `codeInjection.globalHead`:
```python
cm = GET "/api/v1alpha1/configmaps/system"
code = json.loads(cm["data"]["codeInjection"])
jsonld = '''<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Blog","name":"...","description":"...","url":"https://blog.example.com/","author":{"@type":"Person","name":"..."}}
</script>
'''
code["globalHead"] = jsonld + code.get("globalHead", "")
cm["data"]["codeInjection"] = json.dumps(code)
PUT "/api/v1alpha1/configmaps/system", cm
```

**Pitfall 6: Per-post meta description not visible**
Some themes don't render `meta[name="description"]` on article pages. Verify via:
```bash
curl -s https://blog.aklibk.com/archives/<slug> | grep -i 'meta.*description'
```
If missing, the theme's post template may not render the `headMeta` field. Check theme customization.

**Pitfall 7: sitemap not updating after new posts**
Halo caches sitemaps. Wait or restart the container:
```bash
docker restart halo
```

**Pitfall 8: Mixed language content**
Halo's default OG locale is `zh_CN`. If blog has multilingual content, set OG locale per-page via theme customization.
