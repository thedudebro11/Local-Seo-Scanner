/**
 * Candidate classifier — Phase 14 (enhanced filtering).
 *
 * Classifies a discovered search result as a local business or non-business
 * (directory, marketplace, social, government) using domain, title, and
 * URL path heuristics — no HTTP requests required.
 *
 * Classification rules (applied in order):
 *  1. Government TLD  → 'government'
 *  2. Known social domain patterns → 'social'
 *  3. Domain contains directory/ranking keywords → 'directory'
 *  4. Result title matches list/ranking patterns → 'directory'
 *  5. Source URL path matches directory path patterns → 'directory'
 *  6. No negative signals found → 'business'
 */

import type { CandidateClass } from './discoveryTypes'

export interface ClassificationResult {
  classification: CandidateClass
  /** Short human-readable reason, empty string for 'business'. */
  reason: string
}

// ─── Pattern tables ────────────────────────────────────────────────────────────

/** Hostname suffixes that unambiguously identify social networks. */
const SOCIAL_DOMAINS = new Set([
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'youtube.com', 'pinterest.com',
  'snapchat.com', 'nextdoor.com', 'threads.net',
])

/**
 * Substrings that, when found in a hostname, indicate a directory/ranking/
 * aggregator site rather than an actual business.
 */
const DIRECTORY_DOMAIN_SUBSTRINGS = [
  'bestrated', 'bestpros', 'bestintown',
  'toprated', 'topreview', 'toplocal',
  'directory', 'directories',
  'yellowpage', 'superpages', 'phonebook',
  'citysearch', 'merchantcircle',
  'localpages', 'localguide',
  'reviewsite', 'ratingsite',
  'findabest', 'findthebest',
  'expertise', 'comparebest',
]

/**
 * Regex patterns for result titles that indicate list/ranking pages rather
 * than a single local business.
 */
const DIRECTORY_TITLE_PATTERNS: RegExp[] = [
  /^best\s+\d+/i,              // "Best 10 Roofers in…"
  /\btop\s+\d+\b/i,            // "Top 10 HVAC Companies"
  /\b\d+\s+best\b/i,           // "10 Best Plumbers…"
  /\bbest\s+\w[\w\s]*\s+in\b/i, // "Best Plumbers in Phoenix"
  /\bnear\s+me\b/i,            // "Plumbers Near Me"
  /\bdirectory\b/i,
  /\blistings?\b/i,
  /\brated\s+\w/i,             // "Rated Contractors…"
  /\bcompare\s+\w/i,           // "Compare Roofers"
  /\bfind\s+(a|the|local)\b/i, // "Find a Plumber"
  /\breviews?\s+&\s+ratings?\b/i,
  /\bpros?\s+in\b/i,           // "Pros in Tucson"
  /\bclaim\s+this\s+business\b/i,
]

/**
 * Path patterns (matched against the URL pathname) that indicate a listing or
 * category page embedded in an otherwise legitimate-looking domain.
 */
const DIRECTORY_PATH_PATTERNS: RegExp[] = [
  /\/best-[a-z]/i,             // /best-plumbers-in-phoenix
  /\/top-\d/i,                 // /top-10-hvac
  /\/near-me\b/i,
  /\/directory\//i,
  /\/listings?\//i,
  /\/category\//i,
  /\/companies\//i,
  /\/business(?:es)?\//i,
  /\/roundup\//i,
  /\/providers?\//i,
  /\/find-[a-z]/i,             // /find-a-plumber
  /\/compare\//i,
  /\/local\/[^/]+\/[^/]+/i,    // /local/plumbers/phoenix — deep local path
  /\/search\?/i,               // search result pages (e.g. Yelp /search?find_desc=…)
]

// ─── Classifier ────────────────────────────────────────────────────────────────

/**
 * Classify a single discovery candidate.
 *
 * @param name      The display name / page title from the search result.
 * @param hostname  The normalised hostname (no www.), e.g. "goettl.com".
 * @param sourceUrl The original full URL from the search result (optional).
 */
export function classifyCandidate(
  name: string,
  hostname: string,
  sourceUrl?: string,
): ClassificationResult {
  const host = hostname.toLowerCase().replace(/^www\./, '')

  // 1. Government TLD
  if (
    host.endsWith('.gov') ||
    host.endsWith('.gov.au') ||
    host.endsWith('.gov.uk') ||
    host.endsWith('.mil')
  ) {
    return { classification: 'government', reason: 'government domain' }
  }

  // 2. Social network
  if (SOCIAL_DOMAINS.has(host) || [...SOCIAL_DOMAINS].some((s) => host.endsWith(`.${s}`))) {
    return { classification: 'social', reason: `social network: ${host}` }
  }

  // 3. Directory/ranking domain keyword
  const domainHit = DIRECTORY_DOMAIN_SUBSTRINGS.find((kw) => host.includes(kw))
  if (domainHit) {
    return { classification: 'directory', reason: `directory domain keyword: "${domainHit}"` }
  }

  // 4. Title pattern
  const titleHit = DIRECTORY_TITLE_PATTERNS.find((re) => re.test(name))
  if (titleHit) {
    return { classification: 'directory', reason: `directory title pattern matched: "${name}"` }
  }

  // 5. URL path pattern
  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname + new URL(sourceUrl).search
      const pathHit = DIRECTORY_PATH_PATTERNS.find((re) => re.test(pathname))
      if (pathHit) {
        return { classification: 'directory', reason: `directory URL path: ${pathname}` }
      }
    } catch {
      // Unparseable source URL — skip path check
    }
  }

  // No negative signals — treat as a business
  return { classification: 'business', reason: '' }
}
