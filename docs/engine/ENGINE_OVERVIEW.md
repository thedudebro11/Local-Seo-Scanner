# Engine Overview

## What the Engine Does

`src/engine/` is a self-contained Node.js audit library. Given a URL and scan configuration, it:

1. Crawls the target website using Playwright
2. Extracts SEO and conversion signals from each page's HTML using cheerio
3. Runs the extracted data through five category analyzers to generate findings
4. Captures screenshots and runs above-the-fold DOM checks via Playwright (visual analysis)
5. Runs a Lighthouse performance audit
6. Scores each category using a deduction-based model
7. Enriches each finding with business impact estimation (impactLevel, impactReason, estimatedBusinessEffect)
8. Optionally crawls up to 3 competitor sites and identifies gaps
9. Computes scan confidence metadata (High/Medium/Low) based on completeness signals
10. Builds a plain-English priority fix roadmap from enriched findings
11. Estimates heuristic revenue/lead loss from detected issues
12. Writes JSON and HTML reports to disk
13. Returns a complete `AuditResult`

## What the Engine Does NOT Do

- It does not import or use any Electron API (`pathResolver.ts` is initialized via `initReportsDir(userDataPath)` called from `electron/main.ts` — no direct Electron import in the engine)
- It does not import React
- It does not interact with the UI or IPC directly
- It does not auto-discover competitor URLs (manual entry only; `noopDiscovery` stub always returns `[]`)
- It does not check Google Search Console, Google My Business, or any third-party data sources
- It does not use a headless API — it crawls the live public website

## Engine Entry Point

**Public API**: `src/engine/orchestrator/runAudit.ts` — thin 24-line wrapper. Calls `runScanJob` from the pipeline.

**Pipeline orchestrator**: `src/engine/pipeline/runScanJob.ts` — executes 12 named stages in order, manages browser lifecycle, and handles optional stage failures.

```typescript
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult>
```

The `emitProgress` callback is injected by the IPC handler. In the Electron context this calls `mainWindow.webContents.send('scan:progress', event)`. In a CLI or test context it can be a no-op or console logger.

## Full Pipeline in Code Form

The pipeline runs as 12 named stages. Required stages abort on failure; optional stages are wrapped in `runOptional()`.

```typescript
// ── Required stages ──────────────────────────────────────────────────────
// validateStage (2%)
normalizedUrl = normalizeInputUrl(request.url)
domain        = getDomain(normalizedUrl)
scanId        = generateScanId(domain)

// crawlStage (5–65%)
browser = await chromium.launch(...)        // stores chromiumPath for Lighthouse
robotsResult  = await fetchRobots(normalizedUrl)
sitemapResult = await fetchSitemap(normalizedUrl, robotsResult.sitemapUrls)
{ fetchedPages } = await discoverUrls(normalizedUrl, browser, maxPages, domain)

// extractStage (66–72%)
crawledPages = fetchedPages.map(raw => {
  const signals  = extractAllSignals(raw.html, raw.finalUrl)
  const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)
  return { ...raw, ...signals, pageType }
})
detectedBusinessType = detectBusinessType(crawledPages, request.businessType)

// analysisStage (76–88%)
const analyzerInput = { pages: crawledPages, domain, robotsFound, sitemapFound, detectedBusinessType }
categoryFindings = {
  technical: analyzeTechnical(analyzerInput).findings,
  localSeo:  analyzeLocalSeo(analyzerInput).findings,
  conversion:analyzeConversion(analyzerInput).findings,
  content:   analyzeContent(analyzerInput).findings,
  trust:     analyzeTrust(analyzerInput).findings,
}
allFindings = [...all categoryFindings merged]

// ── Optional stages (browser still open) ─────────────────────────────────
// visualStage (89%, optional)
{ visualResult, findings: vFindings } = await runVisualAnalysis(browser, crawledPages, screenshotDir)
allFindings = [...allFindings, ...vFindings]

// impactStage (90%, optional)
lhMetric = await runLighthouse(normalizedUrl, chromiumPath)   // inner try/catch
if (lhMetric) allFindings.push(...analyzeLighthouse(lhMetric))
allFindings = enrichFindingsWithImpact(allFindings, detectedBusinessType)
allFindings = prioritizeFindings(allFindings)

// ── Required (score must succeed) ────────────────────────────────────────
// scoreStage (92%)
// NOTE: Scores use categoryFindings (NOT allFindings) — category scorers
// must not see Lighthouse/visual findings from other categories.
scores.overall = computeWeightedScore({ technical, localSeo, conversion, content, trust })
// No impact penalty applied — the deduction model already reflects findings.

// ── Optional (browser still open for competitor) ──────────────────────────
// competitorStage (94%, optional)
if (request.competitorUrls?.length) {
  competitorResult = await runCompetitorAnalysis(browser, normalizedUrl, crawledPages, competitorUrls)
}

// ── Optional (browser no longer needed after competitorStage) ────────────
// confidenceStage (95%, optional)
scoreConfidence = computeScoreConfidence({ pages, lighthouse, visual, competitor })

// roadmapStage (96%, optional)
roadmap = buildFixRoadmap({ findings: allFindings, moneyLeaks })

// revenueStage (96%, optional)
revenueImpact = estimateRevenueImpact({ findings: allFindings, detectedBusinessType, scoreConfidence })

// ── Required (write files) ────────────────────────────────────────────────
// reportStage (97%)
await buildJsonReport(result, jsonPath)
await buildHtmlReport(result, htmlPath)
await saveScan(result)

// Complete (100%)
browser.close()   // always in finally block
return AuditResult
```

## Key Design Decisions

### cheerio/slim instead of cheerio

The `extractors` and `crawl` modules import `* as cheerio from 'cheerio/slim'` rather than from `cheerio`. The slim build excludes `htmlparser2` and its undici dependency, which conflicts with Node.js 18's built-in fetch in the Electron main process context.

### Dynamic imports for ESM-only packages

`playwright`, `lighthouse`, and `chrome-launcher` are ESM-only packages. They must be loaded with `await import(...)` rather than static `import` statements. This is done in `runAudit.ts` (for Playwright) and `runLighthouse.ts` (for lighthouse and chrome-launcher).

### Browser lifecycle ownership

`crawlStage` creates the Playwright browser and stores it on `ScanJobContext`. The browser is always closed in a `finally` block in the pipeline orchestrator (`runScanJob.ts`), regardless of which stage succeeded or failed. The browser must remain open through `competitorStage` (the last stage to use it).

### Analyzer runs are synchronous

All five analyzers are synchronous functions. They operate only on the already-crawled `CrawledPage[]` array. No additional network requests happen in the analyzer phase.
