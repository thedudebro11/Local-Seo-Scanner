import { ipcMain, BrowserWindow } from 'electron'
import type { BulkScanRequest, BulkScanResult, BulkScanProgressEvent } from '../../src/engine/bulk/bulkTypes'

/**
 * Register the bulk scan IPC handler.
 * Uses a separate channel (bulk:start / bulk:progress) to keep
 * single-scan and bulk-scan concerns completely isolated.
 */
export function registerBulkScanHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('bulk:start', async (_, request: BulkScanRequest): Promise<BulkScanResult> => {
    const emitProgress = (event: BulkScanProgressEvent): void => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bulk:progress', event)
      }
    }

    try {
      const { runBulkScan } = await import('../../src/engine/bulk/runBulkScan')
      return await runBulkScan(request, emitProgress)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Bulk scan failed: ${message}`)
    }
  })
}
