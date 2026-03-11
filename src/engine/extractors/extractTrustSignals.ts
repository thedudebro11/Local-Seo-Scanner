/**
 * Extracts trust and credibility signals from a page.
 * Looks for testimonials, reviews, licensing, certifications, guarantees,
 * and social proof elements that local businesses use to build buyer confidence.
 */

import type { CheerioAPI } from 'cheerio'

export interface TrustSignals {
  hasTrustSignals: boolean
  testimonialCount: number
}

// CSS class/id patterns that strongly suggest a testimonial or review block
const TESTIMONIAL_SELECTORS = [
  '[class*="testimonial"]',
  '[class*="review"]',
  '[class*="rating"]',
  '[class*="feedback"]',
  '[id*="testimonial"]',
  '[id*="review"]',
  '[itemtype*="Review"]',
  '[itemscope][itemtype*="Review"]',
  'blockquote',
]

// Star rating indicators
const STAR_SELECTORS = [
  '[class*="star"]',
  '[class*="stars"]',
  '[aria-label*="star"]',
  '[aria-label*="rating"]',
]

// Trust keyword phrases — presence of any of these indicates credibility effort
const TRUST_KEYWORDS = [
  /\blicensed\b/i,
  /\binsured\b/i,
  /\bbonded\b/i,
  /\bcertified\b/i,
  /\baccredited\b/i,
  /\bBBB\b/,                        // Better Business Bureau
  /\bA\+\s*rated\b/i,
  /\byears?\s+(of\s+)?(experience|in\s+business|serving)\b/i,
  /\bsince\s+1[89]\d{2}\b/i,        // "since 1987" — established business
  /\bfamily[\s-]owned\b/i,
  /\bsatisfaction\s+guarantee\b/i,
  /\bmoney[\s-]back\b/i,
  /\bwarranty\b/i,
  /\bguarantee\b/i,
  /\b5[\s-]star\b/i,
  /\baward[\s-]winning\b/i,
  /\btop[\s-]rated\b/i,
  /\bhighly\s+recommended\b/i,
]

export function extractTrustSignals($: CheerioAPI): TrustSignals {
  let testimonialCount = 0

  // ── Count testimonial / review containers ─────────────────────────────────
  TESTIMONIAL_SELECTORS.forEach((selector) => {
    try {
      testimonialCount += $(selector).length
    } catch {
      // Ignore malformed selectors
    }
  })

  // Count star rating widgets
  let starCount = 0
  STAR_SELECTORS.forEach((selector) => {
    try {
      starCount += $(selector).length
    } catch {}
  })

  // ── Check for trust keywords in visible text ──────────────────────────────
  const bodyText = $('body').text()
  const hasTrustKeyword = TRUST_KEYWORDS.some((pattern) => pattern.test(bodyText))

  // ── Determine overall hasTrustSignals ─────────────────────────────────────
  const hasTrustSignals =
    testimonialCount > 0 ||
    starCount > 0 ||
    hasTrustKeyword

  return {
    hasTrustSignals,
    // Cap count to avoid inflated numbers from CSS-class-heavy sites
    testimonialCount: Math.min(testimonialCount + starCount, 50),
  }
}
