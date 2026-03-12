import { extractAllSignals } from '../../extractors'
import { classifyPage } from '../../crawl/classifyPage'
import { detectBusinessType } from '../../analyzers/businessTypeDetector'
import { createLogger } from '../../utils/logger'
import type { CrawledPage } from '../../types/audit'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('extractStage')

/**
 * Convert raw fetched HTML into enriched CrawledPage objects, then detect
 * the business type from page content.
 *
 * Required — throws if extraction fails entirely.
 */
export async function extractStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Extracting signals…', 66)

  ctx.pages = ctx.rawPages.map((raw): CrawledPage => {
    const signals = extractAllSignals(raw.html, raw.finalUrl)
    const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)

    return {
      url: raw.requestedUrl,
      finalUrl: raw.finalUrl,
      statusCode: raw.statusCode,
      pageType,
      title: signals.title,
      metaDescription: signals.metaDescription,
      h1s: signals.h1s,
      h2s: signals.h2s,
      canonical: signals.canonical,
      noindex: signals.noindex,
      html: raw.html,
      textContent: signals.textContent,
      wordCount: signals.wordCount,
      imageCount: signals.imageCount,
      missingAltCount: signals.missingAltCount,
      phones: signals.phones,
      emails: signals.emails,
      hasAddress: signals.hasAddress,
      hasMap: signals.hasMap,
      hasHours: signals.hasHours,
      hasForm: signals.hasForm,
      ctaTexts: signals.ctaTexts,
      schemaTypes: signals.schemaTypes,
      hasTrustSignals: signals.hasTrustSignals,
      testimonialCount: signals.testimonialCount,
    }
  })

  emit('Detecting business type…', 72)
  ctx.detectedBusinessType = detectBusinessType(
    ctx.pages,
    ctx.request.businessType,
  ) as typeof ctx.detectedBusinessType

  log.info(
    `Extraction complete: ${ctx.pages.length} pages | business type: ${ctx.detectedBusinessType}`,
  )
}
