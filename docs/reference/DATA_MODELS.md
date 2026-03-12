# Data Models

All core TypeScript interfaces are defined in `src/engine/types/audit.ts` and `src/engine/types/ipc.ts`. These files contain only type declarations — no runtime code.

---

## audit.ts

### ScanMode

```typescript
type ScanMode = 'quick' | 'full'
```

Controls `maxPages` in the UI. `quick` typically uses fewer max pages. The engine itself treats `maxPages` as the hard limit — the `scanMode` label is stored for display but does not change engine behavior beyond what `maxPages` enforces.

### BusinessType

```typescript
type BusinessType =
  | 'auto'        // user chose auto-detect
  | 'restaurant'
  | 'salon'
  | 'roofer'
  | 'auto_shop'
  | 'contractor'
  | 'dentist'
  | 'other'
```

Used in `AuditRequest.businessType` (user input) and `AuditResult.detectedBusinessType` (engine output). The `'auto'` value only appears in requests — the engine always resolves it to a specific type (or `'other'`) before storing it in the result.

### PageType

```typescript
type PageType =
  | 'home' | 'contact' | 'about' | 'service' | 'location'
  | 'booking' | 'menu' | 'gallery' | 'blog' | 'other'
```

Assigned by `classifyPage()`. Used by analyzers to select which pages to check (e.g., `importantPages` = home/contact/service/location).

### FindingCategory

```typescript
type FindingCategory = 'technical' | 'localSeo' | 'conversion' | 'content' | 'trust'
```

`FindingCategory` uses `'localSeo'` throughout — in findings, in `AuditScores`, in `CATEGORY_WEIGHT` in `prioritizeFindings.ts`, and in `WEIGHTS` in `weightedFinalScore.ts`. The earlier inconsistency where findings used `'local'` and scores used `'localSeo'` was resolved in a cleanup pass.

### ImpactLevel

```typescript
type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
```

Added in the Phase 9+ Impact Engine. Represents the estimated business damage of a finding. Set by `impactAnalyzer.ts` after all findings are assembled.

### Severity

```typescript
type Severity = 'high' | 'medium' | 'low'
```

### AuditRequest

```typescript
interface AuditRequest {
  url: string                  // Raw URL entered by user (may lack https://)
  scanMode: ScanMode           // 'quick' | 'full'
  businessType: BusinessType   // User's selection (may be 'auto')
  maxPages: number             // Hard limit on pages to crawl
  competitorUrls?: string[]    // Up to 3 competitor URLs for gap analysis (Phase 10)
}
```

### CrawledPage

The central data object — one per page fetched.

```typescript
interface CrawledPage {
  url: string           // The URL that was requested
  finalUrl: string      // The URL after all redirects (from page.url())
  statusCode: number    // HTTP response status; 0 on network error
  pageType: PageType    // Assigned by classifyPage()
  title?: string        // <title> text
  metaDescription?: string  // <meta name="description"> content
  h1s: string[]         // All H1 text values
  h2s: string[]         // All H2 text values
  canonical?: string    // <link rel="canonical"> href
  noindex: boolean      // True if robots/googlebot meta says noindex
  html?: string         // Raw HTML (present during scan, stripped in JSON report)
  textContent?: string  // Visible text (present during scan, stripped in JSON report)
  wordCount?: number    // Word count of visible text
  imageCount?: number   // Total <img> elements
  missingAltCount?: number  // <img> elements with no or empty alt

  // Extracted signals
  phones: string[]      // Phone numbers (tel: links + text pattern)
  emails: string[]      // Email addresses (mailto: links + text pattern)
  hasAddress: boolean   // Physical address detected
  hasMap: boolean       // Google Maps embed or directions link
  hasHours: boolean     // Business hours text detected
  hasForm: boolean      // Non-search form with 2+ inputs or textarea
  ctaTexts: string[]    // Action-oriented button/link texts
  schemaTypes: string[] // JSON-LD and microdata @type values
  hasTrustSignals: boolean    // Testimonials, trust keywords, or star ratings
  testimonialCount: number    // Count of testimonial/review elements
}
```

### CrawlResult

```typescript
interface CrawlResult {
  pages: CrawledPage[]
  robotsFound: boolean
  sitemapFound: boolean
  internalLinkGraph: Record<string, string[]>  // finalUrl → [linked URLs]
}
```

Note: `CrawlResult` is defined in `audit.ts` but `runAudit` does not use this type directly — it constructs the fields separately.

### Finding

