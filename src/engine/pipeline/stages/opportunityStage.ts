import { detectOpportunities } from '../../opportunity/detectOpportunities'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('opportunityStage')

/**
 * Detect high-value SEO growth opportunities.
 *
 * Identifies missing service pages, location page gaps, weak coverage,
 * and competitor advantages, then generates actionable suggestions.
 *
 * Optional — failure is caught by the orchestrator; scan completes without
 * opportunity data.
 */
export async function opportunityStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Detecting SEO opportunities…', 97)

  ctx.seoOpportunities = detectOpportunities({
    pages: ctx.pages,
    categoryFindings: ctx.categoryFindings,
    competitorResult: ctx.competitorResult,
    detectedBusinessType: ctx.detectedBusinessType,
  })

  log.info(`SEO opportunities detected: ${ctx.seoOpportunities.length}`)
}
