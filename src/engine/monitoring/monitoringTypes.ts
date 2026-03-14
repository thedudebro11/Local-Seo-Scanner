/**
 * Monitoring data model — Phase 12.
 *
 * TrackedSite   — a website the user has registered for ongoing monitoring.
 * SiteScanSummary — lightweight snapshot of one scan's key metrics, stored
 *                   per-site so the app can show score trends over time.
 *
 * Pure TypeScript interfaces — no runtime imports.
 */

// ─── Tracked site ─────────────────────────────────────────────────────────────

export interface TrackedSite {
  /** Stable identifier, generated when the site is first registered. */
  siteId: string
  domain: string
  businessType?: string
  dateAdded: string   // ISO timestamp
  lastScanId?: string
}

// ─── Scan summary ─────────────────────────────────────────────────────────────

export interface SiteScanSummary {
  siteId: string
  scanId: string
  timestamp: string       // ISO timestamp (= AuditResult.scannedAt)
  overallScore: number    // 0–100
  scoreLabel: string      // e.g. "Solid", "Needs Work"
  confidenceLevel?: 'High' | 'Medium' | 'Low'
  issueCount: number
  highPriorityIssueCount: number
  revenueImpactSummary?: {
    leadLossLow?: number
    leadLossHigh?: number
    revenueLossLow?: number
    revenueLossHigh?: number
  }
}