```typescript
interface Finding {
  id: string                       // Unique identifier e.g. 'local-no-phone-homepage'
  category: FindingCategory        // 'technical' | 'localSeo' | 'conversion' | 'content' | 'trust'
  severity: Severity               // 'high' | 'medium' | 'low'
  title: string                    // Short, scannable title
  summary: string                  // One-sentence description of the issue
  whyItMatters: string             // Business impact explanation
  recommendation: string           // Specific, actionable fix
  affectedUrls?: string[]          // URLs where the issue was found (optional)
  // Impact signals — set by impactAnalyzer after all findings are assembled
  impactLevel?: ImpactLevel        // CRITICAL | HIGH | MEDIUM | LOW
  impactReason?: string            // Why this issue hurts the business
  estimatedBusinessEffect?: string // Concrete revenue/lead consequence
}
```

### CategoryScore

```typescript
interface CategoryScore {
  value: number        // 0–100 numeric score
  label: string        // Band label: 'Strong' | 'Solid' | 'Needs Work' | 'Leaking Opportunity'
  rationale: string[]  // Bullet points explaining the score (positive and negative signals)
}
```

### AuditScores

```typescript
interface AuditScores {
  technical:  CategoryScore
  localSeo:   CategoryScore   // KEY IS 'localSeo' — consistent with FindingCategory
  conversion: CategoryScore
  content:    CategoryScore
  trust:      CategoryScore
  overall:    CategoryScore   // Weighted average — no impact penalty applied
}
```

### LighthouseMetrics

```typescript
interface LighthouseMetrics {
  url: string
  performanceScore: number      // 0–100 (Lighthouse category score × 100)
  seoScore: number              // 0–100
  accessibilityScore: number    // 0–100
  firstContentfulPaint?: number // ms
  largestContentfulPaint?: number // ms
  totalBlockingTime?: number    // ms
  cumulativeLayoutShift?: number  // dimensionless (e.g. 0.08)
  speedIndex?: number           // ms
}
```

### ScoreConfidence

```typescript
interface ScoreConfidence {
  level: 'High' | 'Medium' | 'Low'
  reason: string  // Plain-English explanation of confidence level
}
```

Set by `computeScoreConfidence()` in `src/engine/scoring/scoreConfidence.ts`. Reflects how complete the scan data is (page count, Lighthouse, visual analysis, etc.), not how good the site is.

### FixRoadmapItem

```typescript
interface FixRoadmapItem {
  priority: number                           // 1-based rank (1 = most important)
  title: string                              // Strategic action title
  whyItMatters: string                       // Business-impact explanation
  plainEnglishFix: string                    // Step-by-step instructions for the owner
  impact: 'Critical' | 'High' | 'Medium' | 'Low'
  effort: 'Low' | 'Medium' | 'High'
  category: FindingCategory
  affectedUrls?: string[]
  sourceFindingIds?: string[]                // Finding IDs that contributed to this item
}
```

Generated by `buildFixRoadmap()` in `src/engine/roadmap/buildFixRoadmap.ts`. Up to 10 items, ranked by impact score.

### RevenueImpactEstimate

```typescript
interface RevenueImpactEstimate {
  estimatedLeadLossRange: { low: number; high: number }         // Monthly leads lost
  estimatedRevenueLossRange?: { low: number; high: number }     // Monthly revenue lost ($)
  impactDrivers: string[]                                       // Top finding titles driving estimate
  explanation: string                                           // Human-readable summary
  assumptions: string[]                                         // 7 honesty disclaimers
  confidence: 'Low' | 'Medium' | 'High'                        // Always 'Medium' by design
}
```

Generated by `estimateRevenueImpact()` in `src/engine/revenue/estimateRevenueImpact.ts`. Uses per-`BusinessType` lead value config. Confidence is always capped at 'Medium'.

### AuditResult

```typescript
interface AuditResult {
  id: string                        // e.g. 'example.com_1710000000000'
  request: AuditRequest             // The original scan request
  scannedAt: string                 // ISO 8601 timestamp
  domain: string                    // Hostname e.g. 'example.com'
  detectedBusinessType: BusinessType  // Always resolved (never 'auto')
  pages: CrawledPage[]              // All crawled pages (html/textContent stripped in JSON report)
  findings: Finding[]               // All findings, enriched with impact, sorted by impact
  scores: AuditScores               // Category and overall scores (weighted average, no impact penalty)
  quickWins: string[]               // Top 5 recommendation strings (high/medium findings)
  moneyLeaks: string[]              // Top 5 summary strings (high findings only)
  lighthouse?: LighthouseMetrics[]  // Present only if Lighthouse ran (array of 1)
  visual?: VisualAnalysisResult     // Present only if visual analysis ran
  competitor?: CompetitorAnalysisResult  // Present only if competitor URLs were provided
  scoreConfidence?: ScoreConfidence      // Present only if confidenceStage ran
  roadmap?: FixRoadmapItem[]             // Present only if roadmapStage ran (up to 10 items)
  revenueImpact?: RevenueImpactEstimate  // Present only if revenueStage ran
  artifacts: {
    jsonPath?: string               // Absolute path to report.json
    htmlPath?: string               // Absolute path to report.html
    screenshotPaths?: Record<string, string>  // pageType → absolute screenshot path
  }
}
```

