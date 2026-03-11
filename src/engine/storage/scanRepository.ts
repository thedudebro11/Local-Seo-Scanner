/**
 * Scan repository — reads and writes the saved scan index and individual results.
 * Runs in the Electron main process.
 *
 * Artifacts live under userData/reports/:
 *   index.json           — list of SavedScanMeta for the history page
 *   <scanId>/report.json — full AuditResult (html stripped)
 *   <scanId>/report.html — standalone HTML report
 */

import path from 'path'
import fs from 'fs-extra'
import type { SavedScanMeta } from '../types/ipc'
import type { AuditResult } from '../types/audit'
import {
  getIndexPath,
  buildJsonPath,
  buildHtmlPath,
  getScanArtifactsDir,
} from './pathResolver'
import { createLogger } from '../utils/logger'

const log = createLogger('scanRepository')

// ─── Index helpers ────────────────────────────────────────────────────────────

function readIndex(): SavedScanMeta[] {
  const indexPath = getIndexPath()
  try {
    if (!fs.existsSync(indexPath)) return []
    return fs.readJsonSync(indexPath) as SavedScanMeta[]
  } catch (err) {
    log.warn(`Failed to read scan index: ${(err as Error).message}`)
    return []
  }
}

async function writeIndex(entries: SavedScanMeta[]): Promise<void> {
  const indexPath = getIndexPath()
  await fs.ensureDir(path.dirname(indexPath))
  await fs.writeJson(indexPath, entries, { spaces: 2 })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return all saved scan metadata entries, newest first.
 */
export function listSavedScans(): SavedScanMeta[] {
  const entries = readIndex()
  log.info(`listSavedScans: ${entries.length} entries`)
  return entries.slice().reverse()
}

/**
 * Load a full AuditResult by scan ID.
 * Returns null if the scan is not found or the file is unreadable.
 */
export function loadScanById(scanId: string): AuditResult | null {
  const jsonPath = buildJsonPath(scanId)
  try {
    if (!fs.existsSync(jsonPath)) {
      log.warn(`loadScanById: file not found — ${jsonPath}`)
      return null
    }
    const result = fs.readJsonSync(jsonPath) as AuditResult
    log.info(`loadScanById: loaded ${scanId}`)
    return result
  } catch (err) {
    log.warn(`loadScanById: failed — ${(err as Error).message}`)
    return null
  }
}

/**
 * Persist a completed scan to the index.
 * Call this after JSON + HTML reports have been written to disk.
 */
export async function saveScan(result: AuditResult): Promise<void> {
  const jsonPath = buildJsonPath(result.id)
  const htmlPath = buildHtmlPath(result.id)

  const meta: SavedScanMeta = {
    id: result.id,
    domain: result.domain,
    scannedAt: result.scannedAt,
    overallScore: result.scores.overall.value,
    businessType: result.detectedBusinessType,
    scanMode: result.request.scanMode,
    jsonPath,
    htmlPath,
  }

  const existing = readIndex().filter((e) => e.id !== result.id)
  await writeIndex([...existing, meta])
  log.info(`saveScan: saved ${result.id} (overall=${meta.overallScore})`)
}

/**
 * Delete all artifacts for a scan ID (directory + index entry).
 */
export async function deleteScan(scanId: string): Promise<void> {
  const dir = getScanArtifactsDir(scanId)
  try {
    await fs.remove(dir)
  } catch {
    // Already gone — ignore
  }
  const updated = readIndex().filter((e) => e.id !== scanId)
  await writeIndex(updated)
  log.info(`deleteScan: removed ${scanId}`)
}
