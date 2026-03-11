/**
 * Lightweight competitor crawler.
 *
 * Reuses the existing BFS crawl infrastructure (discoverUrls) and signal
 * extraction (extractAllSignals + classifyPage) — no duplicated logic.
 *
 * Limits: 5 pages per competitor, no robots.txt fetch (speed), no sitemap fetch.
 * Returns an empty pages array + crawlError string on any failure.
 */

import type { Browser } from 'playwright'
import type { CrawledPage } from '../types/audit'
import { normalizeInputUrl, getDomain } from '../utils/domain'
import { discoverUrls } from '../crawl/discoverUrls'
import { extractAllSignals } from '../extractors'
import { classifyPage } from '../crawl/classifyPage'
import { createLogger } from '../utils/logger'

const log = createLogger('competitorCrawler')

const MAX_COMPETITOR_PAGES = 5

export interface CompetitorCrawlResult {
  pages: CrawledPage[]
  crawlError?: string
}

/**
 * Crawl a single competitor URL and return extracted, classified pages.
 * Never throws — returns { pages: [], crawlError } on any failure.
 */
export async function crawlCompetitor(
  url: string,
  browser: Browser,
): Promise<CompetitorCrawlResult> {
  let normalizedUrl: string

  try {
    normalizedUrl = normalizeInputUrl(url)
  } catch {
    return { pages: [], crawlError: `Invalid URL: ${url}` }
  }

  const domain = getDomain(normalizedUrl)

  try {
    const { fetchedPages } = await discoverUrls(
      normalizedUrl,
      browser,
      MAX_COMPETITOR_PAGES,
      domain,
    )

    if (fetchedPages.length === 0) {
      return { pages: [], crawlError: `No pages fetched from ${domain}` }
    }

    const pages: CrawledPage[] = fetchedPages
      .filter((r) => r.html && r.html.trim().length > 0)
      .map((raw) => {
        const signals = extractAllSignals(raw.html, raw.finalUrl)
        const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s)

        return {
          url: raw.requestedUrl,
          finalUrl: raw.finalUrl,
          statusCode: raw.statusCode,
          pageType,
          title: signals.title,
          metaDescription: signals.metaDescription,
          h1s: signals.h1s,
          h2s: signals.h2s,
          canonical: signals.canonical,
          noindex: signals.noindex,
          phones: signals.phones,
          emails: signals.emails,
          hasAddress: signals.hasAddress,
          hasMap: signals.hasMap,
          hasHours: signals.hasHours,
          hasForm: signals.hasForm,
          ctaTexts: signals.ctaTexts,
          schemaTypes: signals.schemaTypes,
          hasTrustSignals: signals.hasTrustSignals,
          testimonialCount: signals.testimonialCount,
          wordCount: signals.wordCount,
          imageCount: signals.imageCount,
          missingAltCount: signals.missingAltCount,
        } satisfies CrawledPage
      })

    log.info(`Competitor ${domain}: crawled ${pages.length} page(s)`)
    return { pages }
  } catch (err) {
    log.warn(`Competitor crawl failed for ${domain}: ${(err as Error).message}`)
    return { pages: [], crawlError: (err as Error).message }
  }
}
