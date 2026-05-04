import { ipcMain } from 'electron'
import type { TrackedSite } from '../../src/engine/monitoring/monitoringTypes'

export function registerMonitoringHandlers(): void {
  ipcMain.handle('monitoring:add-site', async (_, domain: string): Promise<string> => {
    const { addTrackedSite } = await import('../../src/engine/monitoring/siteManager')
    const site = await addTrackedSite(domain)
    return site.siteId
  })

  ipcMain.handle('monitoring:list-sites', async (): Promise<TrackedSite[]> => {
    const { listTrackedSites } = await import('../../src/engine/monitoring/siteManager')
    return listTrackedSites()
  })

  ipcMain.handle('monitoring:remove-site', async (_, siteId: string): Promise<void> => {
    const { removeTrackedSite } = await import('../../src/engine/monitoring/siteManager')
    await removeTrackedSite(siteId)
  })

  ipcMain.handle('monitoring:set-schedule', async (_, siteId: string, intervalDays: number): Promise<void> => {
    const { setSiteSchedule } = await import('../../src/engine/monitoring/siteManager')
    await setSiteSchedule(siteId, intervalDays)
  })
}
