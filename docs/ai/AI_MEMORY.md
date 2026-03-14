# AI Memory — Local SEO Scanner

Compact reference for AI assistants. Read this first when picking up any task in this codebase.

## System Overview

Desktop app: Electron 28 + React 18 + Vite 5 + TypeScript 5. **Market-level SEO analysis platform** for local businesses.

Three operating modes:
- **Single scan**: URL → `runAudit` → 12-stage pipeline → per-site score + report
- **Bulk scan**: Multiple domains → `runBulkScan` (sequential `runAudit` calls) → `BulkScanResult`
- **Market intelligence**: Discovery (DDG Lite) → candidate selection → bulk scan → `buildMarketDashboard` → outreach targets ranked by `computeOutreachScore()`

All data stored locally. No API keys. No cloud.

## Architecture Invariants (never violate these)

1. `src/engine/` has NO Electron/React imports — `pathResolver.ts` uses `initReportsDir(userDataPath)` and `monitoringPaths.ts` uses `initMonitoringDir(userDataPath)`, both called once from `electron/main.ts`
2. Engine uses `cheerio/slim`, never `cheerio` — undici conflict with Node.js 18 fetch
3. `playwright`, `lighthouse`, `chrome-launcher` must be loaded with `await import()` — ESM-only
4. `URL` is a global — never `import { URL } from 'url'`
5. Renderer only imports `type` from engine files — no runtime engine code in renderer bundle
6. `FindingCategory` uses `'localSeo'` throughout — the old `'local'` mismatch was resolved
7. HTML reports must be fully self-contained — no external CSS/JS/image references

## Three Build Targets

```
electron/main.ts    → out/main/index.js     (CJS, Node externalized)
electron/preload.ts → out/preload/index.js   (CJS, Node externalized)
src/index.html      → out/renderer/          (ESM browser bundle)
```

## Scan Pipeline Summary (12 stages in runScanJob.ts)

```
Stage 1:  validateStage       normalizeInputUrl, getDomain, generateScanId    → 2%
Stage 2:  crawlStage          browser launch, robots, sitemap, BFS crawl      → 5–65%
Stage 3:  extractStage        extractAllSignals, classifyPage, detectBizType  → 66–72%
Stage 4:  analysisStage       5 analyzers → categoryFindings + allFindings    → 76–88%
Stage 5:  visualStage*        screenshots + above-the-fold checks             → 89%
Stage 6:  impactStage*        Lighthouse + enrichFindingsWithImpact + sort    → 90%
Stage 7:  scoreStage          5 scorers + weighted overall (NO penalty)       → 92%
Stage 8:  competitorStage*    runCompetitorAnalysis (skipped if no URLs)      → 94%
Stage 9:  confidenceStage*    computeScoreConfidence                          → 95%
Stage 10: roadmapStage*       buildFixRoadmap (up to 10 items)                → 96%
Stage 11: revenueStage*       estimateRevenueImpact                           → 96%
Stage 12: reportStage         buildJsonReport + buildHtmlReport + saveScan    → 97%
          complete            browser.close() in finally block                → 100%
```
*optional — failure is caught by runOptional(); scan completes with reduced output

## Key Files

| File | Purpose |
|---|---|
| `src/engine/orchestrator/runAudit.ts` | Engine public API — thin wrapper around runScanJob |
| `src/engine/pipeline/runScanJob.ts` | Pipeline orchestrator — 12 stages, browser lifecycle |
| `src/engine/pipeline/types.ts` | ScanJobContext, createScanJobContext() |
| `src/engine/types/audit.ts` | All core interfaces (incl. ScoreConfidence, FixRoadmapItem, RevenueImpactEstimate) |
| `src/engine/types/ipc.ts` | IPC channels + ElectronAPI (includes bulk/discovery/market channels) |
| `src/engine/extractors/index.ts` | cheerio loaded once, all extractors run |
| `src/engine/scoring/scoreHelpers.ts` | PENALTY constants, computeScore, scoreBand |
| `src/engine/scoring/weightedFinalScore.ts` | Weights: tech 25%, local 30%, conv 25%, content 10%, trust 10% |
| `src/engine/scoring/prioritizeFindings.ts` | impactScore = categoryWeight × severityWeight |
| `src/engine/scoring/scoreConfidence.ts` | Scan completeness confidence (High/Medium/Low) |
| `src/engine/roadmap/buildFixRoadmap.ts` | Priority fix roadmap builder |
| `src/engine/revenue/estimateRevenueImpact.ts` | Heuristic revenue loss estimator |
| `src/engine/storage/pathResolver.ts` | Path helpers for all report artifacts (no Electron import) |
| `src/engine/monitoring/monitoringPaths.ts` | Path helpers for monitoring storage |
| `src/engine/bulk/runBulkScan.ts` | Sequential multi-domain scan orchestrator |
| `src/engine/discovery/marketDiscovery.ts` | DuckDuckGo Lite scraper + save |
| `src/engine/market/buildMarketDashboard.ts` | Enrich + rank bulk results → MarketDashboard |
| `src/engine/market/marketOpportunity.ts` | computeOutreachScore() — 0–11pt heuristic |
| `src/features/scans/state/useScanStore.ts` | Zustand store — single scan lifecycle |
| `src/features/bulk/useBulkScanStore.ts` | Zustand store — bulk scan lifecycle |
| `electron/ipc/scanHandlers.ts` | scan:start handler, emitProgress → webContents.send |
| `electron/ipc/bulkScanHandlers.ts` | bulk:start handler |
| `electron/ipc/discoveryHandlers.ts` | discovery:run handler |
| `electron/ipc/marketHandlers.ts` | market:build + monitoring:add-site handlers |

