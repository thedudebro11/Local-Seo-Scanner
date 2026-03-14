/**
 * Scan job orchestrator.
 *
 * Executes pipeline stages in order, managing:
 * - browser lifecycle (open in crawlStage, close in finally)
 * - optional stage isolation (failures are logged, scan continues)
 * - progress emission
 * - final AuditResult assembly
 *
 * Required stages abort the job on failure.
 * Optional stages are wrapped in runOptional() — they log on failure and the
 * scan completes with reduced output (no visual data, no roadmap, etc.).
 */

import type { AuditRequest, AuditResult } from '../types/audit'
import { createLogger } from '../utils/logger'
import { createScanJobContext, type PipelineProgressEmitter } from './types'
import { buildAuditResult } from './stages/reportStage'

import { validateStage }    from './stages/validateStage'
import { crawlStage }       from './stages/crawlStage'
import { extractStage }     from './stages/extractStage'
import { analysisStage }    from './stages/analysisStage'
import { visualStage }      from './stages/visualStage'
import { impactStage }      from './stages/impactStage'
import { scoreStage }       from './stages/scoreStage'
import { competitorStage }  from './stages/competitorStage'
import { confidenceStage }  from './stages/confidenceStage'
import { roadmapStage }     from './stages/roadmapStage'
import { revenueStage }     from './stages/revenueStage'
import { opportunityStage } from './stages/opportunityStage'
import { reportStage }      from './stages/reportStage'
import { buildJsonPath, buildHtmlPath } from '../storage/pathResolver'

const log = createLogger('runScanJob')

export async function runScanJob(
  request: AuditRequest,
  emit: PipelineProgressEmitter,
): Promise<AuditResult> {
  log.info(`Scan job starting: ${request.url}`)

  const ctx = createScanJobContext(request)

  try {
    // ── Required stages ─────────────────────────────────────────────────────
    // Any unhandled error here propagates to the caller and aborts the job.
    await validateStage(ctx, emit)
    await crawlStage(ctx, emit)      // opens ctx.browser
    await extractStage(ctx, emit)
    await analysisStage(ctx, emit)

    // ── Optional stages (browser still open) ────────────────────────────────
    // These stages have access to ctx.browser because the browser must remain
    // open until after competitorStage.
    await runOptional('visual',     ctx, emit, visualStage)
    await runOptional('impact',     ctx, emit, impactStage)

    // ── Required (score must succeed) ───────────────────────────────────────
    await scoreStage(ctx, emit)

    // ── Optional (browser still open for competitor) ─────────────────────────
    await runOptional('competitor', ctx, emit, competitorStage)

    // ── Optional (browser no longer needed) ──────────────────────────────────
    await runOptional('confidence', ctx, emit, confidenceStage)
    await runOptional('roadmap',    ctx, emit, roadmapStage)
    await runOptional('revenue',      ctx, emit, revenueStage)
    await runOptional('opportunity',  ctx, emit, opportunityStage)

    // ── Required (write files) ───────────────────────────────────────────────
    await reportStage(ctx, emit)

  } finally {
    // Browser is always closed here — regardless of which stage succeeded.
    if (ctx.browser) {
      await ctx.browser.close().catch((err: Error) =>
        log.warn(`Browser close error: ${err.message}`),
      )
      log.info('Browser closed')
    }
  }

  emit('Complete.', 100)
  log.info(
    `Scan job complete: ${ctx.domain} | ` +
    `pages=${ctx.pages.length} findings=${ctx.allFindings.length} ` +
    `overall=${ctx.scores.overall.value}`,
  )

  // Return the fully-assembled result. Artifacts were set by reportStage;
  // if for some reason reportStage succeeded but ctx.artifacts is still empty
  // we fall back to the known paths.
  const jsonPath = ctx.artifacts.jsonPath ?? buildJsonPath(ctx.scanId)
  const htmlPath = ctx.artifacts.htmlPath ?? buildHtmlPath(ctx.scanId)
  return buildAuditResult(ctx, jsonPath, htmlPath)
}

// ─── Optional stage runner ────────────────────────────────────────────────────

type StageFn = (
  ctx: ReturnType<typeof createScanJobContext>,
  emit: PipelineProgressEmitter,
) => Promise<void>

async function runOptional(
  name: string,
  ctx: ReturnType<typeof createScanJobContext>,
  emit: PipelineProgressEmitter,
  stage: StageFn,
): Promise<void> {
  try {
    await stage(ctx, emit)
  } catch (err) {
    log.warn(`Optional stage '${name}' failed: ${(err as Error).message}`)
  }
}
