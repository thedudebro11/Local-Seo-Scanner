/**
 * Competitor discovery interface.
 *
 * A CompetitorDiscoveryFn receives the client domain + business type and
 * returns a list of competitor URLs to analyze.
 *
 * This phase uses manually provided URLs (via AuditRequest.competitorUrls).
 * Auto-discovery is intentionally left as a pluggable stub so future providers
 * (Google Places API, Yelp, any SERP provider) can be wired in without changing
 * the core engine.
 *
 * To implement auto-discovery:
 *   1. Create a function that matches CompetitorDiscoveryFn
 *   2. Pass it to runCompetitorAnalysis as the optional `discover` parameter
 */

export type CompetitorDiscoveryFn = (
  domain: string,
  businessType: string,
) => Promise<string[]>

/**
 * No-op discovery — always returns an empty list.
 * Used when no discovery provider is configured (the default).
 */
export const noopDiscovery: CompetitorDiscoveryFn = async () => []
