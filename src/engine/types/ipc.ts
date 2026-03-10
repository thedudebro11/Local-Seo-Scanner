/**
 * IPC channel names and payload types.
 * Shared between the main process (scanHandlers, fileHandlers) and the renderer
 * (preload bridge + Zustand store).
 */

export type IpcChannel =
  | 'scan:start'
  | 'scan:progress'
  | 'file:list-scans'
  | 'file:open-report'
  | 'file:open-folder'
  | 'file:load-scan'
  | 'app:version'
  | 'app:platform'
  | 'app:reports-path'

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

export interface ElectronAPI {
  startScan: (request: AuditRequest) => Promise<AuditResult>
  onScanProgress: (callback: (event: ScanProgressEvent) => void) => () => void
  getSavedScans: () => Promise<SavedScanMeta[]>
  openReport: (path: string) => Promise<void>
  openFolder: (path: string) => Promise<void>
  loadScan: (scanId: string) => Promise<AuditResult | null>
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getReportsPath: () => Promise<string>
}

// Augment the global Window type so renderer code gets proper types on window.api
declare global {
  interface Window {
    api: ElectronAPI
  }
}
