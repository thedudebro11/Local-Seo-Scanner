/**
 * Candidate filtering — Phase 14.
 *
 * Removes directories, deduplicates normalized domains, and separates
 * scannable businesses from non-scannable ones (no website).
 */

import { isBlockedDomain } from './directoryBlocklist'
import { normalizeToDomain } from './normalizeDomain'
import type { DiscoveredBusiness } from './discoveryTypes'
import { createLogger } from '../utils/logger'

const log = createLogger('filterCandidates')

export interface FilterResult {
  /** Businesses with valid, unblocked websites. */
  scannable: DiscoveredBusiness[]
  /** Businesses with no website or a blocked domain (shown disabled in UI). */
  excluded: DiscoveredBusiness[]
  /** Deduplicated list of normalized URLs for the scannable set. */
  validDomains: string[]
}

/**
 * Filter a raw list of discovered businesses.
 *
 * Rules applied (in order):
 *  1. Entries with no domain are moved to excluded.
 *  2. Domains that fail normalization are moved to excluded.
 *  3. Blocked / directory domains are moved to excluded.
 *  4. Duplicate normalized domains are collapsed (first occurrence kept).
 */
export function filterCandidates(discovered: DiscoveredBusiness[]): FilterResult {
  const scannable: DiscoveredBusiness[] = []
  const excluded: DiscoveredBusiness[] = []
  const seenDomains = new Set<string>()
  const validDomains: string[] = []

  for (const biz of discovered) {
    if (!biz.domain) {
      excluded.push(biz)
      continue
    }

    const normalized = normalizeToDomain(biz.domain)
    if (!normalized) {
      log.warn(`filterCandidates: could not normalize "${biz.domain}" — excluding`)
      excluded.push(biz)
      continue
    }

    const hostname = new URL(normalized).hostname
    if (isBlockedDomain(hostname)) {
      log.warn(`filterCandidates: blocked domain "${hostname}" — excluding`)
      excluded.push(biz)
      continue
    }

    if (seenDomains.has(normalized)) {
      log.warn(`filterCandidates: duplicate domain "${hostname}" — deduped`)
      continue
    }

    seenDomains.add(normalized)
    validDomains.push(normalized)
    scannable.push({ ...biz, domain: normalized })
  }

  log.info(
    `filterCandidates: ${scannable.length} scannable, ${excluded.length} excluded, ` +
    `${discovered.length - scannable.length - excluded.length} deduped`,
  )

  return { scannable, excluded, validDomains }
}
