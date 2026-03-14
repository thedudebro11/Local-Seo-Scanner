/**
 * Builds a MarketDashboard from a BulkScanResult.
 * Optionally enriches each business by loading its individual report.json.
 */

import fs from 'fs-extra'
import { createLogger } from '../utils/logger'
import { getMarketDashboardPath, getMarketDashboardsDir } from '../storage/pathResolver'
import type { BulkScanResult, BulkScanItemResult } from '../bulk/bulkTypes'
import type { AuditResult } from '../types/audit'
import type { MarketDashboard, MarketDashboardBusiness, MarketSummaryStats } from './marketTypes'
import { computeOutreachScore } from './marketOpportunity'
import { rankBusinesses, topN } from './marketRanking'

const log = createLogger('market')

// ─── ID generator ─────────────────────────────────────────────────────────────

function generateDashboardId(): string {
  return `market_${Date.now()}`
}

// ─── Per-item mapper ──────────────────────────────────────────────────────────

function itemToBusiness(item: BulkScanItemResult): MarketDashboardBusiness {
  const b: MarketDashboardBusiness = {
    domain: item.domain,
    ok: item.ok,
    error: item.error,
    overallScore: item.overallScore,
    scoreLabel: item.scoreLabel,
    confidenceLevel: item.confidence?.level,
    issueCount: item.issueCount,
    highPriorityIssueCount: item.highPriorityIssueCount,
    estimatedRevenueLossLow: item.revenueImpact?.revenueLossLow,
    estimatedRevenueLossHigh: item.revenueImpact?.revenueLossHigh,
    reportPaths: item.reportPaths,
    outreachScore: 0, // computed below
  }
  b.outreachScore = computeOutreachScore(b)
  return b
}

// ─── Optional report.json enrichment ─────────────────────────────────────────

async function enrichFromReport(b: MarketDashboardBusiness): Promise<void> {
  const jsonPath = b.reportPaths?.jsonPath
  if (!jsonPath) return
  try {
    const report: AuditResult = await fs.readJson(jsonPath)
    // Count seoOpportunities
    if (report.seoOpportunities && report.seoOpportunities.length > 0) {
      b.opportunityCount = report.seoOpportunities.length
    }
    // Identify biggest problem (first high-severity finding title)
    const highFinding = report.findings.find(f => f.severity === 'high')
    if (highFinding) b.biggestProblem = highFinding.title

    // Strongest and weakest category by score value
    const scores = report.scores
    const cats = [
      { key: 'technical',  val: scores.technical.value },
      { key: 'localSeo',   val: scores.localSeo.value },
      { key: 'conversion', val: scores.conversion.value },
      { key: 'content',    val: scores.content.value },
      { key: 'trust',      val: scores.trust.value },
    ]
    const sorted = cats.sort((a, c) => c.val - a.val)
    b.strongestCategory = sorted[0].key
    b.weakestCategory   = sorted[sorted.length - 1].key

    // Re-compute outreach score with enriched opportunityCount
    b.outreachScore = computeOutreachScore(b)
  } catch {
    // Enrichment is optional — never fail the dashboard build
    log.warn(`Could not enrich from report: ${jsonPath}`)
  }
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function buildSummary(businesses: MarketDashboardBusiness[]): MarketSummaryStats {
  const successful = businesses.filter(b => b.ok && b.overallScore !== undefined)
  const scores = successful.map(b => b.overallScore!)
  const totalRevenueLeak = businesses.reduce(
    (sum, b) => sum + (b.estimatedRevenueLossLow ?? 0),
    0,
  )
  return {
    totalBusinesses: businesses.length,
    scannedSuccessfully: successful.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore:  scores.length ? Math.min(...scores) : 0,
    totalEstimatedRevenueLeak: Math.round(totalRevenueLeak),
    sitesBelow55: successful.filter(b => (b.overallScore ?? 100) < 55).length,
    sitesBelow70: successful.filter(b => (b.overallScore ?? 100) < 70).length,
  }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export interface BuildDashboardRequest {
  bulkResult: BulkScanResult
  label?: string
  /** If true, load each report.json for deeper enrichment. Default: true. */
  enrich?: boolean
}

export async function buildMarketDashboard(
  req: BuildDashboardRequest,
): Promise<MarketDashboard> {
  const { bulkResult, label, enrich = true } = req
  const dashboardId = generateDashboardId()

  // Build base business list from bulk items
  let businesses = bulkResult.items.map(itemToBusiness)

  // Optionally enrich from individual report.json files
  if (enrich) {
    await Promise.all(businesses.map(b => enrichFromReport(b)))
  }

  // Build dashboard object
  const dashboard: MarketDashboard = {
    dashboardId,
    generatedAt: new Date().toISOString(),
    marketLabel: label ?? `Market Analysis — ${new Date().toLocaleDateString()}`,
    summary: buildSummary(businesses),
    topPerformers:          topN(businesses.filter(b => b.ok), 'score-desc',    5),
    weakestSites:           topN(businesses.filter(b => b.ok), 'score-asc',     5),
    highestRevenueLeakSites: topN(businesses.filter(b => b.ok), 'revenue-desc', 5),
    bestOpportunityTargets: topN(businesses.filter(b => b.ok), 'outreach-desc', 5),
    allBusinesses:          rankBusinesses(businesses, 'score-desc'),
  }

  // Persist
  await saveDashboard(dashboard)

  return dashboard
}

// ─── Storage ──────────────────────────────────────────────────────────────────

async function saveDashboard(dashboard: MarketDashboard): Promise<void> {
  try {
    const dir = getMarketDashboardsDir()
    await fs.ensureDir(dir)
    const filePath = getMarketDashboardPath(dashboard.dashboardId)
    await fs.writeJson(filePath, dashboard, { spaces: 2 })
    log.info(`Market dashboard saved: ${filePath}`)
  } catch (err) {
    log.warn(`Failed to save market dashboard: ${err}`)
  }
}
