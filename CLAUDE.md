# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev mode with HMR (electron-vite dev)
npm run build        # Compile main + preload + renderer to out/
npm run typecheck    # Type-check all targets without emitting
npm run dist         # Build + package installer via electron-builder
npx playwright install chromium   # Required once after npm install
```

There are no test scripts. Use `npm run typecheck` to validate correctness before shipping.

## Architecture

Electron desktop app with three build targets (all managed by electron-vite):

```
Renderer (React/Vite SPA)
  └─ window.api.*  ←  contextBridge (electron/preload.ts)
       └─ ipcRenderer.invoke / ipcRenderer.on
Main process (electron/main.ts + electron/ipc/)
  └─ dynamic import → src/engine/  (Node.js context)
       └─ writes artifacts to Electron userData/reports/
```

**Critical constraint**: The engine (`src/engine/`) runs only in the main process. The renderer never imports engine code directly — all communication goes through `window.api` (defined in `electron/preload.ts` as `ElectronAPI`).

### Scan pipeline (`src/engine/pipeline/runScanJob.ts`)

Stages run in order; required stages abort on failure, optional stages (`runOptional`) log and continue:

```
validateStage → crawlStage (opens Playwright browser) → extractStage → analysisStage
  → [visual, impact]  →  scoreStage  →  [competitor]
  → [confidence, roadmap, revenue, opportunity]  →  reportStage
```

The browser is kept open through `competitorStage` and closed in `finally`. `runAudit.ts` in `src/engine/orchestrator/` is the legacy entry point that still works; new code should use `runScanJob`.

### IPC contracts

All channels are declared in `src/engine/types/ipc.ts`. Adding a new feature requires changes in four places:
1. `src/engine/types/ipc.ts` — add channel type
2. `electron/ipc/<feature>Handlers.ts` — register handler
3. `electron/main.ts` — call `register*Handlers()`
4. `electron/preload.ts` — expose method on `api` object

### State management

Zustand stores live in `src/features/*/`. The scan store (`useScanStore`) drives the active scan flow; `useBulkScanStore` drives bulk scans. Both receive progress via `window.api.onScanProgress` / `onBulkScanProgress` and unsubscribe in `useEffect` cleanup.

### Scoring weights

Technical 25% · Local SEO 30% · Conversion 25% · Content 10% · Trust 10%

Score labels: ≥80 "Strong", ≥60 "Solid", ≥40 "Needs Work", <40 "Leaking Opportunity"

`FindingCategory` values in code: `'technical' | 'localSeo' | 'conversion' | 'content' | 'trust'` — note `'localSeo'` (camelCase), not `'local'`.

## Key implementation constraints

- **`cheerio/slim`** — all runtime cheerio imports must use `cheerio/slim`, not `cheerio`. Full cheerio loads `undici` which requires Node ≥ 20; Electron 28 ships Node 18.
- **Lighthouse + chrome-launcher** — ESM-only; always loaded via `await import(...)` dynamic import, never static.
- **Playwright** — loaded via `await import('playwright')`. Chromium must be installed separately (`npx playwright install chromium`).
- **Path aliases** — `@engine` → `src/engine`, `@` → `src`, `@components` → `src/components`, `@features` → `src/features`. Available in all three build targets.
- **Scan artifacts** — written to `userData/reports/<scanId>/report.json` and `report.html`. Index at `userData/reports/index.json` (newest-first on read, append-only on write).

## Extension points

| Goal | Where |
|---|---|
| New analyzer check / finding | `src/engine/analyzers/<relevant>Analyzer.ts` |
| New scoring signal | `src/engine/scoring/score<Category>.ts` |
| New pipeline stage | Add file in `src/engine/pipeline/stages/`, import and call in `runScanJob.ts` |
| New report section | `src/engine/reports/buildHtmlReport.ts` + `reportTemplates.ts` |
| New business type | `audit.ts` union → `BusinessTypeSelect.tsx` → `businessTypeDetector.ts` |
| New IPC channel | Follow the four-file pattern above |
