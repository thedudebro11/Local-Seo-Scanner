import { runCompetitorAnalysis } from '../../competitor'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('competitorStage')

/**
 * Run competitor gap analysis against up to 3 user-supplied URLs.
 *
 * Optional — skipped when no competitorUrls are provided.
 * Failure is caught by the orchestrator; scan completes without competitor data.
 *
 * Requires ctx.browser (still open at this point in the pipeline).
 */
export async function competitorStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  if (!ctx.request.competitorUrls || ctx.request.competitorUrls.length === 0) {
    log.info('Competitor stage skipped — no competitor URLs provided')
    return
  }

  if (!ctx.browser) {
    log.warn('Competitor stage skipped — browser not available')
    return
  }

  emit('Analyzing competitors…', 94)

  ctx.competitorResult = await runCompetitorAnalysis(
    ctx.browser,
    ctx.normalizedUrl,
    ctx.pages,
    ctx.request.competitorUrls.slice(0, 3),
  )

  log.info(
    `Competitor analysis: ${ctx.competitorResult.competitors.length} sites, ` +
    `${ctx.competitorResult.gaps.length} gaps`,
  )
}
