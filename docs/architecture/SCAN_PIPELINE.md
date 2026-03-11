# Scan Pipeline

This document traces the complete journey from URL input to AuditResult returned to the UI.

## Entry Point

`src/engine/orchestrator/runAudit.ts` — `runAudit(request: AuditRequest, emitProgress: ProgressEmitter): Promise<AuditResult>`

`emitProgress` is provided by the IPC scan handler (`electron/ipc/scanHandlers.ts`) and calls `mainWindow.webContents.send('scan:progress', event)` to push progress events to the renderer.

---

## Step 1 — Validate and Normalize URL (2%)

`emitProgress('Validating URL…', 2)`

Calls `normalizeInputUrl(request.url)` from `src/engine/utils/domain.ts`.

- Adds `https://` if no protocol present
- Lowercases hostname
- Strips trailing slash from pathname

Throws `Error('Invalid URL: ...')` if the URL cannot be parsed. This propagates back to the renderer as a rejected IPC invoke.

Also calls `getDomain(normalizedUrl)` and `generateScanId(domain)` to create the scan identifier.

---

## Step 2 — Launch Playwright Browser (5%)

`emitProgress('Launching browser…', 5)`

Dynamic import of `playwright` (kept out of renderer bundle):

```typescript
const { chromium } = await import('playwright')
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', ...] })
```

**Can fail if**: Playwright Chromium is not installed. Playwright installs it on `npm install` via the `postinstall` script, but if `node_modules` was manually pruned this step will throw.

The browser instance is closed in a `finally` block regardless of what happens in later steps.

---

## Step 3 — Fetch robots.txt (8%)

`emitProgress('Loading robots.txt…', 8)`

`fetchRobots(normalizedUrl)` in `src/engine/crawl/robots.ts`.

- Fetches `<origin>/robots.txt` using Node.js global `fetch` with a 10-second timeout
- Parses `User-agent: *` and `User-agent: Googlebot` sections
- Extracts `Disallow:` paths and `Sitemap:` URLs
- Returns `{ found: boolean, disallowedPaths, sitemapUrls, allowsGooglebot }`

**On failure**: Returns `{ found: false, ... }` — never throws. A missing robots.txt becomes a low-severity finding in the technical analyzer.

---

## Step 4 — Discover Sitemap (12%)

`emitProgress('Loading sitemap…', 12)`

`fetchSitemap(normalizedUrl, robotsResult.sitemapUrls)` in `src/engine/crawl/sitemap.ts`.

- Tries URLs from robots.txt Sitemap: directives first
- Falls back to common paths: `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap.php`, `/wp-sitemap.xml`, `/sitemap-index.xml`
- Parses both `<urlset>` (regular sitemap) and `<sitemapindex>` (sitemap index) formats using `cheerio/slim` in XML mode
- For sitemap index files, returns the child sitemap URLs (does not recursively fetch them)
- Returns `{ found: boolean, urls: string[], sitemapUrl?: string }`

**On failure**: Returns `{ found: false, urls: [] }`. A missing sitemap becomes a medium-severity finding.

---

## Step 5 — BFS Crawl (16% → 65%)

`emitProgress('Fetching homepage…', 16)`

`discoverUrls(normalizedUrl, browser, request.maxPages, domain, onProgress)` in `src/engine/crawl/discoverUrls.ts`.

The crawler creates a single `BrowserContext` (shared across all pages) with:
- Custom user agent string identifying the scanner
- `ignoreHTTPSErrors: true`
- Media/font loading not disabled (headers only hint at preference)

**BFS algorithm**:
1. Start queue with `[startUrl]`
2. While `queue.length > 0` and `fetchedPages.length < maxPages`:
   a. Dequeue next URL, skip if already visited
   b. `fetchHtml(url, context)` — Playwright page.goto with 30-second timeout, `waitUntil: 'domcontentloaded'`
   c. Skip if statusCode 0 and empty HTML (network error)
   d. Skip if response does not start with `<` (not HTML)
   e. Push to `fetchedPages`
   f. Extract internal links from HTML using `cheerio/slim`
   g. Filter links via `normalizeCrawlerUrl` + `isSameDomain` + `shouldSkipUrl`
   h. Add unseen links to queue

**Link filtering** (`src/engine/crawl/normalizeUrl.ts`):
- Resolves relative hrefs against the page's final URL
- Strips tracking params (utm_*, fbclid, gclid, etc.)
- Skips file extensions: pdf, jpg, png, gif, webp, svg, css, js, json, etc.
- Skips path segments: /wp-admin, /wp-json, /cart, /checkout, /account, /login, /feed, /tag/, /author/, /page/

**Same-domain check** (`isSameDomain`): Compares `new URL(a).hostname` to `new URL(b).hostname`. This is a strict hostname equality check, meaning `www.example.com` and `example.com` are treated as DIFFERENT domains. This is a known limitation — see [CURRENT_LIMITATIONS.md](../status/CURRENT_LIMITATIONS.md).

Progress callback maps crawl progress to the 16–65% range:
```typescript
const ratio = Math.min(fetched / Math.max(request.maxPages, 1), 1)
const pct = Math.round(16 + ratio * 49)
```

**Returns**: `{ fetchedPages: FetchHtmlResult[], internalLinkGraph: Record<string, string[]> }`

---

## Step 6 — Extract Signals and Classify Pages (66%)

`emitProgress('Extracting signals…', 66)`

For each `FetchHtmlResult` from the crawler:

1. `extractAllSignals(raw.html, raw.finalUrl)` — loads `cheerio/slim` once, runs all 9 extractors, returns `ExtractedSignals`
2. `classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)` — returns `PageType`
3. Constructs a `CrawledPage` object combining crawl metadata, signals, and page type

The resulting `crawledPages: CrawledPage[]` is used for all downstream analysis.

