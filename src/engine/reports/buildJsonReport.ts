/**
 * JSON report writer.
 * Serializes the AuditResult to disk, stripping raw HTML from pages
 * to keep the file size manageable.
 */

import fs from 'fs-extra'
import path from 'path'
import type { AuditResult } from '../types/audit'
import { createLogger } from '../utils/logger'

const log = createLogger('buildJsonReport')

/**
 * Write the full AuditResult as a JSON file at the given path.
 * Raw HTML is stripped from each page before writing.
 * Returns the path of the written file.
 */
export async function buildJsonReport(result: AuditResult, jsonPath: string): Promise<string> {
  await fs.ensureDir(path.dirname(jsonPath))

  // Strip html from pages — it's large and only needed during the live scan session
  const slim: AuditResult = {
    ...result,
    pages: result.pages.map(({ html: _html, textContent: _tc, ...rest }) => rest as typeof result.pages[0]),
  }

  await fs.writeJson(jsonPath, slim, { spaces: 2 })
  log.info(`JSON report written: ${jsonPath}`)
  return jsonPath
}
