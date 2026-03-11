/**
 * Conversion analyzer.
 * Checks whether the site gives visitors clear pathways to take action:
 * call, book, quote, contact. Focused on local business revenue leaks.
 */

import type { AnalyzerOutput, CrawledPage, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage, pagesByType, importantPages } from './types'

// Minimum ratio of pages that should have at least one CTA
const MIN_CTA_COVERAGE = 0.5

// Booking/quote action keywords — the highest-value CTA types
const BOOKING_PATTERNS = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i,
]

export function analyzeConversion(input: AnalyzerInput): AnalyzerOutput {
  const { pages } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)
  const keyPages = importantPages(pages)
  const contactPages = pagesByType(pages, 'contact')

  // ── 1. No CTAs on homepage ────────────────────────────────────────────────
  if (home && home.ctaTexts.length === 0) {
    findings.push({
      id: 'conversion-no-cta-homepage',
      category: 'conversion',
      severity: 'high',
      title: 'Homepage has no clear call-to-action',
      summary: 'No CTA buttons or action links were detected on the homepage.',
      whyItMatters:
        'The homepage is most visitors\' first impression. Without a clear CTA (Call Now, Get a Quote, Book Online), most visitors leave without taking action — turning traffic into wasted potential.',
      recommendation:
        'Add at least two prominent CTAs to the homepage: one above the fold (e.g., "Call Now") and one mid-page (e.g., "Get a Free Estimate"). Make them visually distinct — colored buttons, not just text links.',
    })
  }

  // ── 2. Phone not on homepage ──────────────────────────────────────────────
  if (home && home.phones.length === 0) {
    findings.push({
      id: 'conversion-no-phone-homepage',
      category: 'conversion',
      severity: 'high',
      title: 'Phone number missing from homepage',
      summary: 'No phone number is visible on the homepage.',
      whyItMatters:
        'For local service businesses, the phone call is often the highest-value conversion. Hiding the phone number costs you direct leads — especially from mobile visitors who want to call immediately.',
      recommendation:
        'Place the phone number in the site header (visible on all pages) and prominently on the homepage. Use a tap-to-call link for mobile: `<a href="tel:+1XXXXXXXXXX">`. Make it large and visible without scrolling.',
    })
  }

  // ── 3. No contact form anywhere ───────────────────────────────────────────
  const pagesWithForm = pages.filter((p) => p.hasForm)
  if (pagesWithForm.length === 0) {
    findings.push({
      id: 'conversion-no-form',
      category: 'conversion',
      severity: 'medium',
      title: 'No contact form found on the site',
      summary: 'No lead capture form was detected on any page.',
      whyItMatters:
        'Not every visitor is ready to call. A contact form captures leads from visitors who prefer to inquire by email, who are outside business hours, or who want to provide details before calling.',
      recommendation:
        'Add a contact/inquiry form to the contact page and ideally the homepage. Keep it short: name, phone, service needed, preferred callback time.',
    })
  } else if (contactPages.length > 0 && contactPages.every((p) => !p.hasForm)) {
    findings.push({
      id: 'conversion-no-form-contact-page',
      category: 'conversion',
      severity: 'medium',
      title: 'Contact page has no form',
      summary: 'The contact page exists but has no lead capture form.',
      whyItMatters:
        'A visitor on the contact page is high-intent. Without a form, their only option is to call — which many won\'t do if they\'re browsing after hours or prefer written communication.',
      recommendation:
        'Add a simple inquiry form to the contact page. At minimum: name, phone or email, message.',
      affectedUrls: contactPages.map((p) => p.url),
    })
  }

  // ── 4. Too few CTA opportunities across key pages ─────────────────────────
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0)
    const ctaCoverage = pagesWithCTA.length / keyPages.length

    if (ctaCoverage < MIN_CTA_COVERAGE) {
      const missing = keyPages.filter((p) => p.ctaTexts.length === 0)
      findings.push({
        id: 'conversion-low-cta-coverage',
        category: 'conversion',
        severity: 'medium',
        title: `Only ${Math.round(ctaCoverage * 100)}% of key pages have CTAs`,
        summary: `${missing.length} of ${keyPages.length} important pages have no detectable call-to-action.`,
        whyItMatters:
          'Every page a visitor lands on is a conversion opportunity. Service pages, location pages, and about pages should all push visitors toward contacting you.',
        recommendation:
          'Add a CTA section to every key page — at minimum a "Call us" button and a brief lead form. Think of every page as a landing page.',
        affectedUrls: missing.map((p) => p.url),
      })
    }
  }

  // ── 5. No booking or quote action anywhere ────────────────────────────────
  const hasBookingCTA = pages.some((p) =>
    p.ctaTexts.some((cta) => BOOKING_PATTERNS.some((pat) => pat.test(cta))),
  )

  if (!hasBookingCTA && pages.length >= 3) {
    findings.push({
      id: 'conversion-no-booking-cta',
      category: 'conversion',
      severity: 'medium',
      title: 'No booking or quote CTA found',
      summary: 'No "Get a Quote", "Book Now", or "Schedule" action was detected anywhere on the site.',
      whyItMatters:
        'For most local service businesses, the quote or booking request is the primary micro-conversion. Without prompting visitors to take this step, you leave revenue on the table.',
      recommendation:
        'Add a clear "Get a Free Estimate" or "Request a Quote" button to the homepage and service pages. Link it to a short form or booking tool.',
    })
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const totalCTAs = pages.reduce((n, p) => n + p.ctaTexts.length, 0)
  notes.push(
    `Homepage CTAs: ${home?.ctaTexts.length ?? 0}`,
    `Total CTAs site-wide: ${totalCTAs} | Pages with forms: ${pagesWithForm.length}`,
    `Booking CTA present: ${hasBookingCTA ? 'yes' : 'no'}`,
  )

  return { findings, notes }
}
