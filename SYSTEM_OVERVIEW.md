# SYSTEM_OVERVIEW.md
_AI memory file — reflects actual codebase state_

---

## 1. Project Purpose

Desktop application for auditing local business websites. Scans a URL, analyzes technical SEO, local SEO signals, conversion factors, and trust indicators, then generates a scored report. Intended for outreach and client work — produces owner-friendly findings, not generic SEO output.

---

## 2. High-Level Architecture

```
React UI (renderer process)
  ↓  window.api.*  (contextBridge)
Electron preload (electron/preload.ts)
  ↓  ipcRenderer.invoke / ipcRenderer.on
Electron main process (electron/main.ts + electron/ipc/)
  ↓  dynamic import
Audit engine (src/engine/orchestrator/runAudit.ts)
  ↓  (Phase 3+) crawler → extractors → analyzers → scoring → reports
Saved artifacts on disk (userData/reports/)
```

- **Renderer** is a React + Vite SPA. Communicates with main exclusively via `window.api`.
- **Preload** exposes a typed bridge (`ElectronAPI`). No `nodeIntegration`.
- **Main** registers IPC handlers; delegates all scan logic to the engine via dynamic import.
- **Engine** lives in `src/engine/` and runs in the Node.js (main) process. Renderer only imports pure type definitions from `src/engine/types/`.

---

## 3. Core Scan Pipeline (current state)

```
User fills ScanForm (URL, scan mode, business type, max pages)
→ useScanStore.startScan(request)
→ window.api.startScan(request)  [ipcRenderer.invoke]
→ scanHandlers.ts receives 'scan:start'
→ runAudit(request, emitProgress) called
→ emitProgress() pushes scan:progress events → renderer progress bar updates
→ runAudit resolves with AuditResult
→ Zustand store sets latestResult
→ NewScanPage useEffect navigates to /scan/results/:id
→ ScanResultsPage reads latestResult, renders ScoreOverview + IssueList + QuickWins
```

**Note:** `runAudit` is currently a stub. Steps 4–7 simulate work with `sleep(120ms)` per step and return a placeholder result. No real crawling, extraction, or scoring occurs yet.

---

## 4. Major Modules

| Path | Responsibility |
|---|---|
| `electron/` | Main process bootstrap, BrowserWindow creation, IPC handler registration |
| `electron/ipc/` | `scanHandlers` (start scan, push progress), `fileHandlers` (list/load/open reports), `appHandlers` (version, paths) |
| `electron/preload.ts` | Typed `contextBridge` — `startScan`, `onScanProgress`, `getSavedScans`, `openReport`, `openFolder`, `loadScan` |
| `src/app/` | React entry (`main.tsx`), root component, hash router (5 routes) |
| `src/components/layout/` | `AppShell`, `Sidebar`, `Topbar` — persistent shell around all pages |
| `src/components/ui/` | `Button`, `Card`, `Input`, `Select`, `Badge`, `Progress`, `EmptyState` |
| `src/components/scan/` | `ScanForm`, `ScanProgress`, `ScoreOverview`, `IssueList`, `QuickWins`, `BusinessTypeSelect` |
| `src/components/reports/` | `ReportActions` — open HTML report / open reports folder |
| `src/features/scans/` | `NewScanPage`, `ScanResultsPage`, `SavedScansPage`, `useScanStore` (Zustand) |
| `src/features/dashboard/` | `DashboardPage` — stats, latest result banner, scan history list |
| `src/engine/types/` | Shared TypeScript interfaces. Imported by both main and renderer. |
| `src/engine/utils/` | `domain.ts` (URL helpers), `logger.ts` (structured console logger) |
| `src/engine/storage/` | `pathResolver.ts` (artifact paths), `scanRepository.ts` (stub — returns `[]`) |
| `src/engine/orchestrator/` | `runAudit.ts` — pipeline entry point (stub) |
| `src/engine/crawl/` | **Empty** — Phase 3 |
| `src/engine/extractors/` | **Empty** — Phase 4 |
| `src/engine/analyzers/` | **Empty** — Phase 5 |
| `src/engine/scoring/` | **Empty** — Phase 6 |
| `src/engine/reports/` | **Empty** — Phase 7 |
| `src/engine/lighthouse/` | **Empty** — Phase 8 |

