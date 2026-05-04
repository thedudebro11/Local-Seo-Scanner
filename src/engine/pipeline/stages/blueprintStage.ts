import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { buildSiteBlueprint } from '../../reports/buildSiteBlueprint'
import { buildBlueprintPath, getScanArtifactsDir } from '../../storage/pathResolver'
import { buildAuditResult } from './reportStage'
import { buildJsonPath, buildHtmlPath } from '../../storage/pathResolver'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('blueprintStage')

export async function blueprintStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Generating site blueprint…', 99)

  const jsonPath = buildJsonPath(ctx.scanId)
  const htmlPath = buildHtmlPath(ctx.scanId)
  const result = buildAuditResult(ctx, jsonPath, htmlPath)

  const markdown = buildSiteBlueprint(result, ctx.designResult)

  const dir = getScanArtifactsDir(ctx.scanId)
  await mkdir(dir, { recursive: true })

  const blueprintPath = buildBlueprintPath(ctx.scanId)
  await writeFile(blueprintPath, markdown, 'utf8')

  // Merge blueprintPath into ctx.artifacts so reportStage picks it up
  ctx.artifacts = { ...ctx.artifacts, blueprintPath }

  log.info(`Blueprint saved: ${blueprintPath}`)
}
