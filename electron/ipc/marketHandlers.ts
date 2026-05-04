import { ipcMain } from 'electron'
import type { BulkScanResult } from '../../src/engine/bulk/bulkTypes'
import type { MarketDashboard } from '../../src/engine/market/marketTypes'

export function registerMarketHandlers(): void {
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
}
