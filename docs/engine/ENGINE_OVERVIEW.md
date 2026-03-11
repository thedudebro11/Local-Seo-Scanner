# Engine Overview

## What the Engine Does

`src/engine/` is a self-contained Node.js audit library. Given a URL and scan configuration, it:

1. Crawls the target website using Playwright
2. Extracts SEO and conversion signals from each page's HTML using cheerio
3. Runs the extracted data through five category analyzers to generate findings
4. Runs a Lighthouse performance audit
5. Scores each category using a deduction-based model
6. Prioritizes findings by business impact
7. Writes JSON and HTML reports to disk
8. Returns a complete `AuditResult`

## What the Engine Does NOT Do

- It does not import or use any Electron API (except `pathResolver.ts` which uses `app.getPath`)
- It does not import React
- It does not interact with the UI or IPC directly
- It does not compare the site against competitors (see [COMPETITOR_GAP_ANALYSIS.md](COMPETITOR_GAP_ANALYSIS.md))
- It does not check Google Search Console, Google My Business, or any third-party data sources
- It does not use a headless API — it crawls the live public website

## Engine Entry Point

`src/engine/orchestrator/runAudit.ts`

```typescript
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult>
```

The `emitProgress` callback is injected by the IPC handler. In the Electron context this calls `mainWindow.webContents.send('scan:progress', event)`. In a CLI or test context it can be a no-op or console logger.

## Full Pipeline in Code Form

```typescript
// 1. Normalize URL
normalizedUrl = normalizeInputUrl(request.url)
domain        = getDomain(normalizedUrl)
scanId        = generateScanId(domain)

// 2. Launch browser
browser = await chromium.launch(...)

// 3. Fetch robots.txt
robotsResult = await fetchRobots(normalizedUrl)

// 4. Fetch sitemap
sitemapResult = await fetchSitemap(normalizedUrl, robotsResult.sitemapUrls)

// 5. BFS crawl
{ fetchedPages } = await discoverUrls(normalizedUrl, browser, maxPages, domain)

// 6. Extract + classify
crawledPages = fetchedPages.map(raw => {
  const signals  = extractAllSignals(raw.html, raw.finalUrl)
  const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)
  return { ...raw, ...signals, pageType }
})

// 7. Detect business type
detectedBusinessType = detectBusinessType(crawledPages, request.businessType)

// 8. Run analyzers
const analyzerInput = { pages: crawledPages, domain, robotsFound, sitemapFound, detectedBusinessType }
technical = analyzeTechnical(analyzerInput)
localSeo  = analyzeLocalSeo(analyzerInput)
conversion= analyzeConversion(analyzerInput)
content   = analyzeContent(analyzerInput)
trust     = analyzeTrust(analyzerInput)
allFindings = [...technical.findings, ...localSeo.findings, ...]

// 9. Lighthouse (best-effort)
lhMetric = await runLighthouse(normalizedUrl, chromiumPath)
if (lhMetric) allFindings.push(...analyzeLighthouse(lhMetric))

// 10. Score
techScore    = scoreTechnical(...)
localScore   = scoreLocalSeo(...)
convScore    = scoreConversion(...)
contentScore = scoreContent(...)
trustScore   = scoreTrust(...)
scores.overall = computeWeightedScore({ technical, localSeo, conversion, content, trust })
allFindings    = prioritizeFindings(allFindings)

// 11. Reports
await buildJsonReport(result, jsonPath)
await buildHtmlReport(result, htmlPath)
await saveScan(result)

// 12. Return
return AuditResult
```

## Key Design Decisions

### cheerio/slim instead of cheerio

The `extractors` and `crawl` modules import `* as cheerio from 'cheerio/slim'` rather than from `cheerio`. The slim build excludes `htmlparser2` and its undici dependency, which conflicts with Node.js 18's built-in fetch in the Electron main process context.

### Dynamic imports for ESM-only packages

`playwright`, `lighthouse`, and `chrome-launcher` are ESM-only packages. They must be loaded with `await import(...)` rather than static `import` statements. This is done in `runAudit.ts` (for Playwright) and `runLighthouse.ts` (for lighthouse and chrome-launcher).

### Browser lifecycle ownership

`runAudit` creates the Playwright browser and passes it to `discoverUrls`. The browser is always closed in a `finally` block in `runAudit`, regardless of whether the crawl or any later step threw an error.

### Analyzer runs are synchronous

All five analyzers are synchronous functions. They operate only on the already-crawled `CrawledPage[]` array. No additional network requests happen in the analyzer phase.
