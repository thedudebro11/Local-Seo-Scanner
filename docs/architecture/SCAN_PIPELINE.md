# Scan Pipeline

This document traces the complete journey from URL input to AuditResult returned to the UI.

## Entry Points

**Public API**: `src/engine/orchestrator/runAudit.ts` — thin 24-line wrapper. Calls `runScanJob` and re-exports `ProgressEmitter`.

**Pipeline orchestrator**: `src/engine/pipeline/runScanJob.ts` — executes all 12 named stages in order, manages browser lifecycle, and assembles the final `AuditResult`.

```typescript
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult>
```

`emitProgress` is provided by the IPC scan handler (`electron/ipc/scanHandlers.ts`) and calls `mainWindow.webContents.send('scan:progress', event)` to push progress events to the renderer.

---

## Stage Architecture

Each stage is a named async function in `src/engine/pipeline/stages/`:

```
src/engine/pipeline/
├── runScanJob.ts          ← Orchestrator: required vs optional stage handling
├── types.ts               ← ScanJobContext, ScanStageResult<T>, createScanJobContext()
└── stages/
    ├── validateStage.ts
    ├── crawlStage.ts
    ├── extractStage.ts
    ├── analysisStage.ts
    ├── visualStage.ts
    ├── impactStage.ts
    ├── scoreStage.ts
    ├── competitorStage.ts
    ├── confidenceStage.ts
    ├── roadmapStage.ts
    ├── revenueStage.ts
    └── reportStage.ts
```

`ScanJobContext` is the mutable accumulator threaded through every stage. Required stages abort the job on failure; optional stages are wrapped in `runOptional()` — they log on failure and the scan completes with reduced output.

### Required stages
`validate → crawl → extract → analysis → score → report`

### Optional stages
`visual → impact → competitor → confidence → roadmap → revenue`

---

## Stage 1 — validateStage (2%)

`emit('Validating URL…', 2)`

Calls `normalizeInputUrl(request.url)` from `src/engine/utils/domain.ts`.

- Adds `https://` if no protocol present
- Lowercases hostname
- Strips trailing slash from pathname

Also calls `getDomain(normalizedUrl)` and `generateScanId(domain)`. Stores `scanId`, `normalizedUrl`, `domain` on context.

Throws `Error('Invalid URL: ...')` if the URL cannot be parsed. Propagates back to the renderer as a rejected IPC invoke.

---

## Stage 2 — crawlStage (5% → 65%)

`emit('Launching browser…', 5)`

Dynamic import of `playwright` (kept out of renderer bundle):

```typescript
const { chromium } = await import('playwright')
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', ...] })
```

Stores `browser` and `chromiumPath` on context. `chromiumPath` is used later by Lighthouse which runs in a separate Chrome process.

Then runs in sequence:
- `fetchRobots(normalizedUrl)` (8%)
- `fetchSitemap(normalizedUrl, robotsSitemapUrls)` (12%)
- `discoverUrls BFS` (16–65%)

**Can fail if**: Playwright Chromium is not installed.

The browser instance is created here and closed in the orchestrator's `finally` block regardless of which stage succeeds.

---

## Stage 3 — extractStage (66%)

`emit('Extracting signals…', 66)` → `emit('Detecting business type…', 72)`

For each `FetchHtmlResult` from the crawler:
1. `extractAllSignals(raw.html, raw.finalUrl)` — loads `cheerio/slim` once, runs all 9 extractors
2. `classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)` — returns `PageType`

Then `detectBusinessType(crawledPages, request.businessType)`.

Stores `pages: CrawledPage[]` and `detectedBusinessType` on context.

---

## Stage 4 — analysisStage (76% → 88%)

```
emit('Analyzing technical SEO…', 76)
emit('Analyzing local SEO…', 80)
emit('Analyzing conversions…', 84)
emit('Analyzing content & trust…', 88)
```

All five analyzers run synchronously:

```typescript
const [technical, localSeo, conversion, content, trust] = [
  analyzeTechnical(analyzerInput),
  analyzeLocalSeo(analyzerInput),
  analyzeConversion(analyzerInput),
  analyzeContent(analyzerInput),
  analyzeTrust(analyzerInput),
]
```