---

## Step 7 — Detect Business Type (72%)

`emitProgress('Detecting business type…', 72)`

`detectBusinessType(crawledPages, request.businessType)` in `src/engine/analyzers/businessTypeDetector.ts`.

- If user selected anything other than `'auto'`, returns that selection immediately
- If `'auto'`, builds a corpus from homepage title, H1s, URL, then all page titles/H1s, then first 1000 characters of homepage text content
- Tests corpus against 6 regex rules in priority order: restaurant, salon, roofer, auto_shop, contractor, dentist
- Returns `'other'` if no rule matches

---

## Step 8 — Run All Five Analyzers (76% → 88%)

```
emitProgress('Analyzing technical SEO…', 76)
emitProgress('Analyzing local SEO…', 80)
emitProgress('Analyzing conversions…', 84)
emitProgress('Analyzing content & trust…', 88)
```

All five analyzers run synchronously (no async work needed — they operate on the already-crawled pages):

```typescript
const [technical, localSeo, conversion, content, trust] = [
  analyzeTechnical(analyzerInput),
  analyzeLocalSeo(analyzerInput),
  analyzeConversion(analyzerInput),
  analyzeContent(analyzerInput),
  analyzeTrust(analyzerInput),
]
```

Each returns `{ findings: Finding[], notes: string[] }`.

The analyzer input is `AnalyzerInput`:
```typescript
{ pages, domain, robotsFound, sitemapFound, detectedBusinessType }
```

All findings are merged into `allFindings`.

---

## Step 9 — Lighthouse Performance Audit (90%)

`emitProgress('Running performance audit…', 90)`

`runLighthouse(normalizedUrl, chromiumPath)` in `src/engine/lighthouse/runLighthouse.ts`.

- Both `lighthouse` and `chrome-launcher` are ESM-only packages — loaded via dynamic `import()`
- Tries to launch system Chrome first; falls back to Playwright's bundled Chromium path
- Audits performance, SEO, and accessibility categories on mobile form factor (412×823)
- Returns `LighthouseMetrics | null`

**This step is best-effort**: any error is caught and logged as a warning. If Lighthouse fails or no Chrome is found, the scan continues without performance data.

If Lighthouse succeeds, `analyzeLighthouse(metrics)` converts metric values into additional `Finding` objects (with category `'technical'`):
- `lh-performance-poor` / `lh-performance-needs-work` (perf score < 50 / < 70)
- `lh-lcp-slow` / `lh-lcp-needs-work` (LCP > 4000ms / > 2500ms)
- `lh-tbt-high` / `lh-tbt-medium` (TBT > 600ms / > 200ms)
- `lh-cls-high` / `lh-cls-medium` (CLS > 0.25 / > 0.1)
- `lh-seo-low` (SEO score < 80)

These findings are appended to `allFindings`.

---

## Step 10 — Score All Categories and Compute Overall (92%)

`emitProgress('Scoring results…', 92)`

Five category scorers run against their respective finding sets and the crawled pages:

```typescript
const techScore    = scoreTechnical({ findings: technical.findings, pages, robotsFound, sitemapFound })
const localScore   = scoreLocalSeo({ findings: localSeo.findings, pages })
const convScore    = scoreConversion({ findings: conversion.findings, pages })
const contentScore = scoreContent({ findings: content.findings, pages })
const trustScore   = scoreTrust({ findings: trust.findings, pages, domain })
```

Each scorer uses `makeScore(findings, positives)` from `scoreHelpers.ts`:
- `computeScore`: starts at 100, deducts 20/10/4 per high/medium/low finding
- `scoreBand`: maps value to 'Strong' / 'Solid' / 'Needs Work' / 'Leaking Opportunity'

`computeWeightedScore(categoryScores)` combines the five scores with weights: Technical 25%, Local SEO 30%, Conversion 25%, Content 10%, Trust 10%.

`prioritizeFindings(allFindings)` sorts the combined finding list by `categoryWeight × severityWeight` (highest first). Returns a new array.

---

## Step 11 — Build and Save Reports (97%)

`emitProgress('Building reports…', 97)`

Three things happen in parallel:

1. `buildJsonReport(result, jsonPath)` — writes AuditResult as JSON with `html` and `textContent` stripped from pages (to keep file size reasonable)
2. `buildHtmlReport(result, htmlPath)` — writes a self-contained HTML report
3. `saveScan(result)` — updates `index.json` with the new `SavedScanMeta` entry

Paths are determined by `pathResolver.ts`:
- `jsonPath` = `<userData>/reports/<scanId>/report.json`
- `htmlPath` = `<userData>/reports/<scanId>/report.html`

---

## Step 12 — Complete (100%)

`emitProgress('Complete.', 100)`

The browser is closed (in the `finally` block) and `runAudit` returns the full `AuditResult`.

The IPC invoke resolves in `scanHandlers.ts`, which resolves the `ipcRenderer.invoke` promise in `useScanStore.startScan`. The store sets `latestResult` and `isScanning: false`. The `NewScanPage` `useEffect` detects `latestResult` and navigates to `/scan/results/:id`.

---

## Error Handling Summary

| Step | What happens on failure |
|---|---|
| URL validation | Throws — scan aborted, error shown in UI |
| Browser launch | Throws — scan aborted |
| robots.txt fetch | Returns safe default, continues |
| Sitemap fetch | Returns safe default, continues |
| Page fetch (individual) | Returns statusCode 0, skipped in crawl |
| Signal extraction | Returns empty signals if HTML is empty |
| Analyzers | Synchronous — TypeScript errors would surface at build time |
| Lighthouse | Caught, logged as warning, skipped — scan continues |
| Report writing | Throws — would propagate but browser is already closed |
| Scan index write | Throws — would propagate |
