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

// ─── Discovered business ──────────────────────────────────────────────────────

export interface DiscoveredBusiness {
  name: string
  /** Normalized root domain, e.g. "goettl.com". Undefined when no website found. */
  domain?: string
  /** Search engine used, e.g. "duckduckgo" */
  source: string
  /** 1-based position in the original search results. */
  rankingPosition?: number
  rating?: number
  reviewCount?: number
  hasWebsite: boolean
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
