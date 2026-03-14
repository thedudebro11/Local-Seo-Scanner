/**
 * Bulk scan orchestrator — Phase 13.
 *
 * Runs the existing single-site scan pipeline sequentially across a list of
 * domains. One domain at a time — no aggressive concurrency to keep Playwright
 * and Lighthouse stable.
 *
 * Failures on individual domains are recorded in BulkScanItemResult.error and
 * do NOT abort the batch.
 */

import fs from 'fs-extra'
import { runAudit } from '../orchestrator/runAudit'
import { getBulkScanPath, getBulkScansDir } from '../storage/pathResolver'
import { createLogger } from '../utils/logger'
import type { AuditRequest, BusinessType } from '../types/audit'
import type {
  BulkScanRequest,
  BulkScanResult,
  BulkScanItemResult,
  BulkScanProgressEvent,
} from './bulkTypes'

const log = createLogger('runBulkScan')

const MAX_PAGES_BY_MODE = { quick: 10, full: 50 } as const

export type BulkProgressEmitter = (event: BulkScanProgressEvent) => void

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runBulkScan(
  request: BulkScanRequest,
  emitProgress: BulkProgressEmitter,
): Promise<BulkScanResult> {
  const domains = normalizeDomains(request.domains)
  const batchId = `bulk_${Date.now()}`
  const startedAt = new Date().toISOString()
  const totalDomains = domains.length

  log.info(`Bulk scan starting: batchId=${batchId} domains=${totalDomains}`)

  const items: BulkScanItemResult[] = []

  for (let i = 0; i < domains.length; i++) {
    const url = domains[i]
    const domain = extractDomain(url)

    log.info(`Bulk [${i + 1}/${totalDomains}] scanning ${domain}`)

    const batchBase = (i / totalDomains) * 100

    const auditRequest: AuditRequest = {
      url,
      scanMode: request.scanMode,
      businessType: (request.businessType ?? 'auto') as BusinessType,
      maxPages: request.maxPages ?? MAX_PAGES_BY_MODE[request.scanMode],
    }

    const item = await scanOneDomain(domain, auditRequest, (step, percent) => {
      const domainSlice = 100 / totalDomains
      emitProgress({
        batchId,
        domain,
        domainIndex: i,
        totalDomains,
        domainStep: step,
        domainPercent: percent,
        batchPercent: Math.round(batchBase + (percent / 100) * domainSlice),
      })
    })

    items.push(item)
  }

  const completedAt = new Date().toISOString()
  const successfulScans = items.filter((i) => i.ok).length

  const result: BulkScanResult = {
    batchId,
    startedAt,
    completedAt,
    totalDomains,
    successfulScans,
    failedScans: totalDomains - successfulScans,
    items,
  }

  await saveBulkResult(result)
  log.info(`Bulk scan complete: ${successfulScans}/${totalDomains} succeeded`)
  return result
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function scanOneDomain(
  domain: string,
  request: AuditRequest,
  emitProgress: (step: string, percent: number) => void,
): Promise<BulkScanItemResult> {
  try {
    const result = await runAudit(request, emitProgress)

    const rev = result.revenueImpact
    return {
      domain,
      ok: true,
      overallScore: result.scores.overall.value,
      scoreLabel: result.scores.overall.label,
      issueCount: result.findings.length,
      highPriorityIssueCount: result.findings.filter(
        (f) => f.severity === 'high' || f.impactLevel === 'CRITICAL' || f.impactLevel === 'HIGH',
      ).length,
      revenueImpact: rev
        ? {
            leadLossLow: rev.estimatedLeadLossRange.low,
            leadLossHigh: rev.estimatedLeadLossRange.high,
            revenueLossLow: rev.estimatedRevenueLossRange?.low,
            revenueLossHigh: rev.estimatedRevenueLossRange?.high,
          }
        : undefined,
      confidence: result.scoreConfidence
        ? { level: result.scoreConfidence.level, reason: result.scoreConfidence.reason }
        : undefined,
      reportPaths: {
        htmlPath: result.artifacts.htmlPath,
        jsonPath: result.artifacts.jsonPath,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn(`Bulk scan failed for ${domain}: ${message}`)
    return { domain, ok: false, error: message }
  }
}

async function saveBulkResult(result: BulkScanResult): Promise<void> {
  try {
    const p = getBulkScanPath(result.batchId)
    await fs.ensureDir(getBulkScansDir())
    await fs.writeJson(p, result, { spaces: 2 })
    log.info(`Bulk result saved: ${p}`)
  } catch (err) {
    log.warn(`Failed to save bulk result: ${(err as Error).message}`)
  }
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

/**
 * Normalize, deduplicate, and validate domain inputs.
 * Skips blank lines and entries that can't be parsed as URLs.
 */
export function normalizeDomains(raw: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const entry of raw) {
    const trimmed = entry.trim()
    if (!trimmed) continue

    let url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

    // Validate
    try {
      const parsed = new URL(url)
      // Must have a real hostname — reject bare IPs, localhost, etc. in bulk mode
      if (!parsed.hostname.includes('.')) continue
      url = parsed.origin // normalize to origin only
    } catch {
      continue
    }

    if (!seen.has(url)) {
      seen.add(url)
      result.push(url)
    }
  }

  return result
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
