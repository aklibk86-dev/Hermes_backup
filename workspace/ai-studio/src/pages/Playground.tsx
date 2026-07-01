import { useCallback, useMemo, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'html' | 'css' | 'javascript'

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
</head>
<body>
  <div class="container">
    <h1>Hello, Creative Studio!</h1>
    <p>Edit the code to see live changes.</p>
    <button id="clickMe">Click Me</button>
  </div>
</body>
</html>`

const DEFAULT_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #a855f7, #d946ef);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

p {
  font-size: 1.125rem;
  color: #a0a0c0;
  margin-bottom: 1.5rem;
}

button {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border: none;
  border-radius: 0.5rem;
  background: linear-gradient(90deg, #a855f7, #d946ef);
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
}

button:active {
  transform: translateY(0);
}`

const DEFAULT_JS = `document.getElementById('clickMe')?.addEventListener('click', () => {
  alert('Hello from the AI Creative Studio! 🎨')
})

console.log('Playground ready!')`

const TAB_LABELS: Record<Tab, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
}

function LineNumbers({ count }: { count: number }) {
  return (
    <div
      className="select-none overflow-hidden pt-[13px] pb-[13px] text-right leading-6 text-[#858585]"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace", fontSize: '14px', minWidth: '48px', paddingRight: '16px' }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1}>{i + 1}</div>
      ))}
    </div>
  )
}

function buildPreviewDocument(html: string, css: string, js: string): string {
  const headEnd = html.indexOf('</head>')
  if (headEnd === -1) {
    // No <head> tag — wrap the entire thing
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`
  }

  const beforeHead = html.slice(0, headEnd)
  const afterHead = html.slice(headEnd)

  const styleTag = `\n  <style>${css}</style>`
  const scriptTag = `\n  <script>${js}<\/script>`

  return `${beforeHead}${styleTag}${afterHead}
${scriptTag}`
}

export default function Playground() {
  const [activeTab, setActiveTab] = useState<Tab>('html')
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [previewKey, setPreviewKey] = useState(0)

  const currentCode = useMemo(() => {
    switch (activeTab) {
      case 'html':
        return html
      case 'css':
        return css
      case 'javascript':
        return js
    }
  }, [activeTab, html, css, js])

  const setCurrentCode = useCallback(
    (value: string) => {
      switch (activeTab) {
        case 'html':
          setHtml(value)
          break
        case 'css':
          setCss(value)
          break
        case 'javascript':
          setJs(value)
          break
      }
    },
    [activeTab],
  )

  const lineCount = useMemo(() => currentCode.split('\n').length, [currentCode])

  const previewDoc = useMemo(
    () => buildPreviewDocument(html, css, js),
    [html, css, js],
  )

  const handleRun = useCallback(() => {
    setPreviewKey((k) => k + 1)
  }, [])

  const handleReset = useCallback(() => {
    setHtml(DEFAULT_HTML)
    setCss(DEFAULT_CSS)
    setJs(DEFAULT_JS)
    setPreviewKey((k) => k + 1)
    setActiveTab('html')
  }, [])

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4">
        {/* Tabs */}
        <div className="flex">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Editor panel */}
        <div className="flex flex-1 flex-col overflow-hidden border-border md:w-[60%] md:border-r">
          <div className="flex flex-1 overflow-hidden bg-[#1e1e1e]">
            {/* Line numbers gutter */}
            <LineNumbers count={lineCount} />

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                className="absolute inset-0 resize-none border-0 bg-transparent p-0 leading-6 text-[#d4d4d4] caret-[#d4d4d4] outline-none"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                  fontSize: '14px',
                  lineHeight: '1.5rem',
                  tabSize: 2,
                  whiteSpace: 'pre',
                  overflowWrap: 'normal',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  paddingTop: '13px',
                  paddingBottom: '13px',
                  paddingRight: '16px',
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                wrap="off"
              />
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex flex-1 flex-col overflow-hidden md:w-[40%]">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Preview
            </span>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              key={previewKey}
              srcDoc={previewDoc}
              title="Preview"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
