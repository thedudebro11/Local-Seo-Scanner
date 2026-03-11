/**
 * Content scorer.
 * Weights: 10% of overall — content depth, service page coverage, location pages.
 *
 * Positive signals rewarded:
 *   - Homepage has strong word count
 *   - Multiple service pages
 *   - Location/service-area pages exist
 *   - Good average word count
 *   - Blog/resource pages exist
 */

import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'

const HOME_WORD_STRONG = 500
const AVG_WORD_GOOD = 300

export interface ContentScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
}

export function scoreContent(input: ContentScorerInput): ScoreOutput {
  const { findings, pages } = input
  const positives: string[] = []

  const home = pages.find((p) => p.pageType === 'home') ?? pages[0]
  const servicePages = pages.filter((p) => p.pageType === 'service')
  const locationPages = pages.filter((p) => p.pageType === 'location')
  const blogPages = pages.filter((p) => p.pageType === 'blog')

  // ── Positive signals ──────────────────────────────────────────────────────
  if (home && (home.wordCount ?? 0) >= HOME_WORD_STRONG) {
    positives.push(`[+] Homepage has strong content depth (${home.wordCount} words)`)
  }

  if (servicePages.length >= 3) {
    positives.push(`[+] ${servicePages.length} dedicated service pages found`)
  } else if (servicePages.length >= 1) {
    positives.push(`[+] ${servicePages.length} service page(s) found`)
  }

  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`)
  }

  if (blogPages.length > 0) {
    positives.push(`[+] Blog or resource content found (${blogPages.length} page(s))`)
  }

  const totalWords = pages.reduce((n, p) => n + (p.wordCount ?? 0), 0)
  const avgWords = pages.length > 0 ? Math.round(totalWords / pages.length) : 0
  if (avgWords >= AVG_WORD_GOOD) {
    positives.push(`[+] Average page content is solid (${avgWords} words/page)`)
  }

  return makeScore(findings, positives)
}
