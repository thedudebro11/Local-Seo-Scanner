/**
 * Technical SEO scorer.
 * Weights: 25% of the overall score.
 *
 * Positive signals rewarded:
 *   - robots.txt present
 *   - sitemap present
 *   - all key pages have titles + descriptions
 *   - strong image alt coverage
 */

import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'

export interface TechnicalScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
  robotsFound: boolean
  sitemapFound: boolean
}

export function scoreTechnical(input: TechnicalScorerInput): ScoreOutput {
  const { findings, pages, robotsFound, sitemapFound } = input
  const positives: string[] = []

  // ── Positive signals ──────────────────────────────────────────────────────
  if (robotsFound) {
    positives.push('[+] robots.txt is present')
  }
  if (sitemapFound) {
    positives.push('[+] XML sitemap found')
  }

  const keyPages = pages.filter((p) =>
    ['home', 'contact', 'service', 'location'].includes(p.pageType),
  )

  const allHaveTitles = keyPages.every((p) => p.title && p.title.trim().length > 0)
  if (allHaveTitles && keyPages.length > 0) {
    positives.push('[+] All key pages have title tags')
  }

  const allHaveDesc = keyPages.every(
    (p) => p.metaDescription && p.metaDescription.trim().length > 0,
  )
  if (allHaveDesc && keyPages.length > 0) {
    positives.push('[+] All key pages have meta descriptions')
  }

  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0)
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0)
  if (totalImages > 0 && missingAlt / totalImages <= 0.1) {
    positives.push('[+] Strong image alt text coverage (>90%)')
  }

  const nobroken = pages.every((p) => p.statusCode < 400 || p.statusCode === 0)
  if (nobroken && pages.length > 0) {
    positives.push('[+] No broken pages found')
  }

  return makeScore(findings, positives)
}
