/**
 * Auto-scheduler for monitored sites.
 *
 * Checks every hour (and once on startup) for tracked sites whose nextScanAt
 * is in the past, then runs a quick scan for each one. Sends a desktop
 * notification when each scan completes.
 *
 * Called once from electron/main.ts after storage paths are initialized.
 */

import { createLogger } from '../utils/logger'
import { getSitesDue, getTrackedSite } from './siteManager'
import type { TrackedSite } from './monitoringTypes'

const log = createLogger('monitoringScheduler')

const CHECK_INTERVAL_MS = 60 * 60 * 1000  // 1 hour

let _notifyFn: ((title: string, body: string) => void) | null = null

/**
 * Start the monitoring scheduler.
 *
 * @param notify - Function that sends a desktop notification (injected from
 *                 the Electron main process to avoid engine importing Electron).
 */
export function startMonitoringScheduler(
  notify: (title: string, body: string) => void,
): void {
  _notifyFn = notify
  log.info('Monitoring scheduler started')

  // Check immediately on startup, then every hour
  runCheck().catch((err) => log.warn(`Startup check failed: ${err.message}`))
  setInterval(() => {
    runCheck().catch((err) => log.warn(`Hourly check failed: ${err.message}`))
  }, CHECK_INTERVAL_MS)
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function runCheck(): Promise<void> {
  const due = getSitesDue()
  if (due.length === 0) {
    log.info('Monitoring check: no sites due')
    return
  }
  log.info(`Monitoring check: ${due.length} site(s) due`)

  for (const site of due) {
    await scanSite(site)
  }
}

async function scanSite(site: TrackedSite): Promise<void> {
  log.info(`Scheduled scan starting: ${site.domain}`)
  try {
    const { runScanJob } = await import('../pipeline/runScanJob')
    const result = await runScanJob(
      {
        url: `https://${site.domain}`,
        scanMode: 'quick',
        businessType: 'auto',
        maxPages: 10,
        siteId: site.siteId,
      },
      () => {},
    )

    log.info(`Scheduled scan complete: ${site.domain} — score=${result.scores.overall.value}`)
    _notifyFn?.(
      `Monitoring scan complete`,
      `${site.domain} scored ${result.scores.overall.value}/100`,
    )
  } catch (err) {
    log.warn(`Scheduled scan failed: ${site.domain} — ${(err as Error).message}`)
    _notifyFn?.('Monitoring scan failed', `Could not re-scan ${site.domain}`)
  }
}
