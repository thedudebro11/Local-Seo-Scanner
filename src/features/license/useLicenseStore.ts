import { create } from 'zustand'
import type { StoredLicense } from '@engine/license/licenseTypes'

type LicenseStatus = 'checking' | 'active' | 'inactive'

interface LicenseStore {
  status: LicenseStatus
  license: StoredLicense | null
  offlineGrace: boolean

  check: () => Promise<boolean>
  activate: (key: string) => Promise<string | null>
  deactivate: () => Promise<void>
}

export const useLicenseStore = create<LicenseStore>((set) => ({
  status: 'checking',
  license: null,
  offlineGrace: false,

  check: async (): Promise<boolean> => {
    set({ status: 'checking' })
    try {
      const result = await window.api.checkLicense()
      set({
        status: result.valid ? 'active' : 'inactive',
        license: result.license,
        offlineGrace: result.offlineGrace ?? false,
      })
      return result.valid
    } catch {
      set({ status: 'inactive', license: null })
      return false
    }
  },

  activate: async (key: string): Promise<string | null> => {
    const result = await window.api.activateLicense(key)
    if (result.success && result.license) {
      set({ status: 'active', license: result.license, offlineGrace: false })
      return null
    }
    return result.error ?? 'Activation failed.'
  },

  deactivate: async (): Promise<void> => {
    await window.api.deactivateLicense()
    set({ status: 'inactive', license: null, offlineGrace: false })
  },
}))
