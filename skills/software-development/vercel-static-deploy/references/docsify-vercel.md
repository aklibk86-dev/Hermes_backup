# Docsify on Vercel — Quick Reference

## Boilerplate index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Site Title</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css">
</head>
<body>
  <div id="app"></div>
  <script>
    window.$docsify = {
      name: 'Site Name',
      repo: '',
      loadSidebar: true,
      subMaxLevel: 3,
      search: { placeholder: '搜索...', noData: '没有结果' }
    }
  </script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js"></script>
</body>
</html>
```

## vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Directory Layout

```
project/
├── index.html
├── README.md           ← Homepage
├── _sidebar.md         ← Navigation
├── .nojekyll
├── vercel.json
└── pages/
    └── topic.md
```

## _sidebar.md Format

```markdown
- **Category Name**
  - [Page Title](path/to/page.md)
- **Another Category**
  - [Another Page](path/to/another.md)
```

## Deploy

```bash
vercel deploy --prod --yes --token YOUR_TOKEN
```

## Tips

- Use full `https://` CDN URLs, never protocol-relative (`//cdn...`)
- `_sidebar.md` paths are relative to project root, not the file location
- `.nojekyll` prevents GitHub Pages processing if the repo is ever served there
- After deploy, some Vercel projects auto-alias to a random subdomain — always verify with `vercel alias ls` and fix with `vercel alias set`