Stores `categoryFindings` (per-category arrays, used by scoreStage) and `allFindings` (merged, appended to by later stages) on context.

---

## Stage 5 — visualStage (89%) — optional

`emit('Capturing visual screenshots…', 89)`

`runVisualAnalysis(browser, crawledPages, screenshotDir)` in `src/engine/visual/visualAnalyzer.ts`.

Requires `ctx.browser` (still open at this point). Opens the homepage and up to one contact/service page at 1280×800px, takes full-page screenshots, and runs four DOM checks on the homepage:
- `checkAboveFoldCta` — CTA button/link text above the fold
- `checkPhoneVisible` — `tel:` link or phone number above the fold
- `checkTrustSignals` — trust keywords near the top
- `checkHeroClarity` — non-empty H1 above the fold

Visual findings (category `conversion` or `trust`, severity `medium`) are appended to `allFindings`. Stores `visualResult` and `screenshotPaths` on context.

**Optional**: failure is caught by orchestrator; scan continues without visual data.

---

## Stage 6 — impactStage (90%) — optional

`emit('Running performance audit…', 90)`

Two things run in this stage:

1. **Lighthouse** (inner try/catch): `runLighthouse(normalizedUrl, chromiumPath)`. If it succeeds, `analyzeLighthouse(metrics)` produces additional findings appended to `allFindings`. Stores result in `lighthouseMetrics`.

2. **Impact enrichment**: `enrichFindingsWithImpact(allFindings, detectedBusinessType)` adds three fields to every finding: `impactLevel` (CRITICAL / HIGH / MEDIUM / LOW), `impactReason`, `estimatedBusinessEffect`. Uses 38 specific finding-ID rules with category × severity fallback.

3. **Prioritization**: `prioritizeFindings(allFindings)` sorts findings by `categoryWeight × severityWeight`, highest first.

**Optional**: any failure is caught by orchestrator.

---

## Stage 7 — scoreStage (92%) — required

`emit('Scoring results…', 92)`

Five category scorers run against `ctx.categoryFindings` (NOT `allFindings`) to maintain scoring model accuracy:

```typescript
const techScore    = scoreTechnical({ findings: categoryFindings.technical, pages, robotsFound, sitemapFound })
const localScore   = scoreLocalSeo({ findings: categoryFindings.localSeo, pages })
const convScore    = scoreConversion({ findings: categoryFindings.conversion, pages })
const contentScore = scoreContent({ findings: categoryFindings.content, pages })
const trustScore   = scoreTrust({ findings: categoryFindings.trust, pages, domain })
```

`computeWeightedScore(categoryScores)` combines with weights: Technical 25%, Local SEO 30%, Conversion 25%, Content 10%, Trust 10%.

Also computes `quickWins` (top 5 recommendations from high/medium findings) and `moneyLeaks` (top 5 summaries from high findings).

**Note**: The overall score is the weighted category average only. No impact penalty is applied — category scores already reflect findings via the deduction model.

---

## Stage 8 — competitorStage (94%) — optional

`emit('Analyzing competitors…', 94)`

Skipped when `request.competitorUrls` is empty or absent.

`runCompetitorAnalysis(browser, normalizedUrl, pages, competitorUrls.slice(0, 3))` in `src/engine/competitor/index.ts`.

Requires `ctx.browser` (still open at this point — this is the last stage to use the browser). Each competitor is crawled with `discoverUrls` (maxPages=5). `Promise.allSettled` isolates per-competitor failures.

Stores `competitorResult` on context.

**Optional**: failure is caught by orchestrator.

---

## Stage 9 — confidenceStage (95%) — optional

`emit('Computing score confidence…', 95)`

`computeScoreConfidence({ pages, lighthouse, visual, competitor })` in `src/engine/scoring/scoreConfidence.ts`.

Computes a `ScoreConfidence` object with a `level` ('High' / 'Medium' / 'Low') and plain-English `reason` explaining how complete and reliable the scan data is.

