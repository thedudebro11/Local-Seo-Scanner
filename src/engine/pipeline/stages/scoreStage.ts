import { scoreTechnical }  from '../../scoring/scoreTechnical'
import { scoreLocalSeo }   from '../../scoring/scoreLocalSeo'
import { scoreConversion } from '../../scoring/scoreConversion'
import { scoreContent }    from '../../scoring/scoreContent'
import { scoreTrust }      from '../../scoring/scoreTrust'
import { computeWeightedScore } from '../../scoring/weightedFinalScore'
import { buildQuickWins, buildMoneyLeaks } from '../../scoring/prioritizeFindings'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('scoreStage')

/**
 * Compute per-category scores and the weighted overall score.
 *
 * Required — throws on failure.
 *
 * Important: scoring uses ctx.categoryFindings (the analyzer-produced lists),
 * NOT ctx.allFindings. This keeps Lighthouse and visual findings out of the
 * deduction model, which is intentional — those findings enrich the impact
 * metadata and roadmap but are not part of the category score calculation.
 */
export async function scoreStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Scoring results…', 92)

  const techScore    = scoreTechnical({
    findings: ctx.categoryFindings.technical,
    pages: ctx.pages,
    robotsFound: ctx.robotsFound,
    sitemapFound: ctx.sitemapFound,
  })
  const localScore   = scoreLocalSeo({
    findings: ctx.categoryFindings.localSeo,
    pages: ctx.pages,
  })
  const convScore    = scoreConversion({
    findings: ctx.categoryFindings.conversion,
    pages: ctx.pages,
  })
  const contentScore = scoreContent({
    findings: ctx.categoryFindings.content,
    pages: ctx.pages,
  })
  const trustScore   = scoreTrust({
    findings: ctx.categoryFindings.trust,
    pages: ctx.pages,
    domain: ctx.domain,
  })

  const categoryScores = {
    technical:  techScore,
    localSeo:   localScore,
    conversion: convScore,
    content:    contentScore,
    trust:      trustScore,
  }

  ctx.scores = { ...categoryScores, overall: computeWeightedScore(categoryScores) }
  ctx.quickWins  = buildQuickWins(ctx.allFindings)
  ctx.moneyLeaks = buildMoneyLeaks(ctx.allFindings)

  log.info(
    `Scoring complete: tech=${techScore.value} local=${localScore.value} ` +
    `conv=${convScore.value} content=${contentScore.value} trust=${trustScore.value} ` +
    `overall=${ctx.scores.overall.value}`,
  )
}
