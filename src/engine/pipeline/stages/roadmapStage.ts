import { buildFixRoadmap } from '../../roadmap/buildFixRoadmap'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('roadmapStage')

/**
 * Generate the priority fix roadmap from enriched findings.
 *
 * Optional — failure is caught by the orchestrator; scan completes without
 * roadmap data.
 */
export async function roadmapStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Building fix roadmap…', 96)

  ctx.roadmap = buildFixRoadmap({
    findings: ctx.allFindings,
    moneyLeaks: ctx.moneyLeaks,
  })

  log.info(`Roadmap built: ${ctx.roadmap.length} items`)
}
