/**
 * Public entry point for the audit engine.
 * Called by the Electron IPC scan handler in electron/main.ts.
 *
 * This file is intentionally thin — all pipeline logic lives in:
 *   src/engine/pipeline/runScanJob.ts
 *
 * Keeping this wrapper means the IPC layer and any other callers require
 * zero changes after the pipeline refactor.
 */

import type { AuditRequest, AuditResult } from '../types/audit'
import { runScanJob } from '../pipeline/runScanJob'

export type ProgressEmitter = (step: string, percent: number, message?: string) => void

/**
 * Run a full audit for the given request.
 * The emitProgress callback pushes ScanProgressEvents to the renderer via IPC.
 */
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult> {
  return runScanJob(request, emitProgress)
}
