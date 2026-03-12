# System Architecture

## Overview

Local SEO Scanner is a three-process Electron application. The renderer (React UI) never touches the file system or network directly. All heavy work — crawling, extraction, analysis, scoring, and report writing — runs in the main process via the engine.

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  RENDERER PROCESS  (Chromium, sandboxed, no Node.js access)         │
│                                                                     │
│   React + React Router + Zustand                                    │
│   ┌─────────────┐   ┌───────────────┐   ┌──────────────────────┐  │
│   │ DashboardPage│   │  NewScanPage  │   │  ScanResultsPage     │  │
│   └─────────────┘   │  ScanForm     │   │  ScoreOverview       │  │
│                     │  ScanProgress │   │  IssueList           │  │
│                     └───────────────┘   │  QuickWins           │  │
│                                         └──────────────────────┘  │
│                                                                     │
│   useScanStore (Zustand) ─── window.api ──────────────────────────►│
└───────────────────────────────┬─────────────────────────────────────┘
                                │  contextBridge (secure)
┌───────────────────────────────▼─────────────────────────────────────┐
│  PRELOAD SCRIPT  (electron/preload.ts)                              │
│  Exposes typed window.api object via contextBridge.exposeInMainWorld│
│  No app logic — pure bridge.                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  ipcRenderer.invoke / ipcRenderer.on
┌───────────────────────────────▼─────────────────────────────────────┐
│  MAIN PROCESS  (Node.js, full OS access)                            │
│                                                                     │
│  electron/main.ts                                                   │
│    └─ registerScanHandlers(mainWindow)                              │
│    └─ registerFileHandlers()                                        │
│    └─ registerAppHandlers()                                         │
│                                                                     │
│  IPC Handlers                                                       │
│    scan:start  ──► runAudit(request, emitProgress)                  │
│    file:*      ──► scanRepository / shell.openPath                  │
│    app:*       ──► app.getVersion / pathResolver                    │
│                                                                     │
│  ENGINE  (src/engine/ — dynamic import, main process only)          │
│                                                                     │
│  orchestrator/runAudit.ts  ──► pipeline/runScanJob.ts               │
│    Stage 1:  validateStage       (utils/domain)                     │
│    Stage 2:  crawlStage          (crawl/* + playwright)             │
│    Stage 3:  extractStage        (extractors/* + analyzers/biz)     │
│    Stage 4:  analysisStage       (analyzers/*)                      │
│    Stage 5:  visualStage*        (visual/visualAnalyzer)            │
│    Stage 6:  impactStage*        (lighthouse/* + impactAnalyzer)    │
│    Stage 7:  scoreStage          (scoring/*)                        │
│    Stage 8:  competitorStage*    (competitor/index)                 │
│    Stage 9:  confidenceStage*    (scoring/scoreConfidence)          │
│    Stage 10: roadmapStage*       (roadmap/buildFixRoadmap)          │
│    Stage 11: revenueStage*       (revenue/estimateRevenueImpact)    │
│    Stage 12: reportStage         (reports/* + storage/*)            │
│    * optional — failure logged, scan continues                      │
│                                                                     │
│  STORAGE  (~/.../userData/reports/)                                 │
│    index.json                    ─ SavedScanMeta[]                  │
│    <scanId>/report.json          ─ AuditResult (html stripped)      │
│    <scanId>/report.html          ─ Self-contained HTML report       │
│    <scanId>/screenshots/*.png    ─ Visual UX screenshots            │
└─────────────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### Renderer Process

The React UI runs inside a sandboxed Chromium renderer. It has no access to Node.js APIs, Electron APIs, or the file system. All communication with the outside world goes through `window.api`.

Key pieces:
- `src/app/routes.tsx` — Hash router with 5 routes under `AppShell`
- `src/features/` — Page-level feature components
- `src/components/` — Reusable UI primitives and scan-specific widgets
- `src/features/scans/state/useScanStore.ts` — Zustand store; owns scan lifecycle state

### Preload Script

`electron/preload.ts` is the bridge. It uses `contextBridge.exposeInMainWorld('api', ...)` to safely expose a typed set of async functions to the renderer. It imports types from the engine (type-only imports, no runtime engine code) to keep the API type-safe.

### Main Process

`electron/main.ts` creates the `BrowserWindow`, registers three groups of IPC handlers, and handles app lifecycle events (activate, window-all-closed). IPC handlers are in `electron/ipc/`:
- `scanHandlers.ts` — handles `scan:start`, dynamically imports `runAudit`
- `fileHandlers.ts` — handles `file:*` channels via `scanRepository` and `shell`
- `appHandlers.ts` — handles `app:*` channels (version, platform, reports path)

### Engine

`src/engine/` is the pure Node.js audit engine. It has no Electron or React dependencies. It is loaded via dynamic `import()` inside the IPC scan handler, keeping it out of the renderer bundle entirely.

### Storage

All artifacts are written to Electron's `userData` path (platform-specific, survives app updates). The `index.json` file tracks all scan metadata. Each scan gets its own subdirectory containing `report.json` (slim AuditResult) and `report.html` (self-contained HTML).

## Build Targets

electron-vite compiles three separate bundles:

| Target | Entry | Output | Notes |
|---|---|---|---|
| main | `electron/main.ts` | `out/main/index.js` | CJS, Node externalized |
| preload | `electron/preload.ts` | `out/preload/index.js` | CJS, Node externalized |
| renderer | `src/index.html` | `out/renderer/` | ESM browser bundle |

Path aliases `@engine` → `src/engine` and `@` → `src` are available in all three targets. `@components` and `@features` are renderer-only aliases.

## Data Flow: Scan Request to Result

```
User submits ScanForm
  → useScanStore.startScan(request)
    → window.api.startScan(request)          [renderer → preload]
      → ipcRenderer.invoke('scan:start', request)
        → ipcMain.handle('scan:start', ...)  [main process]
          → dynamic import runAudit
            → runAudit(request, emitProgress)
              → emitProgress calls webContents.send('scan:progress', event)
                ← ipcRenderer.on('scan:progress') → useScanStore sets progress
            ← returns AuditResult
          ← ipcMain resolves invoke
        ← ipcRenderer.invoke resolves
      ← window.api.startScan resolves
    ← startScan sets latestResult
  → NewScanPage useEffect navigates to /scan/results/:id
```
