/**
 * Conversion scorer.
 * Weights: 25% of overall — CTAs, phone visibility, lead forms, booking actions.
 *
 * Positive signals rewarded:
 *   - CTAs present on homepage
 *   - Phone on homepage
 *   - Contact form exists
 *   - Booking/quote CTA found
 *   - High CTA coverage across key pages
 */

import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'

const BOOKING_PATTERNS = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i,
]

export interface ConversionScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
}

export function scoreConversion(input: ConversionScorerInput): ScoreOutput {
  const { findings, pages } = input
  const positives: string[] = []

  const home = pages.find((p) => p.pageType === 'home') ?? pages[0]

  // ── Positive signals ──────────────────────────────────────────────────────
  if (home?.ctaTexts && home.ctaTexts.length > 0) {
    positives.push(`[+] Homepage has ${home.ctaTexts.length} call-to-action(s)`)
  }

  if (home?.phones && home.phones.length > 0) {
    positives.push('[+] Phone number present on homepage')
  }

  const pagesWithForm = pages.filter((p) => p.hasForm)
  if (pagesWithForm.length > 0) {
    positives.push(`[+] Contact/lead form found on ${pagesWithForm.length} page(s)`)
  }

  const hasBookingCTA = pages.some((p) =>
    p.ctaTexts.some((cta) => BOOKING_PATTERNS.some((pat) => pat.test(cta))),
  )
  if (hasBookingCTA) {
    positives.push('[+] Booking or quote CTA detected')
  }

  const keyPages = pages.filter((p) =>
    ['home', 'service', 'location', 'contact'].includes(p.pageType),
  )
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0)
    const coverage = Math.round((pagesWithCTA.length / keyPages.length) * 100)
    if (coverage >= 75) {
      positives.push(`[+] ${coverage}% of key pages have CTAs`)
    }
  }

  return makeScore(findings, positives)
}
