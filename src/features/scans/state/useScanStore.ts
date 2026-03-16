import { create } from 'zustand'
import type { AuditRequest, AuditResult } from '@engine/types/audit'
import type { SavedScanMeta } from '@engine/types/ipc'

interface ScanState {
  // ── Scan status ───────────────────────────────────────────────────────────
  isScanning: boolean
  progress: number      // 0–100
  stepLabel: string
  currentRequest: AuditRequest | null

  // ── Results ───────────────────────────────────────────────────────────────
  latestResult: AuditResult | null
  savedScans: SavedScanMeta[]

  // ── Error ─────────────────────────────────────────────────────────────────
  error: string | null

  // ── Actions ───────────────────────────────────────────────────────────────
  /**
   * Start a scan. Returns the scan ID on success, null on failure.
   * Subscribes to progress events for the duration of the scan.
   */
  startScan: (request: AuditRequest) => Promise<string | null>

  /** Load saved scan history from disk via IPC. */
  loadSavedScans: () => Promise<void>

  clearError: () => void
  clearResult: () => void
  /** Set a result directly (used when loading a scan from disk). */
  setResult: (result: AuditResult) => void
}

export const useScanStore = create<ScanState>((set) => ({
  isScanning: false,
  progress: 0,
  stepLabel: '',
  currentRequest: null,
  latestResult: null,
  savedScans: [],
  error: null,

  startScan: async (request: AuditRequest): Promise<string | null> => {
    set({
      isScanning: true,
      progress: 0,
      stepLabel: 'Starting…',
      error: null,
      latestResult: null,
      currentRequest: request,
    })

    // Subscribe to live progress events pushed from the main process
    const unsubscribe = window.api.onScanProgress((event) => {
      set({ progress: event.percent, stepLabel: event.step })
    })

    try {
      const result = await window.api.startScan(request)

      set({
        latestResult: result,
        isScanning: false,
        progress: 100,
        stepLabel: 'Complete.',
      })

      return result.id
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({
        isScanning: false,
        error: message,
        stepLabel: '',
      })
      return null
    } finally {
      // Always clean up the progress listener
      unsubscribe()
    }
  },

  loadSavedScans: async (): Promise<void> => {
    try {
      const scans = await window.api.getSavedScans()
      set({ savedScans: scans })
    } catch (err) {
      console.error('[useScanStore] Failed to load saved scans:', err)
    }
  },

  clearError: () => set({ error: null }),
  clearResult: () => set({ latestResult: null, progress: 0, stepLabel: '', currentRequest: null }),
  setResult: (result: AuditResult) => set({ latestResult: result }),
}))
