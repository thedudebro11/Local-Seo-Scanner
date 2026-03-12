/**
 * Core audit data model.
 * These types are shared between the main-process engine and the React renderer.
 * Keep this file free of runtime imports — pure TypeScript interfaces only.
 */

export type ScanMode = 'quick' | 'full'

export type BusinessType =
  | 'auto'
  | 'restaurant'
  | 'salon'
  | 'roofer'
  | 'auto_shop'
  | 'contractor'
  | 'dentist'
  | 'other'

export type PageType =
  | 'home'
  | 'contact'
  | 'about'
  | 'service'
  | 'location'
  | 'booking'
  | 'menu'
  | 'gallery'
  | 'blog'
  | 'other'

export type FindingCategory = 'technical' | 'localSeo' | 'conversion' | 'content' | 'trust'

export type Severity = 'high' | 'medium' | 'low'

export type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

// ─── Request ──────────────────────────────────────────────────────────────────

export interface AuditRequest {
  url: string
  scanMode: ScanMode
  businessType: BusinessType
  maxPages: number
  /** Up to 3 competitor URLs for gap analysis. Optional — main scan runs without them. */
  competitorUrls?: string[]
}

// ─── Crawl ────────────────────────────────────────────────────────────────────

export interface CrawledPage {
  url: string
  finalUrl: string
  statusCode: number
  pageType: PageType
  title?: string
  metaDescription?: string
  h1s: string[]
  h2s: string[]
  canonical?: string
  noindex: boolean
  html?: string
  textContent?: string
  wordCount?: number
  imageCount?: number
  missingAltCount?: number

  // Extracted signals
  phones: string[]
  emails: string[]
  hasAddress: boolean
  hasMap: boolean
  hasHours: boolean
  hasForm: boolean
  ctaTexts: string[]
  schemaTypes: string[]
  hasTrustSignals: boolean
  testimonialCount: number
}

export interface CrawlResult {
  pages: CrawledPage[]
  robotsFound: boolean
  sitemapFound: boolean
  internalLinkGraph: Record<string, string[]>
}

// ─── Finding ─────────────────────────────────────────────────────────────────

export interface Finding {
  id: string
  category: FindingCategory
  severity: Severity
  title: string
  summary: string
  whyItMatters: string
  recommendation: string
  affectedUrls?: string[]
  // Impact signals — populated by impactAnalyzer after all findings are assembled
  impactLevel?: ImpactLevel
  impactReason?: string
  estimatedBusinessEffect?: string
}

// ─── Revenue Impact Estimate ──────────────────────────────────────────────────

export interface RevenueImpactEstimate {
  /** Estimated number of leads the site may be losing per month. */
  estimatedLeadLossRange: { low: number; high: number }
  /** Estimated monthly revenue loss range (USD). Optional — omitted when confidence is too low. */
  estimatedRevenueLossRange?: { low: number; high: number }
  /** Plain-English drivers behind the estimate (top 5 findings). */
  impactDrivers: string[]
  /** Single-paragraph explanation for a non-technical reader. */
  explanation: string
  /** Assumptions used to produce the estimate — always included for transparency. */
  assumptions: string[]
  /** How reliable this estimate is, given the scan completeness. */
  confidence: 'Low' | 'Medium' | 'High'
}

// ─── Fix Roadmap ──────────────────────────────────────────────────────────────

export interface FixRoadmapItem {
  /** 1-based display order — 1 is the most urgent action. */
  priority: number
  title: string
  whyItMatters: string
  plainEnglishFix: string
  impact: 'Critical' | 'High' | 'Medium' | 'Low'
  effort: 'Low' | 'Medium' | 'High'
  category: FindingCategory
  affectedUrls?: string[]
  /** IDs of the findings that contributed to this roadmap item. */
  sourceFindingIds?: string[]
}

// ─── Score Confidence ─────────────────────────────────────────────────────────

