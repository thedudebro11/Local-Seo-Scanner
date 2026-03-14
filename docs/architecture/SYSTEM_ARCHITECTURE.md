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
- `src/app/routes.tsx` — Hash router with 9 routes under `AppShell`
- `src/features/` — Page-level feature components
- `src/components/` — Reusable UI primitives and scan-specific widgets
- `src/features/scans/state/useScanStore.ts` — Zustand store; owns single-scan lifecycle state
- `src/features/bulk/useBulkScanStore.ts` — Zustand store; owns bulk scan lifecycle state

### Preload Script

`electron/preload.ts` is the bridge. It uses `contextBridge.exposeInMainWorld('api', ...)` to safely expose a typed set of async functions to the renderer. It imports types from the engine (type-only imports, no runtime engine code) to keep the API type-safe.

### Main Process

`electron/main.ts` creates the `BrowserWindow`, registers IPC handler groups, and handles app lifecycle events (activate, window-all-closed). IPC handlers are in `electron/ipc/`:
- `scanHandlers.ts` — handles `scan:start`, dynamically imports `runAudit`
- `bulkScanHandlers.ts` — handles `bulk:start`, calls `runBulkScan`
- `discoveryHandlers.ts` — handles `discovery:run`, calls `runMarketDiscovery`
- `marketHandlers.ts` — handles `market:build` and `monitoring:add-site`
- `fileHandlers.ts` — handles `file:*` channels via `scanRepository` and `shell`
- `appHandlers.ts` — handles `app:*` channels (version, platform, reports path)

### Engine

`src/engine/` is the pure Node.js audit engine. It has no Electron or React dependencies. It is loaded via dynamic `import()` inside the IPC scan handler, keeping it out of the renderer bundle entirely.

### Storage

All artifacts are written to Electron's `userData` path (platform-specific, survives app updates). The `index.json` file tracks all scan metadata. Each scan gets its own subdirectory containing `report.json` (slim AuditResult) and `report.html` (self-contained HTML).

Phases 11–15 added new storage sub-trees:

```
<userData>/
  reports/
    index.json                          ← SavedScanMeta[]
    <scanId>/report.json + report.html + screenshots/
    bulk/<batchId>.json                 ← BulkScanResult
    discovery/<discoveryId>.json        ← MarketDiscoveryResult
    market-dashboards/<dashboardId>.json ← MarketDashboard
  monitoring/
    sites.json                          ← TrackedSite[]
    history/<siteId>/<scanId>.json      ← SiteScanSummary per monitored scan
```

## Build Targets

electron-vite compiles three separate bundles:

| Target | Entry | Output | Notes |
|---|---|---|---|
| main | `electron/main.ts` | `out/main/index.js` | CJS, Node externalized |
| preload | `electron/preload.ts` | `out/preload/index.js` | CJS, Node externalized |
| renderer | `src/index.html` | `out/renderer/` | ESM browser bundle |

Path aliases `@engine` → `src/engine` and `@` → `src` are available in all three targets. `@components` and `@features` are renderer-only aliases.

## Full Platform Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  USER INPUT                                                  │
│                                                              │
│  Single URL      Multiple Domains     Industry + Location    │
│  (NewScanPage)   (BulkScanPage)       (MarketDiscoveryPage)  │
└──────────┬───────────────┬──────────────────┬───────────────┘
           │               │                  │
           ▼               ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│  DISCOVERY / DOMAIN PREPARATION                              │
│                                                              │
│  Manual URL entry     Textarea input      DuckDuckGo Lite    │
│                       (one per line)      search → extract   │
│                                           → filter dirs      │
│                                           (marketDiscovery)  │
└──────────┬───────────────┬──────────────────┘
           │               └──────────────────┐
           ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│  BULK SCAN ENGINE  (runBulkScan.ts)                          │
│                                                              │
│  Sequential: for each domain → runAudit()                    │
│  Failed domains recorded; batch never aborts                 │
│  Progress via bulk:progress IPC channel                      │
│  Result saved to reports/bulk/<batchId>.json                 │
└──────────┬───────────────────────────────────────────────────┘
           │  (also called directly for single scans)
           ▼
┌──────────────────────────────────────────────────────────────┐
│  SCAN PIPELINE  (runScanJob.ts — 12 stages)                  │
│                                                              │
│  validate → crawl → extract → analyze → visual →            │
│  impact → score → competitor → confidence →                  │
│  roadmap → revenue → report                                  │
│                                                              │
│  Optional siteId on request → monitoring hook in reportStage │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  REPORT GENERATION                                           │
│                                                              │
│  JSON report   HTML report   index.json updated              │
│  screenshots   AuditResult returned to caller                │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  MONITORING LAYER  (src/engine/monitoring/)                  │
│                                                              │
│  If request.siteId set:                                      │
│    saveScanSummary() → monitoring/history/<siteId>/          │
│    updateTrackedSiteLastScan() → monitoring/sites.json       │
└──────────┬───────────────────────────────────────────────────┘
           │  (after bulk scan completes)
           ▼
┌──────────────────────────────────────────────────────────────┐
│  MARKET INTELLIGENCE DASHBOARD  (buildMarketDashboard.ts)    │
│                                                              │
│  Input: BulkScanResult (already completed, no new scans)     │
│  Enrichment: loads individual report.json per site           │
│  Rankings: top performers, weakest, revenue leak, outreach   │
│  Output saved to reports/market-dashboards/<id>.json         │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  LEAD IDENTIFICATION                                         │
│                                                              │
│  bestOpportunityTargets ranked by outreach score             │
│  (score < 70, high-priority issues, revenue leak, data       │
│   confidence, opportunity count)                             │
│  "Add to Monitoring" button tracks selected prospects        │
└──────────────────────────────────────────────────────────────┘
```

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
