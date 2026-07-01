# First-Use Guide — Practical Lessons from Initial Demo Run

This file captures practical gotchas and workflows discovered during the first end-to-end demo run. Read this before your first use, or when things don't work as expected.

## Scaffold → First Working Chapter

### Step-by-step (after `bash scripts/scaffold.sh ./presentation --theme=<id>`)

1. **Delete the example chapter**
   ```bash
   rm -rf presentation/src/chapters/01-example
   ```
   Then update `presentation/src/registry/chapters.ts` to remove the Example import and array entry.

2. **Create your chapter directory**
   ```bash
   mkdir -p presentation/src/chapters/01-<id>
   ```

3. **Three files per chapter** (all mandatory):
   - `narrations.ts` — step narrations (step count = array length)
   - `<Chapter>.tsx` — React component with `{ step }: ChapterStepProps`
   - `<Chapter>.css` — styles using theme tokens only

4. **Register in chapters.ts**
   ```ts
   import ChapterName from "../chapters/01-<id>/<Chapter>";
   import { narrations as cnNarrations } from "../chapters/01-<id>/narrations";
   // Then add to CHAPTERS array
   ```

5. **Bump STORAGE_KEY** in `src/hooks/useStepper.ts` (e.g., `v4` → `v5`)

6. **Type-check before starting dev server**
   ```bash
   cd presentation && npx tsc --noEmit
   ```

### Dev Server

- **Port**: The scaffolder sets `vite.config.ts` with `server.port: 5174`. Open `http://localhost:5174`, not 5173.
- **Start**: `cd presentation && npx vite --host` (add `--host` so it listens on all interfaces)
- **Health check**: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5174/` should return `200`
- If the port is already in use, vite auto-increments — check console output for the actual URL.

## Chapter Development Pattern

### narrations.ts
```ts
import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "Step 0 narration text — must match script.md semantically",
  "Step 1 narration text — keep key phrases, can adjust punctuation for TTS",
];
```

### Chapter.tsx Pattern
```tsx
import type { ChapterStepProps } from "../../registry/types";
import "./<Chapter>.css";

export default function <Chapter>({ step }: ChapterStepProps) {
  if (step === 0) return <Step0 />;
  if (step === 1) return <Step1 />;
  return null;
}

function Step0() { /* ... */ }
function Step1() { /* ... */ }
```

### CSS: Use Theme Tokens, Never Hardcode Colors
| Token | Purpose |
|-------|---------|
| `var(--shell)` | Very dark background |
| `var(--surface-2)` | Card/surface background |
| `var(--text)` | Primary text |
| `var(--text-2)` | Secondary/muted text |
| `var(--text-mute)` | Muted captions |
| `var(--accent)` | Highlight color (theme signature) |
| `var(--rule)` | Border/line color |
| `var(--font-mono)` | Monospace font |
| `var(--font-display-cn)` | Chinese display font |
| `var(--font-body)` | Body text font |

### Animation: Use Fade-in Pattern
```css
@keyframes chFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.selector {
  opacity: 0;
  animation: chFadeIn 0.5s ease-out forwards;
  animation-delay: 0.3s;
}
```

## Material Sourcing (Screenshots)

When the user says "你自己截图素材" (you take the screenshots yourself):

1. Use `browser_navigate` to visit the relevant pages
2. Use `browser_vision` to capture screenshots — the image is saved to disk even if vision analysis fails
3. Reference the path via `MEDIA:/path/to/screenshot.png`
4. For unavailable pages, use styled placeholder cards marked with the intended content
5. Mark placeholder status in the outline's material checklist

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Dev server won't start | Concurrent vite instance | `kill $(lsof -t -i:5174)` or use different port |
| `tsc --noEmit` fails | Missing imports or CSS type | Check chapter import paths |
| Blank page in browser | No registered chapters | Check `chapters.ts` has at least one entry |
| Step doesn't advance on click | Click landed on `data-no-advance` element | Remove that attribute or click stage background |
