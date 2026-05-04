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
 * Update the lastScanId and advance nextScanAt by the site's interval.
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
  const site = sites[idx]
  const intervalDays = site.scanIntervalDays ?? 7
  const nextScanAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
  sites[idx] = { ...site, lastScanId: scanId, nextScanAt }
  await writeSites(sites)
  log.info(`updateTrackedSiteLastScan: ${siteId} → lastScanId=${scanId}, nextScanAt=${nextScanAt}`)
}

/**
 * Return all tracked sites that are due for a re-scan (nextScanAt is in the past).
 * Sites with no nextScanAt set are never automatically included.
 */
export function getSitesDue(): TrackedSite[] {
  const now = new Date()
  return readSites().filter((s) => s.nextScanAt && new Date(s.nextScanAt) <= now)
}

/**
 * Set the scan interval for a tracked site and compute the next scan time.
 */
export async function setSiteSchedule(siteId: string, intervalDays: number): Promise<void> {
  const sites = readSites()
  const idx = sites.findIndex((s) => s.siteId === siteId)
  if (idx === -1) return
  const nextScanAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
  sites[idx] = { ...sites[idx], scanIntervalDays: intervalDays, nextScanAt }
  await writeSites(sites)
  log.info(`setSiteSchedule: ${siteId} → every ${intervalDays}d, next=${nextScanAt}`)
}

/**
 * Remove a tracked site from monitoring. Does not delete its scan history.
 */
export async function removeTrackedSite(siteId: string): Promise<void> {
  const sites = readSites().filter((s) => s.siteId !== siteId)
  await writeSites(sites)
  log.info(`removeTrackedSite: ${siteId}`)
}
