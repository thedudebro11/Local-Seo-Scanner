import { contextBridge, ipcRenderer } from 'electron'
import type { AuditRequest, AuditResult } from '../src/engine/types/audit'
import type { ScanProgressEvent, SavedScanMeta } from '../src/engine/types/ipc'

/**
 * Safe, typed bridge between the renderer (React) and the main process.
 * Only methods explicitly exposed here are available on window.api.
 */
const api = {
  // ── Scan ───────────────────────────────────────────────────────────────────

  /**
   * Start a scan. Returns the full AuditResult when the scan completes.
   * Progress events arrive separately via onScanProgress.
   */
  startScan: (request: AuditRequest): Promise<AuditResult> =>
    ipcRenderer.invoke('scan:start', request),

  /**
   * Subscribe to scan progress events.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  onScanProgress: (callback: (event: ScanProgressEvent) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: ScanProgressEvent): void =>
      callback(data)
    ipcRenderer.on('scan:progress', listener)
    return () => ipcRenderer.off('scan:progress', listener)
  },

  // ── File / Report ──────────────────────────────────────────────────────────

  /** Return the list of previously saved scans. */
  getSavedScans: (): Promise<SavedScanMeta[]> =>
    ipcRenderer.invoke('file:list-scans'),

  /** Open a saved HTML report in the system default browser. */
  openReport: (path: string): Promise<void> =>
    ipcRenderer.invoke('file:open-report', path),

  /** Open the reports folder in Finder / Explorer. */
  openFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke('file:open-folder', path),

  /** Load a previously saved AuditResult by scan ID. */
  loadScan: (scanId: string): Promise<AuditResult | null> =>
    ipcRenderer.invoke('file:load-scan', scanId),

  // ── App ────────────────────────────────────────────────────────────────────

  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  getPlatform: (): Promise<string> => ipcRenderer.invoke('app:platform'),

  getReportsPath: (): Promise<string> => ipcRenderer.invoke('app:reports-path'),
}

contextBridge.exposeInMainWorld('api', api)

// Export the type so renderer can use it for type-safety
export type ElectronAPI = typeof api
