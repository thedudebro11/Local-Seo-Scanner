import { ipcMain, app } from 'electron'

/**
 * Register general app-level IPC handlers.
 */
export function registerAppHandlers(): void {
  ipcMain.handle('app:version', (): string => {
    return app.getVersion()
  })

  ipcMain.handle('app:platform', (): string => {
    return process.platform
  })

  ipcMain.handle('app:reports-path', async (): Promise<string> => {
    const { getReportsDir } = await import('../../src/engine/storage/pathResolver')
    return getReportsDir()
  })
}
