/**
 * IPC channel names and payload types.
 * Shared between the main process (scanHandlers, fileHandlers) and the renderer
 * (preload bridge + Zustand store).
 */

export type IpcChannel =
  | 'scan:start'
  | 'scan:progress'
  | 'bulk:start'
  | 'bulk:progress'
  | 'discovery:run'
  | 'market:build'
  | 'monitoring:add-site'
  | 'file:list-scans'
  | 'file:open-report'
  | 'file:open-folder'
  | 'file:load-scan'
  | 'app:version'
  | 'app:platform'
  | 'app:reports-path'
  | 'license:activate'
  | 'license:check'
  | 'license:deactivate'
  | 'settings:get'
  | 'settings:save'
  | 'file:email-report'

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface ScanProgressEvent {
  step: string        // e.g. "Fetching homepage…"
  percent: number     // 0–100
  message?: string    // optional detail
}

// ─── Scan metadata (saved index) ─────────────────────────────────────────────

export interface SavedScanMeta {
  id: string
  domain: string
  scannedAt: string    // ISO timestamp
  overallScore: number
  businessType: string
  scanMode: string
  jsonPath: string
  htmlPath: string
}

// ─── Renderer-side API contract ───────────────────────────────────────────────
// This mirrors the object exposed via contextBridge in preload.ts

import type { AuditRequest, AuditResult } from './audit'
import type { BulkScanRequest, BulkScanResult, BulkScanProgressEvent } from '../bulk/bulkTypes'
import type { MarketDiscoveryRequest, MarketDiscoveryResult } from '../discovery/discoveryTypes'
import type { MarketDashboard } from '../market/marketTypes'
import type { LicenseActivateResult, LicenseCheckResult } from '../license/licenseTypes'
import type { AppSettings } from '../settings/settingsTypes'

export interface ElectronAPI {
  startScan: (request: AuditRequest) => Promise<AuditResult>
  onScanProgress: (callback: (event: ScanProgressEvent) => void) => () => void
  startBulkScan: (request: BulkScanRequest) => Promise<BulkScanResult>
  onBulkScanProgress: (callback: (event: BulkScanProgressEvent) => void) => () => void
  runDiscovery: (request: MarketDiscoveryRequest) => Promise<MarketDiscoveryResult>
  buildMarketDashboard: (payload: { bulkResult: BulkScanResult; label?: string }) => Promise<MarketDashboard>
  addMonitoredSite: (domain: string) => Promise<string>
  getSavedScans: () => Promise<SavedScanMeta[]>
  openReport: (path: string) => Promise<void>
  openFolder: (path: string) => Promise<void>
  loadScan: (scanId: string) => Promise<AuditResult | null>
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getReportsPath: () => Promise<string>
  activateLicense: (key: string) => Promise<LicenseActivateResult>
  checkLicense: () => Promise<LicenseCheckResult>
  deactivateLicense: () => Promise<void>
  getSettings: () => Promise<AppSettings>
  saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  emailReport: (payload: { htmlPath: string; domain: string }) => Promise<void>
}

// Augment the global Window type so renderer code gets proper types on window.api
declare global {
  interface Window {
    api: ElectronAPI
  }
}
