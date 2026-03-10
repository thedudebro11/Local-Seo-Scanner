/**
 * Scan repository — reads and writes the saved scan index and individual results.
 * Runs in the Electron main process.
 *
 * Phase 1 stub: Returns empty arrays until Phase 7 wires up real persistence.
 */

import type { SavedScanMeta } from '../types/ipc'
import type { AuditResult } from '../types/audit'
import { createLogger } from '../utils/logger'

const log = createLogger('scanRepository')

/**
 * Return all saved scan metadata entries.
 * Phase 1: returns [] until report persistence is implemented in Phase 7.
 */
export function listSavedScans(): SavedScanMeta[] {
  // TODO (Phase 7): read from index.json via fs-extra
  log.info('listSavedScans called — returning [] (Phase 1 stub)')
  return []
}

/**
 * Load a full AuditResult by scan ID.
 * Phase 1: always returns null.
 */
export function loadScanById(_scanId: string): AuditResult | null {
  // TODO (Phase 7): read report.json from the scan artifacts dir
  log.info(`loadScanById(${_scanId}) called — returning null (Phase 1 stub)`)
  return null
}

/**
 * Append a completed scan to the index and write it to disk.
 * Phase 1: no-op.
 */
export async function saveScan(_result: AuditResult): Promise<void> {
  // TODO (Phase 7): write JSON report + update index.json
  log.info('saveScan called — no-op (Phase 1 stub)')
}
