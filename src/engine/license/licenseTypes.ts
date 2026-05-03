export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'invalid'

export interface StoredLicense {
  key: string
  instanceId: string
  instanceName: string
  activatedAt: string
  lastValidatedAt: string
  email?: string
  customerName?: string
  productName?: string
  variantName?: string
  status: LicenseStatus
}

export interface LicenseActivateResult {
  success: boolean
  license?: StoredLicense
  error?: string
}

export interface LicenseCheckResult {
  valid: boolean
  license: StoredLicense | null
  offlineGrace?: boolean
}