### VisualAnalysisResult

```typescript
interface VisualCheckResult {
  passed: boolean    // Whether the check found the expected signal
  detail?: string    // Human-readable explanation of what was found or missing
}

interface VisualPageChecks {
  hasAboveFoldCta:        VisualCheckResult
  hasPhoneVisible:        VisualCheckResult
  hasTrustSignalsVisible: VisualCheckResult
  hasHeroClarity:         VisualCheckResult
}

interface VisualPageAnalysis {
  url: string
  pageType: string
  screenshotPath?: string   // Absolute disk path of screenshot
  screenshotFile?: string   // Filename only (for relative HTML report references)
  checks: VisualPageChecks
}

interface VisualAnalysisResult {
  pagesAnalyzed: VisualPageAnalysis[]
}
```

### CompetitorAnalysisResult

```typescript
interface CompetitorSite {
  url: string; domain: string; crawlError?: string; pageCount: number
  hasLocalBusinessSchema: boolean; schemaTypes: string[]
  servicePageCount: number; locationPageCount: number
  hasGalleryPage: boolean; hasAboutPage: boolean; hasContactPage: boolean
  hasPhone: boolean; hasAddress: boolean; hasMap: boolean; hasHours: boolean
  hasTrustSignals: boolean; avgWordCount: number; ctaCoverage: number; hasForm: boolean
}

interface CompetitorGap {
  id: string; title: string; description: string
  competitorDomains: string[]   // Domains that have this advantage
  recommendation: string
}

interface CompetitorAnalysisResult {
  analyzedAt: string
  competitors: CompetitorSite[]
  gaps: CompetitorGap[]
}
```

### AnalyzerOutput

```typescript
interface AnalyzerOutput {
  findings: Finding[]
  notes: string[]     // Internal diagnostic notes (logged, not in AuditResult)
}
```

### ScoreOutput

```typescript
interface ScoreOutput {
  value: number
  label: string
  rationale: string[]
}
```

`ScoreOutput` and `CategoryScore` have identical shapes. `ScoreOutput` is what scorers return; `CategoryScore` is what `AuditScores` contains. They are interchangeable.

---

## ipc.ts

### IpcChannel

```typescript
type IpcChannel =
  | 'scan:start' | 'scan:progress'
  | 'file:list-scans' | 'file:open-report' | 'file:open-folder' | 'file:load-scan'
  | 'app:version' | 'app:platform' | 'app:reports-path'
```

Union type of all valid IPC channel names.

### ScanProgressEvent

```typescript
interface ScanProgressEvent {
  step: string      // Human-readable step label e.g. 'Loading robots.txt…'
  percent: number   // 0–100
  message?: string  // Optional additional detail (unused in current implementation)
}
```

### SavedScanMeta

```typescript
interface SavedScanMeta {
  id: string
  domain: string
  scannedAt: string    // ISO timestamp
  overallScore: number
  businessType: string
  scanMode: string
  jsonPath: string     // Absolute path to report.json
  htmlPath: string     // Absolute path to report.html
}
```

Stored in `index.json`. Paths are absolute so the app can open them without reconstructing the path.

### ElectronAPI

```typescript
interface ElectronAPI {
  startScan: (request: AuditRequest) => Promise<AuditResult>
  onScanProgress: (callback: (event: ScanProgressEvent) => void) => () => void
  getSavedScans: () => Promise<SavedScanMeta[]>
  openReport: (path: string) => Promise<void>
  openFolder: (path: string) => Promise<void>
  loadScan: (scanId: string) => Promise<AuditResult | null>
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getReportsPath: () => Promise<string>
}
```

This interface mirrors the `api` object in `preload.ts` exactly. The global `Window` interface is augmented:

```typescript
declare global {
  interface Window {
    api: ElectronAPI
  }
}
```

This gives renderer TypeScript code full type safety on `window.api.*` without importing Electron or the preload.
