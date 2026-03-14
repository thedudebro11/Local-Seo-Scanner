import { create } from 'zustand'
import type { BulkScanRequest, BulkScanResult, BulkScanProgressEvent } from '@engine/bulk/bulkTypes'

// ─── State shape ──────────────────────────────────────────────────────────────

type BulkPhase = 'idle' | 'running' | 'done' | 'error'

interface BulkScanState {
  phase: BulkPhase
  /** Live progress event from the current batch. */
  progress: BulkScanProgressEvent | null
  /** Completed batch result. */
  result: BulkScanResult | null
  error: string | null

  startBulkScan: (request: BulkScanRequest) => Promise<void>
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBulkScanStore = create<BulkScanState>((set) => ({
  phase: 'idle',
  progress: null,
  result: null,
  error: null,

  startBulkScan: async (request: BulkScanRequest): Promise<void> => {
    set({ phase: 'running', progress: null, result: null, error: null })

    // Subscribe to per-domain progress events
    const unsubscribe = window.api.onBulkScanProgress((event) => {
      set({ progress: event })
    })

    try {
      const result = await window.api.startBulkScan(request)
      set({ phase: 'done', result, progress: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ phase: 'error', error: message, progress: null })
    } finally {
      unsubscribe()
    }
  },

  reset: () => set({ phase: 'idle', progress: null, result: null, error: null }),
}))
