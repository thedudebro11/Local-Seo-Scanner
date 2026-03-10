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

export type FindingCategory = 'technical' | 'local' | 'conversion' | 'content' | 'trust'

export type Severity = 'high' | 'medium' | 'low'

// ─── Request ──────────────────────────────────────────────────────────────────

export interface AuditRequest {
  url: string
  scanMode: ScanMode
  businessType: BusinessType
  maxPages: number
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
  artifacts: {
    jsonPath?: string
    htmlPath?: string
  }
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
