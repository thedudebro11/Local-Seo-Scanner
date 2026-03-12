import { buildJsonReport } from '../../reports/buildJsonReport'
import { buildHtmlReport } from '../../reports/buildHtmlReport'
import { saveScan } from '../../storage/scanRepository'
import { buildJsonPath, buildHtmlPath } from '../../storage/pathResolver'
import { createLogger } from '../../utils/logger'
import type { AuditResult } from '../../types/audit'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('reportStage')

/**
 * Assemble the final AuditResult, write JSON and HTML reports to disk,
 * and persist the scan to the index.
 *
 * Required — throws on failure.
 */
export async function reportStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Building reports…', 97)

  const jsonPath = buildJsonPath(ctx.scanId)
  const htmlPath = buildHtmlPath(ctx.scanId)

  const result: AuditResult = buildAuditResult(ctx, jsonPath, htmlPath)

  await Promise.all([
    buildJsonReport(result, jsonPath),
    buildHtmlReport(result, htmlPath),
  ])

  await saveScan(result)

  ctx.artifacts = {
    jsonPath,
    htmlPath,
    screenshotPaths: Object.keys(ctx.screenshotPaths).length > 0
      ? ctx.screenshotPaths
      : undefined,
  }

  log.info(`Reports saved: ${jsonPath}`)
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Assemble a complete AuditResult from the job context.
 * This is the single place where context fields are mapped to the public type.
 */
export function buildAuditResult(
  ctx: ScanJobContext,
  jsonPath: string,
  htmlPath: string,
): AuditResult {
  return {
    id: ctx.scanId,
    request: ctx.request,
    scannedAt: ctx.startedAt,
    domain: ctx.domain,
    detectedBusinessType: ctx.detectedBusinessType,
    pages: ctx.pages,
    findings: ctx.allFindings,
    scores: ctx.scores,
    quickWins: ctx.quickWins,
    moneyLeaks: ctx.moneyLeaks,
    lighthouse: ctx.lighthouseMetrics.length > 0 ? ctx.lighthouseMetrics : undefined,
    visual: ctx.visualResult,
    competitor: ctx.competitorResult,
    scoreConfidence: ctx.scoreConfidence,
    revenueImpact: ctx.revenueImpact,
    roadmap: ctx.roadmap,
    artifacts: {
      jsonPath,
      htmlPath,
      screenshotPaths: Object.keys(ctx.screenshotPaths).length > 0
        ? ctx.screenshotPaths
        : undefined,
    },
  }
}
