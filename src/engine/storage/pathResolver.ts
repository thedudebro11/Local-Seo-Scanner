/**
 * Resolves file-system paths for scan artifacts.
 * Runs in the Electron main process — uses app.getPath('userData').
 */

import { app } from 'electron'
import path from 'path'

let _reportsDir: string | null = null

/**
 * Root directory where all scan reports and artifacts are saved.
 * Uses Electron's userData path so it survives app updates.
 */
export function getReportsDir(): string {
  if (!_reportsDir) {
    _reportsDir = path.join(app.getPath('userData'), 'reports')
  }
  return _reportsDir
}

/**
 * Directory for a specific scan's artifacts (JSON + HTML).
 */
export function getScanArtifactsDir(scanId: string): string {
  return path.join(getReportsDir(), scanId)
}

/**
 * Full path for the raw JSON report file.
 */
export function buildJsonPath(scanId: string): string {
  return path.join(getScanArtifactsDir(scanId), 'report.json')
}

/**
 * Full path for the HTML client report file.
 */
export function buildHtmlPath(scanId: string): string {
  return path.join(getScanArtifactsDir(scanId), 'report.html')
}

/**
 * Path for the scan index file (list of all saved scans).
 */
export function getIndexPath(): string {
  return path.join(getReportsDir(), 'index.json')
}

/**
 * Generate a unique scan ID based on domain and timestamp.
 */
export function generateScanId(domain: string): string {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_').slice(0, 40)
  const ts = Date.now()
  return `${safeDomain}_${ts}`
}
