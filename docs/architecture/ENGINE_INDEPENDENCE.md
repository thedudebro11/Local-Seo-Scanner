# Engine Independence

## Why the Engine is Independent

`src/engine/` is deliberately designed as a self-contained, framework-agnostic audit library. It has no dependency on Electron, React, Vite, or any browser-specific API. This design enables:

1. **CLI tool**: `node -e "import('./src/engine/orchestrator/runAudit').then(...)"` — no Electron needed
2. **REST API**: Wrap `runAudit` in an Express handler for a SaaS backend
3. **Testing**: Unit-test any extractor, analyzer, or scorer in plain Node.js without mocking Electron
4. **Future packaging**: The engine could be published as a standalone npm package

## Directory Split

### App Shell (Electron + React)

```
electron/
  main.ts               ← Electron app lifecycle, BrowserWindow
  preload.ts            ← contextBridge — the ONLY place Electron APIs touch the engine
  ipc/
    scanHandlers.ts     ← IPC handler; dynamically imports runAudit
    fileHandlers.ts     ← IPC handler; uses shell, scanRepository
    appHandlers.ts      ← IPC handler; uses app.getVersion, pathResolver
src/
  app/                  ← React router and entry point
  components/           ← React UI components
  features/             ← React pages and Zustand store
  index.html            ← Renderer entry HTML
```

### Engine (Pure Node.js)

```
src/engine/
  types/                ← Shared TypeScript interfaces (no runtime code)
  utils/                ← domain.ts, logger.ts
  crawl/                ← Playwright-based crawler
  extractors/           ← Cheerio-based signal extractors
  analyzers/            ← Finding generators
  scoring/              ← Score calculators
  reports/              ← JSON and HTML report builders
  lighthouse/           ← Lighthouse runner and finding analyzer
  storage/              ← pathResolver (uses Electron app), scanRepository
  orchestrator/         ← runAudit.ts — engine entry point
```

**Note**: `storage/pathResolver.ts` is a partial exception — it imports `app` from Electron to get the userData path. If the engine is ever extracted for non-Electron use, `pathResolver.ts` must be replaced with an injectable path resolver.

## Import Rules

### What IS allowed in engine files

- Standard Node.js built-ins (`path`, `fs`, `url`, etc.)
- Any pure npm package (`cheerio/slim`, `fs-extra`, `zod`)
- Other engine files (`../utils/domain`, `../types/audit`, etc.)
- Dynamic `import()` of ESM-only packages (`playwright`, `lighthouse`, `chrome-launcher`)
- The global `URL`, `fetch`, `AbortSignal` — available in Node.js 18+ and Electron 28

### What is NOT allowed in engine files (except pathResolver)

- `import { app } from 'electron'` — Electron API
- `import React from 'react'` — React
- `import { ipcMain } from 'electron'` — IPC
- `import { BrowserWindow } from 'electron'` — Window API
- Any browser-only DOM API (`document`, `window`, `localStorage`)
- Any Vite-specific features (`import.meta.glob`, `import.meta.env`)

### What IS allowed in types files (`src/engine/types/`)

- Pure TypeScript interfaces and type aliases
- No runtime imports whatsoever
- These files are imported by both main process code and renderer code (type-only imports)

## How Types Cross the Process Boundary

The `src/engine/types/` files contain only TypeScript interfaces. The renderer imports them as type-only:

```typescript
// In renderer (useScanStore.ts)
import type { AuditRequest, AuditResult } from '@engine/types/audit'
import type { SavedScanMeta } from '@engine/types/ipc'
```

Since these are type-only imports, they are erased at build time and never appear in the renderer bundle. The renderer never loads any engine runtime code.

## Current Violations

Only one file in the engine imports from Electron:

**`src/engine/storage/pathResolver.ts`** — imports `app` from `electron` to call `app.getPath('userData')`.

This is an accepted architectural compromise for the current Electron-only deployment. The violation is isolated to one function (`getReportsDir()`). If the engine is ever extracted for reuse, replace this with a parameter injection:

```typescript
// Future version
export function getReportsDir(userDataPath: string): string {
  return path.join(userDataPath, 'reports')
}
```

## Enabling CLI/API/SaaS Reuse

To reuse the engine outside Electron:

1. Replace `pathResolver.ts` with a version that accepts a base path parameter
2. Replace `logger.ts` output if needed (currently writes to `console.*`)
3. Import `runAudit` directly in your Node.js script or HTTP handler
4. Pass your own `emitProgress` callback (or a no-op function)
5. Playwright's Chromium must be installed (`npx playwright install chromium`)
