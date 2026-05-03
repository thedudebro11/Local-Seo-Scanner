import { ipcMain } from 'electron'
import type { AppSettings } from '../../src/engine/settings/settingsTypes'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    const { readSettings } = await import('../../src/engine/settings/settingsStorage')
    return readSettings()
  })

  ipcMain.handle('settings:save', async (_, partial: Partial<AppSettings>): Promise<AppSettings> => {
    const { mergeSettings } = await import('../../src/engine/settings/settingsStorage')
    return mergeSettings(partial)
  })
}
