/**
 * Scan history persistence — Phase 12.
 *
 * Writes one lightweight SiteScanSummary per completed scan to:
 *   monitoring/history/<siteId>/<scanId>.json
 *
 * These files are the raw material for future trend dashboards.
 * Never throws — all errors are logged and swallowed.
 */

import path from 'path'
import fs from 'fs-extra'
import { getSiteHistoryDir, getScanSummaryPath } from './monitoringPaths'
import type { SiteScanSummary } from './monitoringTypes'
import type { AuditResult } from '../types/audit'
import { createLogger } from '../utils/logger'

const log = createLogger('scanHistory')

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a SiteScanSummary from the completed AuditResult and write it to disk.
 */
export async function saveScanSummary(
  siteId: string,
  result: AuditResult,
): Promise<void> {
  const summary = buildSummary(siteId, result)
  const summaryPath = getScanSummaryPath(siteId, result.id)
  await fs.ensureDir(getSiteHistoryDir(siteId))
  await fs.writeJson(summaryPath, summary, { spaces: 2 })
  log.info(`saveScanSummary: ${siteId}/${result.id} (score=${summary.overallScore})`)
}

/**
 * Return all scan summaries for a site, sorted oldest-first.
 * Returns [] if the site has no history or the directory doesn't exist.
 */
export function getScanHistory(siteId: string): SiteScanSummary[] {
  try {
    const dir = getSiteHistoryDir(siteId)
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    const summaries = files
      .map((f) => {
        try {
          return fs.readJsonSync(path.join(dir, f)) as SiteScanSummary
        } catch {
          return null
        }
      })
      .filter((s): s is SiteScanSummary => s !== null)
    return summaries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  } catch (err) {
    log.warn(`getScanHistory failed for ${siteId}: ${(err as Error).message}`)
    return []
  }
}

/**
 * Return the most recent scan summary for a site, or null if none exists.
 */
export function getLatestScanSummary(siteId: string): SiteScanSummary | null {
  const history = getScanHistory(siteId)
  return history.length > 0 ? history[history.length - 1] : null
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function buildSummary(siteId: string, r: AuditResult): SiteScanSummary {
  const highPriorityCount = r.findings.filter(
    (f) =>
      f.severity === 'high' ||
      f.impactLevel === 'CRITICAL' ||
      f.impactLevel === 'HIGH',
  ).length

  const rev = r.revenueImpact
  const revenueImpactSummary = rev
    ? {
        leadLossLow: rev.estimatedLeadLossRange.low,
        leadLossHigh: rev.estimatedLeadLossRange.high,
        revenueLossLow: rev.estimatedRevenueLossRange?.low,
        revenueLossHigh: rev.estimatedRevenueLossRange?.high,
      }
    : undefined

  return {
    siteId,
    scanId: r.id,
    timestamp: r.scannedAt,
    overallScore: r.scores.overall.value,
    scoreLabel: r.scores.overall.label,
    confidenceLevel: r.scoreConfidence?.level,
    issueCount: r.findings.length,
    highPriorityIssueCount: highPriorityCount,
    revenueImpactSummary,
  }
}
