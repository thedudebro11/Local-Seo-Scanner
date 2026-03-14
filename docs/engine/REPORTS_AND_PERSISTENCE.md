# Reports and Persistence

## Storage Layout

All scan artifacts are stored under Electron's `userData` directory:

```
<userData>/
  reports/
    index.json                           ← SavedScanMeta[] — all scans list
    <scanId>/
      report.json                        ← Full AuditResult (html/textContent stripped)
      report.html                        ← Self-contained HTML report
      screenshots/
        homepage.png                     ← Full-page screenshot (if visual analysis ran)
        contact.png                      ← Contact page screenshot (if found)
        service.png                      ← Service page screenshot (if found)
    bulk/
      <batchId>.json                     ← BulkScanResult (Phase 13)
    discovery/
      <discoveryId>.json                 ← MarketDiscoveryResult (Phase 14)
    market-dashboards/
      <dashboardId>.json                 ← MarketDashboard (Phase 15)
  monitoring/
    sites.json                           ← TrackedSite[] (Phase 11)
    history/
      <siteId>/
        <scanId>.json                    ← SiteScanSummary per recorded scan
```

Platform-specific `userData` paths:
- **macOS**: `~/Library/Application Support/local-seo-scanner/`
- **Windows**: `%APPDATA%\local-seo-scanner\`
- **Linux**: `~/.config/local-seo-scanner/`

## pathResolver.ts

`src/engine/storage/pathResolver.ts` — **does not import Electron**. Instead, `electron/main.ts` calls `initReportsDir(app.getPath('userData'))` once on startup, which sets the internal `_reportsDir` variable. If the engine is called before `initReportsDir`, it throws a clear error.

| Function | Returns |
|---|---|
| `initReportsDir(userDataPath)` | Setter — call once from `electron/main.ts` |
| `getReportsDir()` | `<userData>/reports` (throws if not initialized) |
| `getScanArtifactsDir(scanId)` | `<userData>/reports/<scanId>` |
| `getScreenshotsDir(scanId)` | `<userData>/reports/<scanId>/screenshots` |
| `buildJsonPath(scanId)` | `<userData>/reports/<scanId>/report.json` |
| `buildHtmlPath(scanId)` | `<userData>/reports/<scanId>/report.html` |
| `getIndexPath()` | `<userData>/reports/index.json` |
| `generateScanId(domain)` | `<safeDomain>_<timestamp>` e.g. `example.com_1710000000000` |
| `getBulkScansDir()` | `<userData>/reports/bulk` |
| `getBulkScanPath(batchId)` | `<userData>/reports/bulk/<batchId>.json` |
| `getDiscoveryDir()` | `<userData>/reports/discovery` |
| `getDiscoveryPath(discoveryId)` | `<userData>/reports/discovery/<discoveryId>.json` |
| `getMarketDashboardsDir()` | `<userData>/reports/market-dashboards` |
| `getMarketDashboardPath(dashboardId)` | `<userData>/reports/market-dashboards/<dashboardId>.json` |

`generateScanId` sanitizes the domain (replaces non-alphanumeric characters with `_`, caps at 40 characters) and appends `Date.now()`.

## monitoringPaths.ts (Phase 11)

`src/engine/monitoring/monitoringPaths.ts` — follows the same pattern as `pathResolver.ts`: no Electron import. `electron/main.ts` calls `initMonitoringDir(app.getPath('userData'))` once on startup.

| Function | Returns |
|---|---|
| `initMonitoringDir(userDataPath)` | Setter — call once from `electron/main.ts` |
| `getMonitoringDir()` | `<userData>/monitoring` |
| `getSitesPath()` | `<userData>/monitoring/sites.json` |
| `getSiteHistoryDir(siteId)` | `<userData>/monitoring/history/<siteId>` |
| `getScanSummaryPath(siteId, scanId)` | `<userData>/monitoring/history/<siteId>/<scanId>.json` |

## buildJsonReport

`src/engine/reports/buildJsonReport.ts`

`buildJsonReport(result: AuditResult, jsonPath: string): Promise<string>`

- Calls `fs.ensureDir` to create the scan directory if it does not exist
- Creates a `slim` copy of the result: strips `html` and `textContent` from every page to keep file size reasonable
- Writes using `fs.writeJson(jsonPath, slim, { spaces: 2 })` for human-readable formatting
- Returns `jsonPath`

**What is stripped**: The raw HTML (`page.html`) and extracted text (`page.textContent`) from each `CrawledPage`. All other fields are preserved.

## buildHtmlReport

`src/engine/reports/buildHtmlReport.ts`

`buildHtmlReport(result: AuditResult, htmlPath: string): Promise<string>`

Generates a self-contained HTML file with all CSS inlined. No external assets — the report opens correctly in any browser without internet access.

### HTML Report Sections

The report renders in this order:

1. **Header** — Domain name, scan date, scan mode, pages crawled, detected business type

2. **Overall score block** — Large numeric score with color, band label, and finding count summary

3. **Score Confidence block** (conditional — shown if `scoreConfidence` is present) — Inline badge showing High/Medium/Low with plain-English reason

4. **Category score cards** — 5 cards in a grid: Local SEO, Technical SEO, Conversion, Content, Trust

5. **What's Holding This Business Back** (conditional) — Two-column grid: "Hurting Google Visibility" / "Hurting Lead Capture". Built by `buildClientSummary()`

6. **Revenue-Impacting Issues** (conditional) — Red-bordered section with top 5 money leak summaries

7. **🚨 Revenue Impact Summary** (conditional — shown if any finding has an `impactLevel`) — Purple-bordered section. Groups all findings by impact level (CRITICAL / HIGH / MEDIUM / LOW) with counts and top issue descriptions. Built by `renderImpactSummarySection()`

8. **✅ Quick Wins** (conditional) — Green-bordered section with the top 5 quick win recommendations

9. **⚡ Page Speed & Core Web Vitals** (conditional — shown if Lighthouse ran) — Performance, SEO, Accessibility scores; FCP, LCP, TBT, CLS, Speed Index table

10. **🖥️ Visual UX Analysis** (conditional — shown if visual analysis ran) — Screenshot row + above-the-fold check results table. Built by `renderVisualSection()`

11. **🏆 Competitor Gap Analysis** (conditional — shown if competitor URLs were provided) — Signal comparison table per competitor + gaps list. Built by `renderCompetitorSection()`

12. **💰 Revenue Impact Estimator** (conditional — shown if `revenueImpact` is present) — Estimated monthly lead/revenue loss range, impact drivers, and assumptions list. Built by `renderRevenueImpact()`

13. **🗺️ Priority Fix Roadmap** (conditional — shown if `roadmap` is present) — Up to 10 numbered action items with title, impact badge, effort badge, plain-English fix, and affected URLs. Built by `renderRoadmapItem()`

14. **All Issues Found** — All findings grouped by category. Each finding card shows severity badge, title, summary, "Why it matters", "What to do", affected URLs, **and an impact badge with reason and business effect**

15. **Score Breakdown Detail** — All 5 category scores with rationale bullet points

16. **Footer** — Generator credit, date, scan ID

### reportTemplates.ts

Helper functions used by `buildHtmlReport`:

| Function | Purpose |
|---|---|
| `scoreColor(value)` | Returns CSS color for a score value |
| `severityColor(severity)` | Returns CSS color for severity badge |
| `severityBg(severity)` | Returns background CSS color for finding card |
| `impactColor(level)` | Returns CSS color for impact level badge (purple/red/amber/gray) |
| `renderScoreCard(label, score)` | Returns HTML for one score card |
| `renderFinding(finding)` | Returns HTML for one finding card, including impact badge if present |
| `renderBulletList(items, emptyMsg?)` | Returns `<ul>` or empty message |
| `renderImpactSummarySection(findings)` | Returns the Revenue Impact Summary section HTML |
| `renderCompetitorSection(comp)` | Returns the Competitor Gap Analysis section HTML |
| `renderVisualSection(visual)` | Returns the Visual UX Analysis section HTML |
| `renderRevenueImpact(estimate)` | Returns the Revenue Impact Estimator section HTML |
| `renderRoadmapItem(item)` | Returns HTML for one Priority Fix Roadmap item |
| `categoryLabel(cat)` | Maps category key to display name |
| `escHtml(s)` | Escapes &, <, >, " for safe HTML insertion |
| `formatDate(iso)` | Formats ISO timestamp as "March 10, 2026" |

## buildClientSummary

`src/engine/reports/buildClientSummary.ts`

`buildClientSummary(result: AuditResult): ClientSummary`

Translates findings into three owner-facing plain-language lists:

```typescript
interface ClientSummary {
  whatIsHurtingVisibility: string[]   // Top 4 high/medium technical/local/content findings
  whatMayBeHurtingLeads: string[]     // Top 4 high/medium conversion/trust findings
  fastestWins: string[]               // Top 5 quickWins
}
```

Each item in `whatIsHurtingVisibility` and `whatMayBeHurtingLeads` is formatted as `"${f.title} — ${f.summary}"`.

This is used in the "What's Holding This Business Back" section of the HTML report. The summary is owner-focused — it explains issues in plain English, not technical jargon.

**This is NOT competitor analysis.** See [COMPETITOR_GAP_ANALYSIS.md](COMPETITOR_GAP_ANALYSIS.md).

## scanRepository.ts

`src/engine/storage/scanRepository.ts`

Public API:

| Function | Description |
|---|---|
| `listSavedScans(): SavedScanMeta[]` | Reads `index.json`, returns entries newest-first (`.reverse()`) |
| `loadScanById(scanId): AuditResult \| null` | Reads `report.json` for the given ID; returns null if missing |
| `saveScan(result): Promise<void>` | Appends/updates entry in `index.json` |
| `deleteScan(scanId): Promise<void>` | Removes directory and removes entry from `index.json` |

### index.json Format

`index.json` is a JSON array of `SavedScanMeta` objects:

```json
[
  {
    "id": "example.com_1710000000000",
    "domain": "example.com",
    "scannedAt": "2026-03-10T12:00:00.000Z",
    "overallScore": 62,
    "businessType": "contractor",
    "scanMode": "full",
    "jsonPath": "/path/to/userData/reports/example.com_1710000000000/report.json",
    "htmlPath": "/path/to/userData/reports/example.com_1710000000000/report.html"
  }
]
```

Entries are stored in insertion order (oldest first). `listSavedScans` reverses this to show newest first. `saveScan` filters out any existing entry with the same ID before appending, preventing duplicates.

### How "Open Report" Works

1. User clicks "Open HTML Report" button in `ReportActions.tsx`
2. `window.api.openReport(result.artifacts.htmlPath)` is called
3. IPC channel `file:open-report` is invoked in `fileHandlers.ts`
4. `shell.openPath(reportPath)` opens the HTML file using the system default browser
5. The HTML report is entirely self-contained — no server needed

## Bulk Scan Persistence (Phase 13)

`runBulkScan.ts` saves a `BulkScanResult` JSON after the batch completes:

- File: `<userData>/reports/bulk/<batchId>.json`
- Written by `saveBulkResult(result)` inside `runBulkScan.ts`
- The result is also returned over IPC and held in `useBulkScanStore` in the renderer — the renderer uses the in-memory copy to build the Market Intelligence Dashboard

## Market Discovery Persistence (Phase 14)

`marketDiscovery.ts` saves a `MarketDiscoveryResult` JSON after discovery completes:

- File: `<userData>/reports/discovery/<discoveryId>.json`
- Includes the full `discovered[]` array (including filtered-out sites) and `validDomains[]` (scannable subset)

## Market Intelligence Dashboard Persistence (Phase 15)

`buildMarketDashboard.ts` saves a `MarketDashboard` JSON after building the dashboard:

- File: `<userData>/reports/market-dashboards/<dashboardId>.json`
- Written by `saveDashboard()` inside `buildMarketDashboard.ts`, wrapped in try/catch — a save failure is logged but does not prevent the dashboard from being returned to the renderer

## Monitoring Persistence (Phase 11)

Two separate files manage monitoring state:

- `<userData>/monitoring/sites.json` — `TrackedSite[]` array, written atomically by `siteManager.ts`
- `<userData>/monitoring/history/<siteId>/<scanId>.json` — one `SiteScanSummary` per recorded scan

`addTrackedSite()` uses a read-then-write pattern with deduplication by domain. `saveScanSummary()` creates the history directory if needed (`fs.ensureDir`) then writes the summary JSON. Both operations are wrapped in try/catch in `reportStage.ts` so monitoring failures never affect scan results.
