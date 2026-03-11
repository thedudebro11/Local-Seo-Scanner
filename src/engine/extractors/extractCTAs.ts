/**
 * Extracts conversion-oriented signals: CTA button/link text and form presence.
 * Focused on local business action triggers (calls, bookings, quotes, orders).
 */

import type { CheerioAPI } from 'cheerio'

export interface CTASignals {
  ctaTexts: string[]
  hasForm: boolean
}

// Strong CTA patterns for local service businesses
const CTA_PATTERNS = [
  /call\s*(us|now|today)/i,
  /book\s*(now|online|an?\s*appointment|a\s*table|today)/i,
  /schedule\s*(an?\s*appointment|now|online|today|a\s*(call|consultation))/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate|consultation|inspection)/i,
  /request\s*(a\s*)?(quote|estimate|callback|appointment|consultation)/i,
  /contact\s*us/i,
  /order\s*(now|online|today)/i,
  /reserve\s*(a\s*(table|spot)|now|online)/i,
  /free\s*(estimate|inspection|consultation|quote|assessment)/i,
  /get\s*started/i,
  /claim\s*(your\s*)?(offer|discount|deal)/i,
  /speak\s*(with|to)\s*(an?\s*)?(expert|specialist|agent|us)/i,
  /send\s*(us\s*)?a\s*message/i,
  /directions/i,
]

// Elements that are typically interactive CTA containers
const CTA_SELECTORS = [
  'a[href]',
  'button',
  '[role="button"]',
  'input[type="submit"]',
  'input[type="button"]',
]

export function extractCTAs($: CheerioAPI): CTASignals {
  const ctaTexts = new Set<string>()

  CTA_SELECTORS.forEach((selector) => {
    $(selector).each((_, el) => {
      // For inputs, use value attr; otherwise text content
      const rawText =
        $(el).attr('value') ??
        $(el).attr('aria-label') ??
        $(el).text()

      const text = rawText.trim()
      if (!text || text.length > 80) return

      if (CTA_PATTERNS.some((pattern) => pattern.test(text))) {
        ctaTexts.add(text)
      }
    })
  })

  // ── Form detection ────────────────────────────────────────────────────────
  // A "real" form is one with input fields — not just a search box
  let hasForm = false
  $('form').each((_, formEl) => {
    const inputCount = $(formEl).find('input:not([type="hidden"]):not([type="search"])').length
    const textareaCount = $(formEl).find('textarea').length
    if (inputCount > 1 || textareaCount > 0) {
      hasForm = true
    }
  })

  return {
    ctaTexts: [...ctaTexts].slice(0, 20),
    hasForm,
  }
}
