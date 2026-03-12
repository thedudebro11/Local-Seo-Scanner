import { runVisualAnalysis } from '../../visual/visualAnalyzer'
import { getScreenshotsDir } from '../../storage/pathResolver'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('visualStage')

/**
 * Capture above-the-fold screenshots and run visual UX checks.
 *
 * Optional — failure is caught by the orchestrator; scan proceeds without
 * visual data.
 *
 * Requires ctx.browser (opened in crawlStage) and ctx.pages (from extractStage).
 * Visual findings are appended to ctx.allFindings.
 */
export async function visualStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  if (!ctx.browser) {
    log.warn('Visual stage skipped — no browser in context')
    return
  }

  emit('Capturing visual screenshots…', 89)

  const screenshotDir = getScreenshotsDir(ctx.scanId)
  const { result: vResult, findings: vFindings } = await runVisualAnalysis(
    ctx.browser,
    ctx.pages,
    screenshotDir,
  )

  ctx.visualResult = vResult
  ctx.allFindings = [...ctx.allFindings, ...vFindings]

  // Index screenshot paths by page type for artifact storage
  for (const p of vResult.pagesAnalyzed) {
    if (p.screenshotPath) {
      ctx.screenshotPaths[p.pageType] = p.screenshotPath
    }
  }

  log.info(
    `Visual analysis: ${vResult.pagesAnalyzed.length} page(s), ${vFindings.length} finding(s)`,
  )
}
