/**
 * Path helpers for the monitoring storage layer.
 *
 * Storage layout (under userData/):
 *
 *   monitoring/
 *     sites.json          — flat array of TrackedSite objects
 *     history/
 *       <siteId>/
 *         <scanId>.json   — one SiteScanSummary per completed scan
 *
 * initMonitoringDir() must be called once from the Electron main process
 * (alongside initReportsDir) before any monitoring functions are used.
 */

import path from 'path'

let _monitoringDir: string | null = null

/**
 * Called once by the Electron main process with app.getPath('userData').
 */
export function initMonitoringDir(userDataPath: string): void {
  _monitoringDir = path.join(userDataPath, 'monitoring')
}

export function getMonitoringDir(): string {
  if (!_monitoringDir) {
    throw new Error(
      'monitoringPaths: initMonitoringDir() has not been called. ' +
      'Call it from the Electron main process before using monitoring features.',
    )
  }
  return _monitoringDir
}

/** Full path to the tracked-sites index file. */
export function getSitesPath(): string {
  return path.join(getMonitoringDir(), 'sites.json')
}

/** Directory holding all scan summaries for one tracked site. */
export function getSiteHistoryDir(siteId: string): string {
  return path.join(getMonitoringDir(), 'history', siteId)
}

/** Full path for a single scan summary file. */
export function getScanSummaryPath(siteId: string, scanId: string): string {
  return path.join(getSiteHistoryDir(siteId), `${scanId}.json`)
}
