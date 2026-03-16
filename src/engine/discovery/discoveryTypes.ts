/**
 * Market discovery data model — Phase 14.
 * Pure TypeScript interfaces — no runtime imports.
 */

// ─── Request ──────────────────────────────────────────────────────────────────

export interface MarketDiscoveryRequest {
  industry: string
  location: string
  maxResults: number
}

// ─── Candidate classification ─────────────────────────────────────────────────

/** Classification assigned by the candidate classifier before acceptance. */
export type CandidateClass = 'business' | 'directory' | 'marketplace' | 'social' | 'government' | 'unknown'

// ─── Discovered business ──────────────────────────────────────────────────────

export interface DiscoveredBusiness {
  name: string
  /** Normalized root domain, e.g. "goettl.com". Undefined when no website found. */
  domain?: string
  /** Original full URL from the search result (before path stripping). */
  sourceUrl?: string
  /** Search engine used, e.g. "duckduckgo" */
  source: string
  /** 1-based position in the original search results. */
  rankingPosition?: number
  rating?: number
  reviewCount?: number
  hasWebsite: boolean
  /** Classification assigned by classifyCandidate(). */
  classification?: CandidateClass
  /** Human-readable reason for rejection (set when excluded by classifier or blocklist). */
  rejectionReason?: string
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface MarketDiscoveryResult {
  discoveryId: string
  request: MarketDiscoveryRequest
  discoveredAt: string        // ISO timestamp
  discovered: DiscoveredBusiness[]
  /** Deduplicated, normalized root domains ready to pass to bulk scan. */
  validDomains: string[]
}
