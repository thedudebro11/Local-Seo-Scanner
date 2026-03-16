/**
 * Candidate filtering — Phase 14 (enhanced with classifier).
 *
 * Removes directories, deduplicates normalized domains, and separates
 * scannable businesses from non-scannable ones (no website, blocked domain,
 * or classified as non-business by the candidate classifier).
 *
 * Filter pipeline (in order per candidate):
 *  1. No domain → excluded (no website)
 *  2. Domain fails normalization → excluded (invalid)
 *  3. Blocked / directory domain (hard blocklist) → excluded (directory/social)
 *  4. Candidate classifier → excluded if classified as directory/social/government/marketplace
 *  5. Duplicate normalized domain → silently deduped
 *  6. Otherwise → scannable
 */

import { isBlockedDomain } from './directoryBlocklist'
import { normalizeToDomain } from './normalizeDomain'
import { classifyCandidate } from './classifyCandidate'
import type { DiscoveredBusiness } from './discoveryTypes'
import { createLogger } from '../utils/logger'

const log = createLogger('filterCandidates')

export interface FilterResult {
  /** Businesses with valid, unblocked, business-classified websites. */
  scannable: DiscoveredBusiness[]
  /** Candidates removed for any reason (shown disabled in UI with reason). */
  excluded: DiscoveredBusiness[]
  /** Deduplicated list of normalized URLs for the scannable set. */
  validDomains: string[]
}

/**
 * Filter a raw list of discovered businesses.
 */
export function filterCandidates(discovered: DiscoveredBusiness[]): FilterResult {
  const scannable: DiscoveredBusiness[] = []
  const excluded: DiscoveredBusiness[] = []
  const seenDomains = new Set<string>()
  const validDomains: string[] = []

  for (const biz of discovered) {
    // 1. No domain
    if (!biz.domain) {
      excluded.push({ ...biz, rejectionReason: 'no website' })
      continue
    }

    // 2. Normalization check
    const normalized = normalizeToDomain(biz.domain)
    if (!normalized) {
      log.warn(`filterCandidates: could not normalize "${biz.domain}" — excluding`)
      excluded.push({ ...biz, rejectionReason: 'invalid domain' })
      continue
    }

    const hostname = new URL(normalized).hostname

    // 3. Hard blocklist
    if (isBlockedDomain(hostname)) {
      log.warn(`filterCandidates: blocked domain "${hostname}" — excluding`)
      const reason = deriveBlocklistReason(hostname)
      excluded.push({ ...biz, domain: normalized, rejectionReason: reason })
      continue
    }

    // 4. Candidate classifier
    const { classification, reason } = classifyCandidate(biz.name, hostname, biz.sourceUrl)
    if (classification !== 'business') {
      log.warn(`filterCandidates: classifier rejected "${hostname}" as ${classification} — ${reason}`)
      const label = classificationLabel(classification)
      excluded.push({
        ...biz,
        domain: normalized,
        classification,
        rejectionReason: `rejected: ${label}${reason ? ` (${reason})` : ''}`,
      })
      continue
    }

    // 5. Deduplication
    if (seenDomains.has(normalized)) {
      log.warn(`filterCandidates: duplicate domain "${hostname}" — deduped`)
      continue
    }

    seenDomains.add(normalized)
    validDomains.push(normalized)
    scannable.push({ ...biz, domain: normalized, classification: 'business' })
  }

  const deduped = discovered.length - scannable.length - excluded.length
  log.info(
    `filterCandidates: ${scannable.length} scannable, ${excluded.length} excluded` +
    (deduped > 0 ? `, ${deduped} deduped` : ''),
  )

  return { scannable, excluded, validDomains }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classificationLabel(c: string): string {
  switch (c) {
    case 'directory':   return 'directory'
    case 'social':      return 'social'
    case 'government':  return 'government'
    case 'marketplace': return 'marketplace'
    default:            return c
  }
}

/**
 * Derive a user-readable reason for a hard blocklist hit by checking which
 * category the domain falls into.
 */
function deriveBlocklistReason(hostname: string): string {
  const social = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
    'tiktok.com', 'youtube.com', 'pinterest.com', 'snapchat.com', 'nextdoor.com']
  if (social.some((s) => hostname === s || hostname.endsWith(`.${s}`))) {
    return 'rejected: social'
  }
  return 'rejected: directory'
}