---

## 5. Data Models

All defined in `src/engine/types/audit.ts`:

| Type | Description |
|---|---|
| `AuditRequest` | Input: `url`, `scanMode` (quick/full), `businessType`, `maxPages` |
| `AuditResult` | Full scan output: `id`, `domain`, `pages`, `findings`, `scores`, `quickWins`, `moneyLeaks`, `artifacts` |
| `CrawledPage` | One fetched page: URL, status, title, H1s, canonicals, extracted signals (phones, CTAs, schema, etc.) |
| `Finding` | One issue: `id`, `category`, `severity`, `title`, `summary`, `whyItMatters`, `recommendation`, `affectedUrls` |
| `CategoryScore` | `value` (0–100), `label` (Strong/Solid/Needs Work/Leaking Opportunity), `rationale[]` |
| `AuditScores` | Six `CategoryScore` values: `technical`, `localSeo`, `conversion`, `content`, `trust`, `overall` |
| `ScanProgressEvent` | IPC push payload: `step` (string), `percent` (0–100), `message?` |
| `SavedScanMeta` | Index entry: `id`, `domain`, `scannedAt`, `overallScore`, paths to JSON + HTML artifacts |

Score weights: Technical 25%, Local SEO 30%, Conversion 25%, Content 10%, Trust 10%.

---

## 6. Scan Results and Reports

- **In-memory result:** `useScanStore.latestResult` holds the current session's `AuditResult`.
- **JSON report:** Path resolved via `pathResolver.buildJsonPath(scanId)` → `userData/reports/<scanId>/report.json`. **Not written yet (Phase 7).**
- **HTML report:** Path resolved via `pathResolver.buildHtmlPath(scanId)` → `userData/reports/<scanId>/report.html`. **Not written yet (Phase 7).**
- **Scan history index:** `scanRepository.listSavedScans()` returns `[]`. **Not persisted yet (Phase 7).**
- `ReportActions` buttons exist in UI but "Open HTML Report" is disabled when `artifacts.htmlPath` is absent.

---

## 7. Current Implementation Status

**Implemented**
- Electron shell (window, security settings, IPC registration)
- Typed preload bridge (`window.api`)
- All IPC handler skeletons (scan, file, app)
- Full React UI: routing, layout shell, all pages, all scan + results components
- Zustand scan store with live progress subscription
- Shared type system (`AuditRequest`, `AuditResult`, `Finding`, etc.)
- URL utilities (`normalizeInputUrl`, `getDomain`, `resolveUrl`, `stripTrackingParams`)
- Path resolver and scan ID generation

**Not implemented yet (stub or empty)**
- Crawler: `fetchHtml`, `discoverUrls`, `classifyPage`, `robots`, `sitemap`
- Extractors: meta, headings, schema, contact, local signals, CTAs, trust, images
- Analyzers: technical, local SEO, conversion, content, trust, business type detector
- Lighthouse integration
- Scoring: all category scorers, weighted final score, `prioritizeFindings`
- Report generation: `buildJsonReport`, `buildHtmlReport`, `scanRepository` persistence

---

## 8. Extension Points

| What to add | Where |
|---|---|
| New analyzer (e.g. new check category) | `src/engine/analyzers/` — implement `AnalyzerOutput`, wire into `runAudit.ts` |
| New scan checks within a category | Add findings inside the relevant analyzer file |
| Additional scoring logic | `src/engine/scoring/` — each scorer receives `ScorerInput`, returns `ScoreOutput` |
| New report sections | `src/engine/reports/buildHtmlReport.ts` (Phase 7) and `reportTemplates.ts` |
| New business type | Add to `BusinessType` union in `audit.ts`, add label in `BusinessTypeSelect.tsx`, add detection in `businessTypeDetector.ts` |
| New IPC channels | Define in `src/engine/types/ipc.ts`, implement in `electron/ipc/`, expose in `electron/preload.ts` |
