# AI Memory — Local SEO Scanner

Compact reference for AI assistants. Read this first when picking up any task in this codebase.

## System Overview

Desktop app: Electron 28 + React 18 + Vite 5 + TypeScript 5. Audits local business websites for SEO and conversion issues. Entry: user submits URL → Playwright crawls site → extractors parse HTML → analyzers generate findings → scorers rate each category → JSON + HTML reports saved → results shown in UI.

## Architecture Invariants (never violate these)

1. `src/engine/` has NO Electron/React imports (except `pathResolver.ts` which imports `app`)
2. Engine uses `cheerio/slim`, never `cheerio` — undici conflict with Node.js 18 fetch
3. `playwright`, `lighthouse`, `chrome-launcher` must be loaded with `await import()` — ESM-only
4. `URL` is a global — never `import { URL } from 'url'`
5. Renderer only imports `type` from engine files — no runtime engine code in renderer bundle
6. `FindingCategory` uses `'local'` but `AuditScores` key is `'localSeo'` — known mismatch, documented, do not "fix" one side without the other
7. HTML reports must be fully self-contained — no external CSS/JS/image references

## Three Build Targets

```
electron/main.ts    → out/main/index.js     (CJS, Node externalized)
electron/preload.ts → out/preload/index.js   (CJS, Node externalized)
src/index.html      → out/renderer/          (ESM browser bundle)
```

## Scan Pipeline Summary (numbered steps)

```
1.  normalizeInputUrl(url)               → 2%
2.  chromium.launch()                    → 5%
3.  fetchRobots(url)                     → 8%
4.  fetchSitemap(url, robotsSitemapUrls) → 12%
5.  discoverUrls BFS (Playwright)        → 16–65%
6.  extractAllSignals + classifyPage     → 66%
7.  detectBusinessType                   → 72%
8.  analyze* x5                          → 76–88%
9.  runLighthouse (best-effort)          → 90%
10. score* x5 + computeWeightedScore     → 92%
11. prioritizeFindings                   → (in step 10)
12. buildJsonReport + buildHtmlReport    → 97%
13. saveScan (index.json)                → 97%
14. return AuditResult                   → 100%
```

## Key Files

| File | Purpose |
|---|---|
| `src/engine/orchestrator/runAudit.ts` | Engine entry point |
| `src/engine/types/audit.ts` | All core interfaces |
| `src/engine/types/ipc.ts` | IPC channels + ElectronAPI |
| `src/engine/extractors/index.ts` | cheerio loaded once, all extractors run |
| `src/engine/scoring/scoreHelpers.ts` | PENALTY constants, computeScore, scoreBand |
| `src/engine/scoring/weightedFinalScore.ts` | Weights: tech 25%, local 30%, conv 25%, content 10%, trust 10% |
| `src/engine/scoring/prioritizeFindings.ts` | impactScore = categoryWeight × severityWeight |
| `src/engine/storage/pathResolver.ts` | ONLY engine file importing Electron |
| `src/features/scans/state/useScanStore.ts` | Zustand store — scan lifecycle |
| `electron/ipc/scanHandlers.ts` | scan:start handler, emitProgress → webContents.send |

## Scoring Model

- Start at 100, deduct: high=20, medium=10, low=4
- Bands: 85+ Strong, 70+ Solid, 55+ Needs Work, <55 Leaking Opportunity
- Category weights (overall): tech 25%, localSeo 30%, conversion 25%, content 10%, trust 10%
- prioritizeFindings sort key: CATEGORY_WEIGHT['local'|'technical'|...] × SEVERITY_WEIGHT[severity]
- quickWins: top 5 high/medium findings → `.recommendation`
- moneyLeaks: top 5 high findings → `.summary`

## All Finding Categories and IDs

**technical**: technical-no-robots, technical-no-sitemap, technical-broken-pages, technical-noindex-money-pages, technical-missing-title, technical-short-title, technical-long-title, technical-missing-meta-desc, technical-missing-h1, technical-multiple-h1, technical-missing-canonical, technical-poor-image-alt

**local**: local-no-phone-homepage, local-no-phone-contact, local-no-address-homepage, local-no-localbusiness-schema, local-no-map, local-no-hours, local-no-location-pages

**conversion**: conversion-no-cta-homepage, conversion-no-phone-homepage, conversion-no-form, conversion-no-form-contact-page, conversion-low-cta-coverage, conversion-no-booking-cta

**content**: content-thin-homepage, content-no-service-pages, content-too-few-service-pages, content-thin-service-pages, content-no-location-pages, content-widespread-thin-pages

**trust**: trust-no-https, trust-no-testimonials, trust-weak-trust-signals, trust-no-about-page, trust-no-gallery, trust-homepage-no-trust-content

**Lighthouse (technical)**: lh-performance-poor, lh-performance-needs-work, lh-lcp-slow, lh-lcp-needs-work, lh-tbt-high, lh-tbt-medium, lh-cls-high, lh-cls-medium, lh-seo-low

## Important Gotchas

1. **www vs non-www**: `isSameDomain` uses exact hostname equality. If site redirects bare domain to www, only the homepage is crawled. User must enter the www version.

2. **cheerio/slim**: Must use `'cheerio/slim'` import path everywhere in engine. Using `'cheerio'` causes undici conflict with Node.js 18 built-in fetch.

3. **ESM dynamic imports**: `playwright`, `lighthouse`, `chrome-launcher` must be `await import(...)` not static imports.

4. **'local' vs 'localSeo' key**: Findings use `category: 'local'`, scores use `scores.localSeo`. Both are correct — they refer to the same category with different key names in different data structures.

5. **buildClientSummary is NOT competitor analysis**: It translates the site's own findings into two groups (visibility / leads). No competitor data is fetched or compared.

6. **Sitemap URLs not seeded into crawler**: The sitemap is found and counted for the `sitemapFound` signal, but the URLs it contains are not added to the BFS crawl queue.

7. **Lighthouse is best-effort**: Wrapped in try/catch. Any failure → scan continues without Lighthouse data. The `lighthouse` field in AuditResult will be undefined.

8. **pathResolver.ts imports Electron**: Only engine file that does. Contains `app.getPath('userData')`. Not usable outside Electron without a replacement.

## Implementation Status

All 8 phases complete. Not implemented: competitor analysis, Google APIs, international phone formats, sitemap seeding into BFS, auto-loading old scan results from disk in UI.
