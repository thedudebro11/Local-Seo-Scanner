# AI Agent Handoff Document

This document provides the full context needed for an AI agent (or developer) to safely continue development on the Local SEO Scanner project.

---

## What This App Is

A cross-platform desktop application (Electron) that audits local business websites. The user enters a URL, selects their business type, and the app crawls the site, analyzes it across 5 categories (Technical SEO, Local SEO, Conversion, Content, Trust), generates a score, and produces a prioritized report of issues with fix recommendations.

The target user is a local SEO agency or consultant auditing client sites. Reports are saved locally and can be opened as self-contained HTML files.

---

## Current State

All phases are complete — the original 8 plus Phase 9 (Visual UX Analysis), Phase 9+ (Impact Engine), and Phase 10 (Competitor Gap Analysis). The app builds, runs, and produces real audit results. The codebase is clean TypeScript with no `any` types in critical paths.

---

## Architecture in One Paragraph

Three-process Electron app. Renderer (React + Zustand) talks to the main process via a contextBridge preload. All audit logic runs in `src/engine/` which is a self-contained Node.js library — no Electron/React imports except `pathResolver.ts`. Engine is dynamically imported by IPC handlers so it never enters the renderer bundle. Crawler uses Playwright BFS. Extractors use cheerio/slim. Lighthouse runs best-effort after the crawl. The audit pipeline is 12 named stages in `src/engine/pipeline/`; `runAudit.ts` is a thin wrapper. Reports are written to `userData/reports/`. Scan index is in `userData/reports/index.json`.

---

## What's Done

Full pipeline:
- Playwright BFS crawler with robots.txt + sitemap discovery
- www vs non-www mismatch fixed (`stripWww` in `isSameDomain`)
- 9 extractors (meta, headings, schema, contact, local signals, CTAs, trust, images, text stats)
- 5 analyzers producing ~40 finding types across `technical`, `localSeo`, `conversion`, `content`, `trust`
- 5 category scorers + weighted overall score (no impact penalty — was double-penalizing; removed)
- **Phase 9**: Visual UX analysis — Playwright screenshots + 4 above-the-fold DOM checks (`src/engine/visual/`)
- **Phase 9+**: Impact Engine — 38-rule impact estimation layer, impact badges in HTML report (`src/engine/impactAnalyzer.ts`)
- Lighthouse integration (performance, SEO, accessibility, 9 finding types)
- **Phase 10**: Competitor gap analysis — crawl up to 3 URLs, 8 gap checks, HTML report section (`src/engine/competitor/`)
- **Score Confidence**: `computeScoreConfidence()` → `AuditResult.scoreConfidence` (`src/engine/scoring/scoreConfidence.ts`)
- **Priority Fix Roadmap**: `buildFixRoadmap()` → `AuditResult.roadmap` up to 10 items (`src/engine/roadmap/buildFixRoadmap.ts`)
- **Revenue Impact Estimator**: `estimateRevenueImpact()` → `AuditResult.revenueImpact` (`src/engine/revenue/estimateRevenueImpact.ts`)
- **Pipeline refactor**: 12 named stage modules in `src/engine/pipeline/`; `runAudit.ts` is a thin wrapper
- JSON + HTML report generation (self-contained, print-friendly, 16 sections)
- Scan repository (index.json, load/save/delete)
- React UI with all pages: dashboard, new scan, results, saved scans, settings
- ScanForm has 3 optional competitor URL inputs

---

## Known Issues to Fix

### Enhancement: Seed Sitemap URLs into Crawler

`fetchSitemap` returns `sitemapResult.urls` but `discoverUrls` ignores these. Deep pages linked only from the sitemap (not from other pages) are never crawled.

**Location**: `src/engine/pipeline/stages/crawlStage.ts`
**Fix**: Pass `sitemapResult.urls` as initial queue hints to `discoverUrls`.

### Enhancement: Load Old Scans from Disk in UI

`ScanResultsPage` shows an empty state if the result ID in the URL doesn't match `latestResult.id` in the Zustand store. The IPC channel `file:load-scan` exists and works, but the page doesn't auto-call it.

**Location**: `src/features/scans/ScanResultsPage.tsx`
**Fix**: Add a `useEffect` that calls `window.api.loadScan(params.id)` when `latestResult === null` or `latestResult.id !== params.id`.

---

## Architecture Rules (Must Follow)

1. No Electron/React imports in `src/engine/` — `pathResolver.ts` no longer imports Electron; it uses `initReportsDir(userDataPath)` called from `electron/main.ts`
2. Use `cheerio/slim` not `cheerio` (undici/Node.js 18 conflict)
3. `playwright`, `lighthouse`, `chrome-launcher` → dynamic `import()` only (ESM-only packages)
4. `URL` is a global — don't import it
5. Renderer uses only `import type` from engine files
6. `FindingCategory` uses `'localSeo'` throughout — findings, scores, and prioritization all use the same key
7. HTML reports must be self-contained (no external assets)
8. All artifact paths go through `pathResolver.ts`

