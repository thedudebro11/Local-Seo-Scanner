import { ipcMain } from 'electron'
import type { MarketDiscoveryRequest, MarketDiscoveryResult } from '../../src/engine/discovery/discoveryTypes'

/**
 * Register the market discovery IPC handler.
 * Discovery is a one-shot invoke — no streaming progress needed.
 */
export function registerDiscoveryHandlers(): void {
  ipcMain.handle('discovery:run', async (_, request: MarketDiscoveryRequest): Promise<MarketDiscoveryResult> => {
    try {
      const { runMarketDiscovery } = await import('../../src/engine/discovery/marketDiscovery')
      return await runMarketDiscovery(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Discovery failed: ${message}`)
    }
  })
}
