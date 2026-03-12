import { computeScoreConfidence } from '../../scoring/scoreConfidence'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('confidenceStage')

/**
 * Compute the score confidence level and plain-English reason.
 *
 * Optional — failure is caught by the orchestrator; scan completes without
 * confidence metadata.
 */
export async function confidenceStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Computing score confidence…', 95)

  ctx.scoreConfidence = computeScoreConfidence({
    pages: ctx.pages,
    lighthouse: ctx.lighthouseMetrics.length > 0 ? ctx.lighthouseMetrics : undefined,
    visual: ctx.visualResult,
    competitor: ctx.competitorResult,
  })

  log.info(`Score confidence: ${ctx.scoreConfidence.level} — ${ctx.scoreConfidence.reason}`)
}
