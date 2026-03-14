/**
 * Tracked-site CRUD — Phase 12.
 *
 * Persists a flat array of TrackedSite objects to monitoring/sites.json.
 * All write operations are async; reads are sync (file is small).
 * Never throws — callers must handle the optional return values.
 */

import path from 'path'
import fs from 'fs-extra'
import { getSitesPath } from './monitoringPaths'
import type { TrackedSite } from './monitoringTypes'
import { createLogger } from '../utils/logger'

const log = createLogger('siteManager')

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readSites(): TrackedSite[] {
  try {
    const p = getSitesPath()
    if (!fs.existsSync(p)) return []
    return fs.readJsonSync(p) as TrackedSite[]
  } catch (err) {
    log.warn(`readSites failed: ${(err as Error).message}`)
    return []
  }
}

async function writeSites(sites: TrackedSite[]): Promise<void> {
  const p = getSitesPath()
  await fs.ensureDir(path.dirname(p))
  await fs.writeJson(p, sites, { spaces: 2 })
}

function generateSiteId(domain: string): string {
  const safe = domain.replace(/[^a-z0-9.-]/gi, '_').slice(0, 30)
  return `site_${safe}_${Date.now()}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a site for monitoring. If a site with the same domain already
 * exists, the existing entry is returned without creating a duplicate.
 */
export async function addTrackedSite(
  domain: string,
  businessType?: string,
): Promise<TrackedSite> {
  const sites = readSites()
  const existing = sites.find((s) => s.domain === domain)
  if (existing) return existing

  const site: TrackedSite = {
    siteId: generateSiteId(domain),
    domain,
    businessType,
    dateAdded: new Date().toISOString(),
  }
  await writeSites([...sites, site])
  log.info(`addTrackedSite: ${domain} → ${site.siteId}`)
  return site
}

/**
 * Return all tracked sites in registration order.
 */
export function listTrackedSites(): TrackedSite[] {
  return readSites()
}

/**
 * Find a tracked site by its siteId. Returns null if not found.
 */
export function getTrackedSite(siteId: string): TrackedSite | null {
  return readSites().find((s) => s.siteId === siteId) ?? null
}

/**
 * Update the lastScanId for a tracked site after a successful scan.
 * Silently ignores unknown siteIds (site may have been deleted).
 */
export async function updateTrackedSiteLastScan(
  siteId: string,
  scanId: string,
): Promise<void> {
  const sites = readSites()
  const idx = sites.findIndex((s) => s.siteId === siteId)
  if (idx === -1) {
    log.warn(`updateTrackedSiteLastScan: unknown siteId — ${siteId}`)
    return
  }
  sites[idx] = { ...sites[idx], lastScanId: scanId }
  await writeSites(sites)
  log.info(`updateTrackedSiteLastScan: ${siteId} → lastScanId=${scanId}`)
}
