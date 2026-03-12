import { analyzeTechnical } from '../../analyzers/technicalAnalyzer'
import { analyzeLocalSeo } from '../../analyzers/localSeoAnalyzer'
import { analyzeConversion } from '../../analyzers/conversionAnalyzer'
import { analyzeContent } from '../../analyzers/contentAnalyzer'
import { analyzeTrust } from '../../analyzers/trustAnalyzer'
import type { AnalyzerInput } from '../../analyzers/types'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('analysisStage')

/**
 * Run all five category analyzers and collect findings.
 *
 * Required — throws on failure.
 *
 * Note: categoryFindings preserves each analyzer's findings separately so
 * that scoreStage can score by category without lighthouse/visual findings
 * contaminating the deduction model.
 */
export async function analysisStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Analyzing technical SEO…', 76)

  const input: AnalyzerInput = {
    pages: ctx.pages,
    domain: ctx.domain,
    robotsFound: ctx.robotsFound,
    sitemapFound: ctx.sitemapFound,
    detectedBusinessType: ctx.detectedBusinessType,
  }

  const technical  = analyzeTechnical(input)
  const localSeo   = analyzeLocalSeo(input)
  const conversion = analyzeConversion(input)

  emit('Analyzing local SEO…', 80)
  emit('Analyzing conversions…', 84)

  const content = analyzeContent(input)
  const trust   = analyzeTrust(input)

  emit('Analyzing content & trust…', 88)

  ctx.categoryFindings = {
    technical:  technical.findings,
    localSeo:   localSeo.findings,
    conversion: conversion.findings,
    content:    content.findings,
    trust:      trust.findings,
  }

  ctx.allFindings = [
    ...technical.findings,
    ...localSeo.findings,
    ...conversion.findings,
    ...content.findings,
    ...trust.findings,
  ]

  log.info(
    `Analysis complete: ${ctx.allFindings.length} findings ` +
    `(tech=${technical.findings.length}, local=${localSeo.findings.length}, ` +
    `conv=${conversion.findings.length}, content=${content.findings.length}, ` +
    `trust=${trust.findings.length})`,
  )
}
