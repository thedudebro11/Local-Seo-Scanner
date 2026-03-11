/**
 * Content analyzer.
 * Checks for thin pages, missing service coverage, location page gaps,
 * and overall content depth that affects rankings and user trust.
 */

import type { AnalyzerOutput, CrawledPage, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage, pagesByType } from './types'

const HOME_WORD_MIN = 300
const SERVICE_WORD_MIN = 200
const THIN_PAGE_WORD_MIN = 150

export function analyzeContent(input: AnalyzerInput): AnalyzerOutput {
  const { pages } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)
  const servicePages = pagesByType(pages, 'service')
  const locationPages = pagesByType(pages, 'location')
  const blogPages = pagesByType(pages, 'blog')

  // ── 1. Thin homepage ──────────────────────────────────────────────────────
  if (home) {
    const homeWords = home.wordCount ?? 0
    if (homeWords < HOME_WORD_MIN && homeWords > 0) {
      findings.push({
        id: 'content-thin-homepage',
        category: 'content',
        severity: 'medium',
        title: `Homepage content is thin (${homeWords} words)`,
        summary: `The homepage has only ${homeWords} words — below the recommended minimum of ${HOME_WORD_MIN}.`,
        whyItMatters:
          'Google uses content volume and depth to gauge topical relevance. A thin homepage signals low investment and limits your ability to rank for competitive local keywords.',
        recommendation:
          `Expand the homepage to at least ${HOME_WORD_MIN} words. Add sections covering: what you do, why choose you, service areas, testimonials, and a clear CTA. Quality matters more than quantity — every sentence should serve the visitor.`,
        affectedUrls: [home.url],
      })
    }
  }

  // ── 2. No service pages ───────────────────────────────────────────────────
  if (servicePages.length === 0 && pages.length >= 4) {
    findings.push({
      id: 'content-no-service-pages',
      category: 'content',
      severity: 'high',
      title: 'No dedicated service pages found',
      summary: 'The site appears to have no pages dedicated to individual services.',
      whyItMatters:
        'A single "Services" page can\'t rank for every specific service. Individual service pages (e.g., "/roof-replacement/", "/gutter-cleaning/") each have a chance to rank for their own keyword and capture a different segment of searchers.',
      recommendation:
        'Create one page per core service. Each page should: target a specific keyword, mention the service area, include a CTA, and have at least 300 words of genuine content.',
    })
  } else if (servicePages.length === 1 && pages.length >= 6) {
    findings.push({
      id: 'content-too-few-service-pages',
      category: 'content',
      severity: 'medium',
      title: 'Only one service page found',
      summary: 'The site has only one page classifiable as a service page.',
      whyItMatters:
        'Each unique service you offer deserves its own page. A single service page limits your Google footprint and forces all keywords to compete on one URL.',
      recommendation:
        'Create individual pages for each service you offer. Use a clear URL structure: /service-name/ or /service-name-city/.',
      affectedUrls: servicePages.map((p) => p.url),
    })
  }

  // ── 3. Thin service pages ─────────────────────────────────────────────────
  const thinServicePages = servicePages.filter(
    (p) => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < SERVICE_WORD_MIN,
  )
  if (thinServicePages.length > 0) {
    findings.push({
      id: 'content-thin-service-pages',
      category: 'content',
      severity: 'medium',
      title: `${thinServicePages.length} service page${thinServicePages.length > 1 ? 's are' : ' is'} thin on content`,
      summary: `${thinServicePages.length} service page(s) have under ${SERVICE_WORD_MIN} words.`,
      whyItMatters:
        'Thin service pages are hard to rank. Google looks for content depth to confirm the page genuinely covers the topic. Thin pages also fail to build confidence with potential customers.',
      recommendation:
        `Expand each service page to at least ${SERVICE_WORD_MIN} words. Cover: what the service is, how it works, why choose you, what areas you serve, FAQs, and a strong CTA.`,
      affectedUrls: thinServicePages.map((p) => p.url),
    })
  }

  // ── 4. No location pages ──────────────────────────────────────────────────
  if (locationPages.length === 0 && pages.length >= 5) {
    findings.push({
      id: 'content-no-location-pages',
      category: 'content',
      severity: 'medium',
      title: 'No location or service-area pages found',
      summary: 'No pages targeting specific cities or service areas were detected.',
      whyItMatters:
        '"Plumber near me" and "[service] in [city]" are among the most valuable search queries for local businesses. Without location pages, you can\'t rank for these unless your domain authority is very high.',
      recommendation:
        'Create city/area pages for every location you serve. URL format: /[service]-[city]-[state]/. Each must have unique, helpful content — not just the same text with the city name swapped.',
    })
  }

  // ── 5. Globally thin pages ────────────────────────────────────────────────
  const allThinPages = pages.filter(
    (p) =>
      (p.wordCount ?? 0) > 0 &&
      (p.wordCount ?? 0) < THIN_PAGE_WORD_MIN &&
      !['gallery', 'blog', 'other'].includes(p.pageType),
  )
  if (allThinPages.length > pages.length * 0.4 && allThinPages.length >= 3) {
    findings.push({
      id: 'content-widespread-thin-pages',
      category: 'content',
      severity: 'medium',
      title: `${allThinPages.length} pages have very thin content (under ${THIN_PAGE_WORD_MIN} words)`,
      summary: `More than 40% of scanned pages have under ${THIN_PAGE_WORD_MIN} words.`,
      whyItMatters:
        'A pattern of thin pages across a site can trigger a "thin content" quality signal in Google\'s algorithms, reducing the rankings of all pages — including well-written ones.',
      recommendation:
        'Audit all thin pages. Either expand their content meaningfully, consolidate similar thin pages into one comprehensive page, or add a noindex tag to pages that genuinely have no ranking value (e.g., login pages).',
      affectedUrls: allThinPages.map((p) => p.url),
    })
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const avgWords =
    pages.length > 0
      ? Math.round(pages.reduce((n, p) => n + (p.wordCount ?? 0), 0) / pages.length)
      : 0

  notes.push(
    `Service pages: ${servicePages.length} | Location pages: ${locationPages.length} | Blog pages: ${blogPages.length}`,
    `Average word count: ${avgWords} | Thin pages (<${THIN_PAGE_WORD_MIN}w): ${allThinPages.length}`,
    `Homepage words: ${home?.wordCount ?? 'N/A'}`,
  )

  return { findings, notes }
}
