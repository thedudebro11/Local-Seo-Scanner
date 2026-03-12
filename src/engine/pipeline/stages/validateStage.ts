import { normalizeInputUrl, getDomain } from '../../utils/domain'
import { generateScanId } from '../../storage/pathResolver'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('validateStage')

/**
 * Validate and normalize the request URL, generate a stable scan ID.
 * Required — throws on invalid input.
 */
export async function validateStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Validating URL…', 2)

  // normalizeInputUrl throws if the URL is unparseable
  ctx.normalizedUrl = normalizeInputUrl(ctx.request.url)
  ctx.domain = getDomain(ctx.normalizedUrl)
  ctx.scanId = generateScanId(ctx.domain)

  log.info(`Normalized: ${ctx.normalizedUrl} | domain: ${ctx.domain} | id: ${ctx.scanId}`)
}
