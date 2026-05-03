import { ipcMain } from 'electron'
import type { LicenseActivateResult, LicenseCheckResult } from '../../src/engine/license/licenseTypes'

export function registerLicenseHandlers(): void {
  ipcMain.handle('license:activate', async (_, key: string): Promise<LicenseActivateResult> => {
    const { activateLicense } = await import('../../src/engine/license/licenseValidator')
    return activateLicense(key)
  })

  ipcMain.handle('license:check', async (): Promise<LicenseCheckResult> => {
    if (process.env.NODE_ENV === 'development') {
      return { valid: true, license: null }
    }
    const { checkLicense } = await import('../../src/engine/license/licenseValidator')
    return checkLicense()
  })

  ipcMain.handle('license:deactivate', async (): Promise<void> => {
    const { deactivateLicense } = await import('../../src/engine/license/licenseValidator')
    return deactivateLicense()
  })
}
