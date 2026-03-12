import { runLighthouse } from '../../lighthouse/runLighthouse'
import { analyzeLighthouse } from '../../lighthouse/lighthouseAnalyzer'
import { enrichFindingsWithImpact } from '../../impactAnalyzer'
import { prioritizeFindings } from '../../scoring/prioritizeFindings'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('impactStage')

/**
 * Two responsibilities:
 *
 * 1. Lighthouse performance audit (optional sub-step).
 *    Lighthouse runs in its own chromium process using the executable path
 *    captured during crawlStage. Any failure is caught and logged — the scan
 *    continues without performance findings.
 *
 * 2. Impact enrichment.
 *    Annotates all findings with impactLevel, impactReason, and
 *    estimatedBusinessEffect, then sorts them by priority.
 *    This runs regardless of whether Lighthouse succeeded.
 *
 * Optional at the orchestrator level — if this entire stage fails, the scan
 * still completes but findings will lack impact metadata.
 */
export async function impactStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Running performance audit…', 90)

  // ── Lighthouse (best-effort) ──────────────────────────────────────────────
  if (ctx.chromiumPath) {
    try {
      const lhMetric = await runLighthouse(ctx.normalizedUrl, ctx.chromiumPath)
      if (lhMetric) {
        ctx.lighthouseMetrics = [lhMetric]
        const lhFindings = analyzeLighthouse(lhMetric)
        ctx.allFindings = [...ctx.allFindings, ...lhFindings]
        log.info(
          `Lighthouse: perf=${lhMetric.performanceScore} seo=${lhMetric.seoScore} ` +
          `findings=${lhFindings.length}`,
        )
      }
    } catch (lhErr) {
      log.warn(`Lighthouse skipped: ${(lhErr as Error).message}`)
    }
  }

  // ── Impact enrichment + prioritize ───────────────────────────────────────
  ctx.allFindings = prioritizeFindings(
    enrichFindingsWithImpact(ctx.allFindings, ctx.detectedBusinessType),
  )

  log.info(`Impact enrichment complete: ${ctx.allFindings.length} findings`)
}
