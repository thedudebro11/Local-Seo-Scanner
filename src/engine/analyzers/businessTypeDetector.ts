/**
 * Auto-detects the local business niche from crawled page signals.
 * Used when the user selects "auto" in the scan form.
 * Detection order: URL paths → titles/headings → body text.
 */

import type { CrawledPage, BusinessType } from '../types/audit'

interface DetectionRule {
  pattern: RegExp
  type: BusinessType
}

// Rules are evaluated in order — first match wins.
const RULES: DetectionRule[] = [
  {
    pattern:
      /\b(restaurant|menu|dining|cuisine|cafe|bistro|diner|eatery|food|pizza|sushi|burger|steak|seafood|takeout|takeaway|delivery)\b/i,
    type: 'restaurant',
  },
  {
    pattern:
      /\b(salon|hair\s*(salon|studio|cut)|nail\s*(salon|studio)|spa|beauty\s*(salon|studio)|barber|stylist|wax|lash|brow|blowout)\b/i,
    type: 'salon',
  },
  {
    pattern:
      /\b(roofer|roofing|roof\s*(repair|replacement|installation)|shingles|gutters|siding|metal\s*roof|flat\s*roof)\b/i,
    type: 'roofer',
  },
  {
    pattern:
      /\b(auto\s*(repair|shop|service|mechanic)|car\s*(repair|service|mechanic)|oil\s*change|tire\s*(shop|service)|transmission|brake\s*(service|repair))\b/i,
    type: 'auto_shop',
  },
  {
    pattern:
      /\b(contractor|construction|remodel|renovation|home\s*(improvement|remodel)|general\s*contractor|handyman|plumber|plumbing|electrician|hvac|landscap)\b/i,
    type: 'contractor',
  },
  {
    pattern:
      /\b(dental|dentist|tooth|teeth|orthodont|implant|crown|braces|invisalign|cosmetic\s*dentistry|oral\s*(health|care|surgery))\b/i,
    type: 'dentist',
  },
]

/**
 * Detect business type from crawled pages.
 * @param pages     All crawled pages from the site
 * @param requested The user's selection — if not 'auto', returned as-is
 */
export function detectBusinessType(
  pages: CrawledPage[],
  requested: BusinessType,
): BusinessType {
  if (requested !== 'auto') return requested

  // Build a signal corpus from the highest-value page content
  // Priority: homepage title + H1s, then all titles, then all H1s, then URL paths
  const signals = buildSignalCorpus(pages)

  for (const { pattern, type } of RULES) {
    if (pattern.test(signals)) return type
  }

  return 'other'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSignalCorpus(pages: CrawledPage[]): string {
  const home = pages.find((p) => p.pageType === 'home') ?? pages[0]
  const parts: string[] = []

  // Homepage signals get highest weight (repeated for priority)
  if (home) {
    parts.push(home.title ?? '', ...home.h1s, home.url)
    parts.push(home.title ?? '', ...home.h1s) // doubled weight
  }

  // All page titles and H1s
  for (const page of pages) {
    parts.push(page.title ?? '', ...page.h1s)
    parts.push(page.url) // URL paths contain strong niche signals
  }

  // Shallow body text scan from homepage only (expensive, so limit)
  if (home?.textContent) {
    parts.push(home.textContent.slice(0, 1000))
  }

  return parts.join(' ')
}
