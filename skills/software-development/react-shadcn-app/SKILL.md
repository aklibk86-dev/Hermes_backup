---
name: react-shadcn-app
title: React shadcn/ui App Scaffolding
description: Scaffold and configure a production-grade React + TypeScript + Vite + shadcn/ui + Tailwind CSS v4 application. Covers Vite setup, Tailwind v4 config (dark mode via CSS custom properties), shadcn/ui component creation, TypeScript path aliases, and the specific pitfalls of TS 5.x deprecation warnings and export consistency when using sub-agents.
trigger: user asks to build a new React app, create a dashboard, start a frontend project, or set up shadcn/ui; any request involving React + Tailwind v4 + shadcn.
tags: [react, shadcn, tailwind, vite, typescript, frontend, ui]
---

# React + shadcn/ui + Tailwind CSS v4 Scaffolding

## Scaffold

```bash
npm create vite@latest <project-name> -- --template react-ts
cd <project-name>
npm install
```

## Install Dependencies

```bash
# Core
npm install react-router-dom zustand @tanstack/react-query

# Icons & utilities
npm install lucide-react clsx tailwind-merge class-variance-authority

# Tailwind v4 (Vite plugin, NOT PostCSS)
npm install tailwindcss @tailwindcss/vite

# shadcn/ui radix packages
npm install @radix-ui/react-slot @radix-ui/react-separator @radix-ui/react-scroll-area @radix-ui/react-switch @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-tooltip vaul sonner
```

## Tailwind v4 Configuration

**Vite config** (`vite.config.ts`):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**CSS** (`src/index.css`): Tailwind v4 uses `@import "tailwindcss"` instead of `@tailwind` directives. Define CSS custom properties in `:root` and `.dark`, then map them with `@theme inline`:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --primary: oklch(0.546 0.245 262.881);
  --border: oklch(0.92 0.004 286.32);
  /* ... other vars */
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  /* ... dark overrides */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-border: var(--border);
  /* ... all vars */
}

* { @apply border-border; }
body { @apply bg-background text-foreground; }
```

## TypeScript Path Aliases

Edit `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "ignoreDeprecations": "6.0"
  }
}
```

**Pitfall**: TypeScript 5.x+ deprecates `baseUrl` + `paths` in favour of a new pattern not yet standard. Add `ignoreDeprecations: "6.0"` to suppress TS5101. This is harmless — the bundler (Vite) resolves `@/` aliases via `resolve.alias` in vite.config.ts. The tsconfig paths are only for IDE intellisense and `tsc --noEmit`.

**Pitfall**: With `verbatimModuleSyntax: true`, type-only imports must use `import type { ... }`. If third-party libraries (like shadcn components) don't use `type` imports where they should, set `"noUnusedLocals": false` and `"noUnusedParameters": false` to avoid spurious build errors on component files.

## shadcn/ui Components

When the shadcn CLI (`npx shadcn@latest add`) hangs on interactive prompts, **write components manually**. Use this pattern for each:

```ts
// button.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
```

Maintain a `cn()` utility at `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

## Theme / Dark Mode

Create a Zustand store for theme:
```ts
type Theme = 'light' | 'dark' | 'system'
```
On mount, read `localStorage.getItem('theme')` and toggle `.dark` class on `document.documentElement`. Use `window.matchMedia('(prefers-color-scheme: dark)')` for system detection.

Wrap the app in `<QueryClientProvider>` (React Query) and `<BrowserRouter>` (React Router), with `<Toaster>` from `sonner` for notifications.

## Export Consistency with Sub-Agents

When delegating page creation to sub-agents, they default to **named exports** (`export function DashboardPage()`). Code you write by hand may use **default exports** (`export default function ChannelsPage()`). In the router file (`App.tsx`), import accordingly:
```ts
import { DashboardPage } from '@/pages/dashboard'  // named
import ChannelsPage from '@/pages/channels'         // default
```

## Pitfalls

1. **npm install watchdog**: Large installs can trigger the background-process watchdog detection. Use `background=true` + `process(wait)` instead of foreground.
2. **TS5101 deprecation**: `baseUrl` + `paths` works fine with Vite but TS 5.x warns. Add `ignoreDeprecations: "6.0"`.
3. **shadcn CLI interactive prompts**: The init command (`npx shadcn@latest init -y --defaults`) may still prompt if a `components.json` already exists. Prefer creating components manually from known-good patterns.
4. **shadcn v4 vs older shadcn**: v4 uses `@tailwindcss/vite` and CSS custom properties via `@theme inline`. Older tutorials reference postcss config — ignore them for v4.
5. **Lazy loading pages**: Use `import()` for code-splitting on larger apps to avoid chunk size warnings (Vite warns at 500 kB).
