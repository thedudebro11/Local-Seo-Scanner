import { estimateRevenueImpact } from '../../revenue/estimateRevenueImpact'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('revenueStage')

/**
 * Generate the revenue impact estimate from enriched findings.
 *
 * Optional — failure is caught by the orchestrator; scan completes without
 * revenue impact data.
 */
export async function revenueStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Estimating revenue impact…', 96)

  ctx.revenueImpact = estimateRevenueImpact({
    findings: ctx.allFindings,
    detectedBusinessType: ctx.detectedBusinessType,
    scoreConfidence: ctx.scoreConfidence,
  })

  log.info(`Revenue estimate: ${ctx.revenueImpact.confidence} confidence`)
}