export interface ScoreConfidence {
  /** How trustworthy / complete this scan result is — not an SEO quality rating. */
  level: 'High' | 'Medium' | 'Low'
  /** Short human-readable explanation of what drove the confidence level. */
  reason: string
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface CategoryScore {
  value: number        // 0–100
  label: string        // e.g. "Solid" | "Needs Work" | "Leaking Opportunity"
  rationale: string[]  // bullet points explaining the score
}

export interface AuditScores {
  technical: CategoryScore
  localSeo:  CategoryScore
  conversion: CategoryScore
  content:   CategoryScore
  trust:     CategoryScore
  overall:   CategoryScore
}

// ─── Lighthouse ──────────────────────────────────────────────────────────────

export interface LighthouseMetrics {
  url: string
  performanceScore: number      // 0–100
  seoScore: number              // 0–100
  accessibilityScore: number    // 0–100
  firstContentfulPaint?: number // ms
  largestContentfulPaint?: number // ms
  totalBlockingTime?: number    // ms
  cumulativeLayoutShift?: number
  speedIndex?: number           // ms
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface AuditResult {
  id: string
  request: AuditRequest
  scannedAt: string          // ISO timestamp
  domain: string
  detectedBusinessType: BusinessType
  pages: CrawledPage[]
  findings: Finding[]
  scores: AuditScores
  quickWins: string[]        // owner-friendly top action items (fast/easy)
  moneyLeaks: string[]       // high-impact revenue issues
  lighthouse?: LighthouseMetrics[]
  visual?: VisualAnalysisResult
  competitor?: CompetitorAnalysisResult
  scoreConfidence?: ScoreConfidence
  revenueImpact?: RevenueImpactEstimate
  roadmap?: FixRoadmapItem[]
  artifacts: {
    jsonPath?: string
    htmlPath?: string
    screenshotPaths?: Record<string, string>
  }
}

// ─── Visual Analysis ──────────────────────────────────────────────────────────

export interface VisualCheckResult {
  /** Whether the check passed (positive UX signal present). */
  passed: boolean
  /** Human-readable detail about what was found or not found. */
  detail?: string
}

export interface VisualPageChecks {
  /** Strong CTA button/link visible in first viewport */
  hasAboveFoldCta: VisualCheckResult
  /** Phone number or tel: link visible in first viewport */
  hasPhoneVisible: VisualCheckResult
  /** Trust keywords visible near top of page */
  hasTrustSignalsVisible: VisualCheckResult
  /** H1 / hero headline is present and descriptive above the fold */
  hasHeroClarity: VisualCheckResult
}

export interface VisualPageAnalysis {
  url: string
  pageType: string
  /** Absolute disk path of the captured screenshot */
  screenshotPath?: string
  /** Filename only (used for relative references in the HTML report) */
  screenshotFile?: string
  checks: VisualPageChecks
}

export interface VisualAnalysisResult {
  pagesAnalyzed: VisualPageAnalysis[]
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────

/**
 * Signals extracted from a single competitor's crawled pages.
 * crawlError is set (and all counts are 0) when the crawl failed completely.
 */
export interface CompetitorSite {
  url: string
  domain: string
  crawlError?: string
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
  /** Fraction of crawled pages that contain CTA text (0–1) */
  ctaCoverage: number
  hasForm: boolean
}

/** A single opportunity the client site is missing relative to competitors. */
export interface CompetitorGap {
  id: string
  title: string
  description: string
  /** Domains of competitors that have this advantage */
  competitorDomains: string[]
  recommendation: string
}

export interface CompetitorAnalysisResult {
  analyzedAt: string
  competitors: CompetitorSite[]
  gaps: CompetitorGap[]
}

// ─── Analyzer output ─────────────────────────────────────────────────────────

export interface AnalyzerOutput {
  findings: Finding[]
  notes: string[]
}

// ─── Score output ────────────────────────────────────────────────────────────

export interface ScoreOutput {
  value: number
  label: string
  rationale: string[]
}
