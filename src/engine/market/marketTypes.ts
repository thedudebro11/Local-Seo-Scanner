/**
 * Market Intelligence Dashboard data model — Phase 15.
 */

// ─── Per-business entry ───────────────────────────────────────────────────────

export interface MarketDashboardBusiness {
  domain: string
  overallScore?: number
  scoreLabel?: string
  confidenceLevel?: 'High' | 'Medium' | 'Low'
  issueCount?: number
  highPriorityIssueCount?: number
  estimatedRevenueLossLow?: number
  estimatedRevenueLossHigh?: number
  /** Loaded from individual report.json if available */
  opportunityCount?: number
  biggestProblem?: string
  strongestCategory?: string
  weakestCategory?: string
  reportPaths?: { htmlPath?: string; jsonPath?: string }
  /** Composite outreach priority score (higher = better prospect) */
  outreachScore: number
  /** Whether the scan completed successfully */
  ok: boolean
  error?: string
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export interface MarketSummaryStats {
  totalBusinesses: number
  scannedSuccessfully: number
  averageScore: number
  highestScore: number
  lowestScore: number
  totalEstimatedRevenueLeak: number
  sitesBelow55: number
  sitesBelow70: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface MarketDashboard {
  dashboardId: string
  generatedAt: string
  /** User-supplied label, e.g. "Plumbers in Austin TX" */
  marketLabel: string
  summary: MarketSummaryStats
  /** Top 5 by score descending */
  topPerformers: MarketDashboardBusiness[]
  /** Bottom 5 by score ascending */
  weakestSites: MarketDashboardBusiness[]
  /** Top 5 by estimated revenue loss descending */
  highestRevenueLeakSites: MarketDashboardBusiness[]
  /** Top 5 by outreach score descending */
  bestOpportunityTargets: MarketDashboardBusiness[]
  /** All businesses, sorted by score descending */
  allBusinesses: MarketDashboardBusiness[]
}
