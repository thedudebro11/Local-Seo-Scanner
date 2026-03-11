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
  ↓  crawler → extractors → analyzers → lighthouse → scoring → reports
Saved artifacts on disk (userData/reports/)
```

- **Renderer** is a React + Vite SPA. Communicates with main exclusively via `window.api`.
- **Preload** exposes a typed bridge (`ElectronAPI`). No `nodeIntegration`.
- **Main** registers IPC handlers; delegates all scan logic to the engine via dynamic import.
- **Engine** lives in `src/engine/` and runs in the Node.js (main) process.

---

## 3. Core Scan Pipeline (fully implemented)

```
1.  Validate + normalize URL                    (2%)
2.  Launch Playwright browser                   (5%)
3.  Fetch robots.txt                            (8%)
4.  Fetch sitemap                               (12%)
5.  BFS crawl (Playwright, up to maxPages)      (16–65%)
6.  Extract all signals + classify pages        (66%)
7.  Detect business type                        (72%)
8.  Run 5 analyzers → findings                  (76–88%)
9.  Lighthouse performance audit (best-effort)  (90%)
10. Score all categories + weighted overall     (92%)
11. Write JSON + HTML reports to disk           (97%)
12. Save to scan index (scanRepository)         (97%)
→   Return AuditResult (scores, findings, artifacts, lighthouse)
```

---

## 4. Major Modules

| Path | Responsibility |
|---|---|
| `electron/` | Main process bootstrap, BrowserWindow creation, IPC registration |
| `electron/ipc/` | `scanHandlers`, `fileHandlers`, `appHandlers` |
| `electron/preload.ts` | Typed `contextBridge` — `startScan`, `onScanProgress`, `getSavedScans`, `openReport`, `openFolder`, `loadScan` |
| `src/app/` | React entry, hash router (5 routes) |
| `src/components/layout/` | `AppShell`, `Sidebar`, `Topbar` |
| `src/components/ui/` | `Button`, `Card`, `Input`, `Select`, `Badge`, `Progress`, `EmptyState` |
| `src/components/scan/` | `ScanForm`, `ScanProgress`, `ScoreOverview`, `IssueList`, `QuickWins`, `BusinessTypeSelect` |
| `src/components/reports/` | `ReportActions` — open HTML report / open reports folder |
| `src/features/scans/` | `NewScanPage`, `ScanResultsPage`, `SavedScansPage`, `useScanStore` (Zustand) |
| `src/features/dashboard/` | `DashboardPage` — stats, latest result banner, scan history |
| `src/engine/types/` | `audit.ts` (core types), `ipc.ts` (IPC channels + ElectronAPI) |
| `src/engine/utils/` | `domain.ts` (URL helpers), `logger.ts` |
| `src/engine/storage/` | `pathResolver.ts`, `scanRepository.ts` (real persistence via fs-extra) |
| `src/engine/orchestrator/` | `runAudit.ts` — full pipeline entry point |
| `src/engine/crawl/` | `fetchHtml`, `normalizeUrl`, `discoverUrls` (BFS), `classifyPage`, `robots`, `sitemap` |
| `src/engine/extractors/` | 9 extractors + `index.ts` barrel (`extractAllSignals`). Uses `cheerio/slim` (avoids undici/Node 18 issue) |
| `src/engine/analyzers/` | `businessTypeDetector`, `technicalAnalyzer`, `localSeoAnalyzer`, `conversionAnalyzer`, `contentAnalyzer`, `trustAnalyzer` |
| `src/engine/scoring/` | `scoreHelpers`, `scoreTechnical`, `scoreLocalSeo`, `scoreConversion`, `scoreContent`, `scoreTrust`, `weightedFinalScore`, `prioritizeFindings` |
| `src/engine/reports/` | `buildJsonReport`, `buildHtmlReport`, `reportTemplates`, `buildClientSummary` |
| `src/engine/lighthouse/` | `runLighthouse` (chrome-launcher + dynamic ESM import), `lighthouseAnalyzer` |

---

## 5. Data Models (src/engine/types/audit.ts)

| Type | Description |
|---|---|
| `AuditRequest` | `url`, `scanMode` (quick/full), `businessType`, `maxPages` |
| `AuditResult` | `id`, `domain`, `pages`, `findings`, `scores`, `quickWins`, `moneyLeaks`, `lighthouse?`, `artifacts` |
| `CrawledPage` | One fetched page + all extracted signals |
| `Finding` | `id`, `category`, `severity`, `title`, `summary`, `whyItMatters`, `recommendation`, `affectedUrls?` |
| `FindingCategory` | `'technical' \| 'local' \| 'conversion' \| 'content' \| 'trust'` |
| `CategoryScore` | `value` (0–100), `label`, `rationale[]` |
| `AuditScores` | `technical`, `localSeo`, `conversion`, `content`, `trust`, `overall` |
| `LighthouseMetrics` | `performanceScore`, `seoScore`, `accessibilityScore`, Core Web Vitals (FCP, LCP, TBT, CLS, SI) |
| `SavedScanMeta` | Index entry: `id`, `domain`, `scannedAt`, `overallScore`, `jsonPath`, `htmlPath` |

Score weights: Technical 25%, Local SEO 30%, Conversion 25%, Content 10%, Trust 10%.
Finding categories in code use `'local'` (not `'localSeo'`).

---

## 6. Key Implementation Notes

- **cheerio/slim**: All runtime cheerio imports use `cheerio/slim` to avoid loading `undici` (which requires Node.js ≥ 20, but Electron 28 ships Node 18).
- **Lighthouse + chrome-launcher**: Both are ESM-only — loaded via `await import(...)` dynamic import. Uses system Chrome auto-detected by chrome-launcher; falls back to Playwright's bundled Chromium path.
- **Playwright**: Loaded via `await import('playwright')` (CJS-compatible). Chromium must be installed: `npx playwright install chromium`.
- **Scan artifacts**: Written to `userData/reports/<scanId>/` — `report.json` (html stripped) and `report.html` (self-contained).
- **Scan index**: `userData/reports/index.json` — append-only list of `SavedScanMeta`, newest-first on read.

---

## 7. Implementation Status — ALL PHASES COMPLETE

- [x] Phase 1 — Electron shell, React shell, IPC skeleton, types, utils
- [x] Phase 2 — Zustand store, ScanForm, progress wiring
- [x] Phase 3 — Real crawler (Playwright BFS, robots, sitemap, classifyPage)
- [x] Phase 4 — All 9 extractors (extractAllSignals barrel)
- [x] Phase 5 — All 5 analyzers + businessTypeDetector
- [x] Phase 6 — Scoring (5 category scorers, weighted overall, prioritizeFindings)
- [x] Phase 7 — JSON + HTML report generation, scanRepository persistence
- [x] Phase 8 — Lighthouse integration + Core Web Vitals findings

---

## 8. Extension Points

| What to add | Where |
|---|---|
| New analyzer check | Add finding in the relevant `src/engine/analyzers/` file |
| New scoring positive signal | Add to the relevant `src/engine/scoring/score*.ts` file |
| New report section | `buildHtmlReport.ts` + `reportTemplates.ts` |
| New business type | `audit.ts` union + `BusinessTypeSelect.tsx` + `businessTypeDetector.ts` |
| New IPC channel | `src/engine/types/ipc.ts` → `electron/ipc/` → `electron/preload.ts` |