## Scoring Model

- Start at 100, deduct: high=20, medium=10, low=4
- Bands: 85+ Strong, 70+ Solid, 55+ Needs Work, <55 Leaking Opportunity
- Category weights (overall): tech 25%, localSeo 30%, conversion 25%, content 10%, trust 10%
- Overall score = weighted category average — NO impact penalty applied (was removed; caused double-penalization)
- prioritizeFindings sort key: CATEGORY_WEIGHT['localSeo'|'technical'|...] × SEVERITY_WEIGHT[severity]
- quickWins: top 5 high/medium findings → `.recommendation`
- moneyLeaks: top 5 high findings → `.summary`
- scoreConfidence: High/Medium/Low based on completeness signals (page count, Lighthouse, visual, competitor)
- roadmap: up to 10 FixRoadmapItem objects (cluster findings into strategic action items)
- revenueImpact: heuristic lead/revenue loss range; confidence always 'Medium'

## All Finding Categories and IDs

**technical**: technical-no-robots, technical-no-sitemap, technical-broken-pages, technical-noindex-money-pages, technical-missing-title, technical-short-title, technical-long-title, technical-missing-meta-desc, technical-missing-h1, technical-multiple-h1, technical-missing-canonical, technical-poor-image-alt

**localSeo**: local-no-phone-homepage, local-no-phone-contact, local-no-address-homepage, local-no-localbusiness-schema, local-no-map, local-no-hours, local-no-location-pages

**conversion**: conversion-no-cta-homepage, conversion-no-phone-homepage, conversion-no-form, conversion-no-form-contact-page, conversion-low-cta-coverage, conversion-no-booking-cta

**content**: content-thin-homepage, content-no-service-pages, content-too-few-service-pages, content-thin-service-pages, content-no-location-pages, content-widespread-thin-pages

**trust**: trust-no-https, trust-no-testimonials, trust-weak-trust-signals, trust-no-about-page, trust-no-gallery, trust-homepage-no-trust-content

**Lighthouse (technical)**: lh-performance-poor, lh-performance-needs-work, lh-lcp-slow, lh-lcp-needs-work, lh-tbt-high, lh-tbt-medium, lh-cls-high, lh-cls-medium, lh-seo-low

**visual (conversion/trust)**: visual-no-hero-clarity, visual-no-above-fold-cta, visual-no-phone-above-fold, visual-no-trust-signals-visible

## Important Gotchas

1. **www vs non-www**: FIXED — `isSameDomain` now calls `stripWww()` on both hostnames before comparing. Sites that redirect to www crawl correctly.

2. **cheerio/slim**: Must use `'cheerio/slim'` import path everywhere in engine. Using `'cheerio'` causes undici conflict with Node.js 18 built-in fetch.

3. **ESM dynamic imports**: `playwright`, `lighthouse`, `chrome-launcher` must be `await import(...)` not static imports.

4. **'localSeo' key**: `FindingCategory` is `'localSeo'` and `AuditScores` key is `localSeo` — consistent throughout after cleanup pass.

5. **buildClientSummary is NOT competitor analysis**: It translates the site's own findings into two groups (visibility / leads). Competitor analysis lives in `src/engine/competitor/` and only runs when `request.competitorUrls` is non-empty.

6. **Sitemap URLs not seeded into crawler**: The sitemap is found and counted for the `sitemapFound` signal, but the URLs it contains are not added to the BFS crawl queue.

7. **Lighthouse is best-effort**: Wrapped in try/catch. Any failure → scan continues without Lighthouse data. The `lighthouse` field in AuditResult will be undefined.

8. **pathResolver.ts and monitoringPaths.ts do not import Electron**: Both use setter patterns (`initReportsDir`, `initMonitoringDir`) called once from `electron/main.ts`. Fully testable outside Electron.

9. **Market dashboard does NOT re-scan**: `buildMarketDashboard()` only reads existing `BulkScanResult` and optionally loads already-saved `report.json` files. Never calls `runAudit()`.

10. **Monitoring writes in reportStage are fire-and-forget**: Wrapped in try/catch. A failure to write monitoring data never propagates to the caller or fails the scan. Check logs for `[reportStage] monitoring write failed`.

11. **Crawler domain guard (Phase 14)**: `discoverUrls.ts` checks `isSameDomain(result.finalUrl, targetDomain)` after each page fetch. Off-domain redirects are silently dropped. This is critical for bulk scans initiated from market discovery.

## Implementation Status

All phases complete: Phases 1–10, Phase 9+ (impact engine), Phase 11 (monitoring), Phase 13 (bulk scan), Phase 14 (market discovery), Phase 15 (market intelligence). Not implemented: Google APIs, international phone formats, sitemap seeding into BFS, auto-loading old scan results from disk in UI, competitor auto-discovery (stub only), periodic monitoring automation (data model ready; UI for scheduling not built).