---

## How to Add Features

### New Finding Type

1. Open the relevant analyzer in `src/engine/analyzers/`
2. Add a new `if` block that pushes a `Finding` to the `findings` array
3. The finding automatically gets scored, prioritized, and included in reports
4. Finding ID must be unique (pattern: `category-short-description`)

### New Page Signal

1. Create extractor file in `src/engine/extractors/`
2. Export interface + function accepting `CheerioAPI`
3. Add to barrel `src/engine/extractors/index.ts`: import, re-export type, add to `ExtractedSignals`, call in `extractAllSignals`, add to `emptySignals`
4. Add field to `CrawledPage` in `src/engine/types/audit.ts`
5. Wire field in `extractStage.ts` CrawledPage construction
6. Use in analyzer if desired

### New IPC Channel

1. Add channel name to `IpcChannel` in `src/engine/types/ipc.ts`
2. Add method to `ElectronAPI` in `src/engine/types/ipc.ts` and `electron/preload.ts`
3. Add `ipcMain.handle()` in appropriate handler file
4. Register in `electron/main.ts` if needed

### New Route / Page

1. Add component in `src/features/`
2. Add route to `src/app/routes.tsx`
3. Add navigation link in `src/components/layout/Sidebar.tsx`

---

## Common Pitfalls

1. **"My extractor breaks the build"** — Check if you accidentally used `import * as cheerio from 'cheerio'` instead of `'cheerio/slim'`. Also check you're not calling `cheerio.load()` inside an individual extractor (only the barrel does that).

2. **"Lighthouse is always skipped"** — This is expected if no Chrome is installed and Playwright's Chromium path isn't resolving. The scan still completes without Lighthouse data. Check the main process logs.

3. **"Score is always 0"** — `buildPlaceholderScores()` initializes scores at 0 before the scan runs. If the scoring step throws an exception (check for TypeScript errors in scorer files), the placeholder values are never replaced.

4. **"Only 1 page is crawled"** — www vs non-www: this was fixed via `stripWww()` in `isSameDomain`. If you see it again, check `src/engine/utils/domain.ts`.

5. **"The renderer can't see my new engine function"** — Engine functions must be called from the main process via IPC handlers, never imported directly in renderer code.

6. **"TypeScript errors about FindingCategory"** — `FindingCategory` is `'technical' | 'localSeo' | 'conversion' | 'content' | 'trust'`. Use `category: 'localSeo'` in analyzers. The old `'local'` value was cleaned up.

7. **"The HTML report shows escaped HTML"** — Make sure any new template helper uses `escHtml()` from `reportTemplates.ts` on all user-sourced strings. Forgetting this will show `&amp;` instead of `&` or worse, XSS in the report.

---

## Development Commands

```bash
npm run dev        # Start Electron dev app with HMR
npm run build      # Compile all 3 targets
npm run typecheck  # Type-check without emitting
npm run dist       # Build + package with electron-builder
```

## Testing

There are no automated tests in the current codebase. Manual testing is the only option. To test the engine in isolation:

```javascript
// In a Node.js script (not renderer)
const { runAudit } = await import('./src/engine/orchestrator/runAudit.js')
const result = await runAudit(
  { url: 'https://example.com', scanMode: 'quick', businessType: 'auto', maxPages: 5 },
  (step, percent) => console.log(`${percent}% - ${step}`)
)
console.log(JSON.stringify(result.scores, null, 2))
```

---

## File Structure Quick Reference

```
electron/           ← Electron-specific shell code
src/app/            ← React router and entry
src/components/     ← React UI components
src/features/       ← React pages and Zustand store
src/engine/         ← Pure Node.js audit engine
  types/            ← Shared TS interfaces (no runtime code)
  utils/            ← domain.ts, logger.ts
  crawl/            ← Playwright crawler
  extractors/       ← cheerio/slim extractors
  analyzers/        ← Finding generators
  scoring/          ← Score calculators + scoreConfidence.ts
  roadmap/          ← buildFixRoadmap.ts
  revenue/          ← estimateRevenueImpact.ts
  reports/          ← Report writers
  lighthouse/       ← Performance auditor
  visual/           ← Screenshot + above-the-fold checks
  competitor/       ← Competitor crawl + gap analysis
  storage/          ← File I/O
  pipeline/         ← runScanJob.ts orchestrator + 12 stage modules
  orchestrator/     ← runAudit.ts (thin wrapper around runScanJob)
docs/               ← All documentation
```