Scoring signals: page count (0–2 pts), homepage found (+1), key secondary pages (0–2 pts), Lighthouse ran (+1), no error pages (+1), visual analysis ran (+1), competitor analysis ran (+1). High ≥ 6, Medium 3–5, Low < 3.

Stores `scoreConfidence` on context.

**Optional**: failure is caught by orchestrator.

---

## Stage 10 — roadmapStage (96%) — optional

`emit('Building fix roadmap…', 96)`

`buildFixRoadmap({ findings, moneyLeaks })` in `src/engine/roadmap/buildFixRoadmap.ts`.

Converts enriched findings into up to 10 `FixRoadmapItem` objects. Each item has a `title`, `whyItMatters`, `plainEnglishFix`, `impact` ('Critical'/'High'/'Medium'/'Low'), `effort` ('Low'/'Medium'/'High'), `category`, `affectedUrls`, and `sourceFindingIds`.

14 cluster definitions group related findings into strategic action items. Items are ranked by `IMPACT_WEIGHT[impactLevel] + SEVERITY_SCORE[severity] + moneyLeak bonus + URL spread bonus`. Ungrouped high-scoring findings become individual items.

Stores `roadmap: FixRoadmapItem[]` on context.

**Optional**: failure is caught by orchestrator.

---

## Stage 11 — revenueStage (96%) — optional

`emit('Estimating revenue impact…', 96)`

`estimateRevenueImpact({ findings, detectedBusinessType, scoreConfidence })` in `src/engine/revenue/estimateRevenueImpact.ts`.

Translates issue severity into a heuristic business impact estimate using a per-`BusinessType` lead value table (e.g., roofer: $800–$3000/lead, salon: $40–$200/lead). Returns:
- `estimatedLeadLossRange` — low/high monthly lead loss estimate
- `estimatedRevenueLossRange` — low/high monthly revenue loss (leadLoss × leadValue × conversion rate)
- `impactDrivers` — top finding titles driving the estimate
- `confidence` — always capped at 'Medium' by design
- `assumptions` — 7 honesty disclaimers

Stores `revenueImpact` on context.

**Optional**: failure is caught by orchestrator.

---

## Stage 12 — reportStage (97%) — required

`emit('Building reports…', 97)`

Three things happen:

1. `buildJsonReport(result, jsonPath)` — writes AuditResult as JSON with `html` and `textContent` stripped from pages
2. `buildHtmlReport(result, htmlPath)` — writes a self-contained HTML report
3. `saveScan(result)` — updates `index.json` with the new `SavedScanMeta` entry

Paths: `<userData>/reports/<scanId>/report.json` and `<userData>/reports/<scanId>/report.html`

Stores `artifacts` on context.

**Required**: throws on failure.

---

## Complete (100%)

`emit('Complete.', 100)`

Browser is closed in the orchestrator's `finally` block (after all stages, regardless of failures). `buildAuditResult(ctx, jsonPath, htmlPath)` assembles and returns the final `AuditResult`.

---

## Error Handling Summary

| Stage | Required? | What happens on failure |
|---|---|---|
| validate | Required | Throws — scan aborted, error shown in UI |
| crawl (browser launch) | Required | Throws — scan aborted |
| crawl (robots/sitemap) | — | Returns safe default, continues |
| crawl (individual page) | — | Returns statusCode 0, skipped |
| extract | Required | Throws — scan aborted |
| analysis | Required | Throws — scan aborted |
| visual | Optional | Logged as warning — scan continues without visual data |
| impact (Lighthouse) | Optional | Inner try/catch — scan continues without Lighthouse data |
| impact (enrichment) | Optional | Logged as warning — findings lose impact fields |
| score | Required | Throws — scan aborted |
| competitor | Optional | Logged as warning — scan continues without competitor data |
| confidence | Optional | Logged as warning — scan completes without confidence metadata |
| roadmap | Optional | Logged as warning — scan completes without roadmap |
| revenue | Optional | Logged as warning — scan completes without revenue estimate |
| report | Required | Throws — would propagate (browser already closed) |
