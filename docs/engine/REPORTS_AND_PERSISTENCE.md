# Reports and Persistence

## Storage Layout

All scan artifacts are stored under Electron's `userData` directory:

```
<userData>/
  reports/
    index.json                    ← SavedScanMeta[] — all scans list
    <scanId>/
      report.json                 ← Full AuditResult (html/textContent stripped)
      report.html                 ← Self-contained HTML report
```

Platform-specific `userData` paths:
- **macOS**: `~/Library/Application Support/local-seo-scanner/`
- **Windows**: `%APPDATA%\local-seo-scanner\`
- **Linux**: `~/.config/local-seo-scanner/`

## pathResolver.ts

`src/engine/storage/pathResolver.ts` — the only engine file that imports from Electron.

| Function | Returns |
|---|---|
| `getReportsDir()` | `<userData>/reports` (cached after first call) |
| `getScanArtifactsDir(scanId)` | `<userData>/reports/<scanId>` |
| `buildJsonPath(scanId)` | `<userData>/reports/<scanId>/report.json` |
| `buildHtmlPath(scanId)` | `<userData>/reports/<scanId>/report.html` |
| `getIndexPath()` | `<userData>/reports/index.json` |
| `generateScanId(domain)` | `<safeDomain>_<timestamp>` e.g. `example.com_1710000000000` |

`generateScanId` sanitizes the domain (replaces non-alphanumeric characters with `_`, caps at 40 characters) and appends `Date.now()`.

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

3. **Category score cards** — 5 cards in a grid: Local SEO, Technical SEO, Conversion, Content, Trust. Each shows score/100, category name, and band label.

4. **What's Holding This Business Back** (conditional) — Two-column grid:
   - "Hurting Google Visibility" — high/medium technical, local, content findings
   - "Hurting Lead Capture" — high/medium conversion, trust findings
   Built by `buildClientSummary()` from `buildClientSummary.ts`

5. **Revenue-Impacting Issues** (conditional — shown if `moneyLeaks.length > 0`) — Red-bordered section with the top 5 money leak summaries

6. **Quick Wins** (conditional — shown if `quickWins.length > 0`) — Green-bordered section with the top 5 quick win recommendations

7. **Page Speed & Core Web Vitals** (conditional — shown if Lighthouse ran) — Performance, SEO, and Accessibility scores as color-coded pills; FCP, LCP, TBT, CLS, Speed Index in a table with target values

8. **All Issues Found** — All findings grouped by category (local, technical, conversion, content, trust). Each finding shows severity badge, title, summary, "Why it matters", "What to do", and affected URLs (up to 3 shown, rest counted)

9. **Score Breakdown Detail** — All 5 category scores with their rationale bullet points (positive and negative signals)

10. **Footer** — Generator credit, date, scan ID

### reportTemplates.ts

Helper functions used by `buildHtmlReport`:

| Function | Purpose |
|---|---|
| `scoreColor(value)` | Returns CSS color string for a score value |
| `severityColor(severity)` | Returns CSS color for severity badge |
| `severityBg(severity)` | Returns background CSS color for finding card |
| `renderScoreCard(label, score)` | Returns HTML string for one score card |
| `renderFinding(finding)` | Returns HTML string for one finding card |
| `renderBulletList(items, emptyMsg?)` | Returns `<ul>` or empty message |
| `categoryLabel(cat)` | Maps category key to display name (handles both `'local'` and `'localSeo'`) |
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
