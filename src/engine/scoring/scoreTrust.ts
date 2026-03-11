/**
 * Trust scorer.
 * Weights: 10% of overall — HTTPS, testimonials, about page, gallery, trust language.
 *
 * Positive signals rewarded:
 *   - HTTPS enabled
 *   - Testimonials or trust signals found
 *   - About/team page present
 *   - Gallery or portfolio page present
 *   - Multiple testimonials
 */

import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'
import { isHttps } from '../utils/domain'

export interface TrustScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
  domain: string
}

export function scoreTrust(input: TrustScorerInput): ScoreOutput {
  const { findings, pages, domain } = input
  const positives: string[] = []

  const home = pages.find((p) => p.pageType === 'home') ?? pages[0]
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`

  // ── Positive signals ──────────────────────────────────────────────────────
  if (isHttps(homeUrl)) {
    positives.push('[+] Site is served over HTTPS')
  }

  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0)
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals)

  if (totalTestimonials >= 3) {
    positives.push(`[+] ${totalTestimonials} testimonials or reviews found`)
  } else if (totalTestimonials > 0) {
    positives.push(`[+] ${totalTestimonials} testimonial(s) found`)
  } else if (hasTrustOnAnyPage) {
    positives.push('[+] Trust signals found (licensing, guarantees, or certifications)')
  }

  const aboutPages = pages.filter((p) => p.pageType === 'about')
  if (aboutPages.length > 0) {
    positives.push('[+] About or team page present')
  }

  const galleryPages = pages.filter((p) => p.pageType === 'gallery')
  if (galleryPages.length > 0) {
    positives.push('[+] Gallery or portfolio page present')
  }

  if (home?.hasTrustSignals) {
    positives.push('[+] Homepage displays trust signals')
  }

  return makeScore(findings, positives)
}
