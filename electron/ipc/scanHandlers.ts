import { ipcMain, BrowserWindow } from 'electron'
import type { AuditRequest, AuditResult } from '../../src/engine/types/audit'
import type { ScanProgressEvent } from '../../src/engine/types/ipc'

/**
 * Register all scan-related IPC handlers.
 * The mainWindow reference is needed to push progress events back to the renderer.
 */
export function registerScanHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('scan:start', async (_, request: AuditRequest): Promise<AuditResult> => {
    // Helper: push a progress event to the renderer
    const emitProgress = (step: string, percent: number, message?: string): void => {
      const event: ScanProgressEvent = { step, percent, message }
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan:progress', event)
      }
    }

    try {
      // Lazily import the audit orchestrator so it is only loaded in the main process
      const { runAudit } = await import('../../src/engine/orchestrator/runAudit')
      const result = await runAudit(request, emitProgress)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Scan failed: ${message}`)
    }
  })
}
