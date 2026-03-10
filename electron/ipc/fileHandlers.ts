import { ipcMain, shell } from 'electron'
import type { SavedScanMeta } from '../../src/engine/types/ipc'
import type { AuditResult } from '../../src/engine/types/audit'

/**
 * Register all file / report-related IPC handlers.
 */
export function registerFileHandlers(): void {
  // List all saved scans from the repository
  ipcMain.handle('file:list-scans', async (): Promise<SavedScanMeta[]> => {
    const { listSavedScans } = await import('../../src/engine/storage/scanRepository')
    return listSavedScans()
  })

  // Open a saved HTML report in the system's default browser
  ipcMain.handle('file:open-report', async (_, reportPath: string): Promise<void> => {
    await shell.openPath(reportPath)
  })

  // Reveal the reports folder in Finder / Explorer
  ipcMain.handle('file:open-folder', async (_, folderPath: string): Promise<void> => {
    shell.showItemInFolder(folderPath)
  })

  // Load a full AuditResult from disk by scan ID
  ipcMain.handle('file:load-scan', async (_, scanId: string): Promise<AuditResult | null> => {
    const { loadScanById } = await import('../../src/engine/storage/scanRepository')
    return loadScanById(scanId)
  })
}
