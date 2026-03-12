# Competitor Gap Analysis

## Status: IMPLEMENTED (Phase 10)

Competitor gap analysis is fully implemented. Users provide up to three competitor URLs when submitting a scan. The engine crawls each competitor site, extracts comparable signals, and identifies gaps where the audited site falls behind the majority of competitors.

---

## How It Works

If `AuditRequest.competitorUrls` contains at least one URL, the engine runs the competitor step after the main site scoring step (at ~94% progress). Each competitor is crawled using the same Playwright BFS crawler, limited to 5 pages each. Crawls run in parallel via `Promise.allSettled` so one failed crawl never aborts the others.

---

## Module: src/engine/competitor/

I implemented competitor analysis as a self-contained module:

| File | Purpose |
|---|---|
| `index.ts` | Orchestrator — `runCompetitorAnalysis(browser, clientUrl, clientPages, competitorUrls)` |
| `competitorCrawler.ts` | Reuses `discoverUrls` (maxPages=5) + `extractAllSignals` + `classifyPage` per competitor |
| `competitorAnalyzer.ts` | Pure function — converts crawled pages into a `CompetitorSite` signal summary |
| `gapAnalysis.ts` | Compares client signals vs competitors; returns `CompetitorGap[]` |
| `competitorDiscovery.ts` | Pluggable stub for future auto-discovery (`noopDiscovery` returns `[]`) |
| `competitorTypes.ts` | Re-exports `CompetitorSite`, `CompetitorGap`, `CompetitorAnalysisResult` from `audit.ts` |

---

## Orchestrator Entry Point

```typescript
export async function runCompetitorAnalysis(
  browser: Browser,
  clientUrl: string,
  clientPages: CrawledPage[],
  competitorUrls: string[],    // already sliced to max 3
): Promise<CompetitorAnalysisResult>
```

Uses `Promise.allSettled` for parallel competitor crawls. Each crawl failure is isolated — the rest continue. `crawlCompetitor` never throws: it returns `{ pages: [], crawlError: string }` on any failure.

---

## Signals Extracted Per Competitor (CompetitorSite)

```typescript
interface CompetitorSite {
  url: string
  domain: string
  crawlError?: string         // Set if crawl failed completely
  pageCount: number
  hasLocalBusinessSchema: boolean
  schemaTypes: string[]
  servicePageCount: number
  locationPageCount: number
  hasGalleryPage: boolean
  hasAboutPage: boolean
  hasContactPage: boolean
  hasPhone: boolean
  hasAddress: boolean
  hasMap: boolean
  hasHours: boolean
  hasTrustSignals: boolean
  avgWordCount: number
  ctaCoverage: number         // Fraction of pages with CTA text (0–1)
  hasForm: boolean
}
```

---

## Gap Analysis

`analyzeGaps(clientUrl, clientPages, competitors)` runs 8 gap checks:

| Gap ID | Fires when |
|---|---|
| `comp-no-service-pages` | Client has no service pages, majority of competitors do |
| `comp-no-location-pages` | Client has no location pages, majority do |
| `comp-no-local-schema` | Client has no LocalBusiness schema, majority do |
| `comp-no-trust-signals` | Client has no trust signals, majority do |
| `comp-no-map` | Client has no map, majority do |
| `comp-no-hours` | Client has no hours, majority do |
| `comp-no-contact-form` | Client has no form, majority do |
| `comp-thin-content` | Client avg word count < 70% of average competitor word count |

**Gap threshold**: A gap fires when ≥ 60% of successful competitor crawls have the advantage — i.e., `Math.ceil(successfulCount × 0.6)` competitors must have the signal.

---

## Wiring in competitorStage.ts

Competitor analysis runs as an optional stage in the pipeline (`src/engine/pipeline/stages/competitorStage.ts`):

```typescript
// Stage 8 — competitorStage (94%) — optional
export async function competitorStage(ctx, emit) {
  if (!ctx.request.competitorUrls || ctx.request.competitorUrls.length === 0) {
    log.info('Competitor stage skipped — no competitor URLs provided')
    return
  }
  if (!ctx.browser) {
    log.warn('Competitor stage skipped — browser not available')
    return
  }
  emit('Analyzing competitors…', 94)
  ctx.competitorResult = await runCompetitorAnalysis(
    ctx.browser, ctx.normalizedUrl, ctx.pages, ctx.request.competitorUrls.slice(0, 3),
  )
}
```

The stage is wrapped by `runOptional()` in the orchestrator. If it throws, `ctx.competitorResult` remains `undefined` and the report omits the section.

---

## Frontend: ScanForm.tsx

I added three optional competitor URL inputs to `ScanForm.tsx`. On submit:
- Blank entries are filtered out
- `https://` is automatically prepended if missing
- `competitorUrls` is only included in the request if at least one entry is filled in

---

## Report Output

If `AuditResult.competitor` is present, the HTML report includes a **🏆 Competitor Gap Analysis** section showing:
1. A signal comparison table for each crawled competitor (schema, phone, map, hours, form, service pages, avg word count)
2. A gaps list with descriptions and action recommendations, each noting which competitor domains have the advantage

If no competitor URLs were provided (or all crawls failed), the section is omitted.

---

## What buildClientSummary Actually Does

`src/engine/reports/buildClientSummary.ts` builds three sections based on the **audited site's own findings** only:

```typescript
interface ClientSummary {
  whatIsHurtingVisibility: string[]   // Issues from technical, localSeo, content categories
  whatMayBeHurtingLeads: string[]     // Issues from conversion, trust categories
  fastestWins: string[]               // Top 5 quickWins recommendations
}
```

This is distinct from competitor analysis. It summarises the site's own issues in plain language for the "What's Holding This Business Back" report section. No competitor data is involved.

---

## Summary

| Claim | Truth |
|---|---|
| "The app does competitor analysis" | TRUE — Phase 10, when competitor URLs are provided |
| "buildClientSummary compares to competitors" | FALSE — it summarises the site's own issues only |
| "Competitor crawl can fail silently" | TRUE — `Promise.allSettled` + try/catch; scan always completes |
| "SERP scraping is involved" | FALSE — only manually-provided URLs are crawled |
| "Auto-discovery of competitors works" | FALSE — `noopDiscovery` always returns `[]`; pluggable for future |
