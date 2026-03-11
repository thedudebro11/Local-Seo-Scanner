/**
 * Resolves file-system paths for scan artifacts.
 * Pure Node.js — no Electron dependency.
 *
 * The Electron shell must call initReportsDir(app.getPath('userData')) once
 * during app startup (before any scan runs) to set the base storage path.
 */

import path from 'path'

let _reportsDir: string | null = null

/**
 * Called once by the Electron main process to set the userData base path.
 * Must be called before any scan starts.
 */
export function initReportsDir(userDataPath: string): void {
  _reportsDir = path.join(userDataPath, 'reports')
}

/**
 * Root directory where all scan reports and artifacts are saved.
 */
export function getReportsDir(): string {
  if (!_reportsDir) {
    throw new Error(
      'pathResolver: initReportsDir() has not been called. ' +
      'Call it from the Electron main process before starting scans.',
    )
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
 * Directory where visual analysis screenshots are saved for a scan.
 */
export function getScreenshotsDir(scanId: string): string {
  return path.join(getScanArtifactsDir(scanId), 'screenshots')
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
