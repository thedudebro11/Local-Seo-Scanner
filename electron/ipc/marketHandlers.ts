/**
 * IPC handlers for Phase 15 — Market Intelligence Dashboard.
 *
 * Channels:
 *   market:build          – build a MarketDashboard from a BulkScanResult
 *   monitoring:add-site   – track a domain in the monitoring system
 */

import { ipcMain } from 'electron'
import type { BulkScanResult } from '../../src/engine/bulk/bulkTypes'
import type { MarketDashboard } from '../../src/engine/market/marketTypes'

export function registerMarketHandlers(): void {
  // ── market:build ──────────────────────────────────────────────────────────

  ipcMain.handle(
    'market:build',
    async (
      _,
      payload: { bulkResult: BulkScanResult; label?: string },
    ): Promise<MarketDashboard> => {
      const { buildMarketDashboard } = await import('../../src/engine/market/buildMarketDashboard')
      return buildMarketDashboard({ bulkResult: payload.bulkResult, label: payload.label })
    },
  )

  // ── monitoring:add-site ───────────────────────────────────────────────────

  ipcMain.handle(
    'monitoring:add-site',
    async (_, domain: string): Promise<string> => {
      const { addTrackedSite } = await import('../../src/engine/monitoring/siteManager')
      const site = await addTrackedSite(domain)
      return site.siteId
    },
  )
}
