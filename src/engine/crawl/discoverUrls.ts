/**
 * BFS web crawler.
 * Starts from a seed URL, follows internal links up to maxPages.
 * Uses a shared BrowserContext (created once per scan, closed by caller).
 */

import type { Browser } from 'playwright'
import * as cheerio from 'cheerio'
import { fetchHtml, type FetchHtmlResult } from './fetchHtml'
import { normalizeCrawlerUrl, shouldSkipUrl } from './normalizeUrl'
import { isSameDomain } from '../utils/domain'
import { createLogger } from '../utils/logger'

const log = createLogger('discoverUrls')

const CRAWLER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0'

export type CrawlProgressCallback = (fetched: number, queued: number) => void

export interface DiscoverUrlsResult {
  fetchedPages: FetchHtmlResult[]
  internalLinkGraph: Record<string, string[]>
}

/**
 * BFS crawl starting from startUrl.
 * @param startUrl     - Normalized starting URL
 * @param browser      - Playwright Browser instance (owned by caller)
 * @param maxPages     - Maximum pages to fetch
 * @param domain       - Hostname to restrict crawl to (same-domain only)
 * @param onProgress   - Optional callback fired after each page fetch
 */
export async function discoverUrls(
  startUrl: string,
  browser: Browser,
  maxPages: number,
  domain: string,
  onProgress?: CrawlProgressCallback,
): Promise<DiscoverUrlsResult> {
  const context = await browser.newContext({
    userAgent: CRAWLER_USER_AGENT,
    ignoreHTTPSErrors: true,
    // Disable media/font loading for speed
    extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
  })

  const visited = new Set<string>()
  const queue: string[] = [startUrl]
  const fetchedPages: FetchHtmlResult[] = []
  const internalLinkGraph: Record<string, string[]> = {}

  log.info(`Starting BFS crawl from ${startUrl} (maxPages=${maxPages}, domain=${domain})`)

  try {
    while (queue.length > 0 && fetchedPages.length < maxPages) {
      const url = queue.shift()!

      if (visited.has(url)) continue
      visited.add(url)

      const result = await fetchHtml(url, context)

      // Skip failed fetches (network error / timeout)
      if (result.statusCode === 0 && result.html === '') {
        log.warn(`Skipping failed fetch: ${url}`)
        continue
      }

      // Skip non-HTML responses (redirect to PDF, etc.)
      if (result.html.trim() && !result.html.trim().startsWith('<')) {
        log.warn(`Skipping non-HTML response: ${url}`)
        continue
      }

      fetchedPages.push(result)
      onProgress?.(fetchedPages.length, fetchedPages.length + queue.length)

      // Only follow links if we still have budget
      if (fetchedPages.length < maxPages && result.html) {
        const links = extractInternalLinks(result.html, result.finalUrl, domain)
        internalLinkGraph[result.finalUrl] = links

        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link)
          }
        }
      }
    }
  } finally {
    await context.close()
  }

  log.info(
    `Crawl complete: ${fetchedPages.length} pages fetched, ${Object.keys(internalLinkGraph).length} nodes in link graph`,
  )

  return { fetchedPages, internalLinkGraph }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractInternalLinks(html: string, baseUrl: string, domain: string): string[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const links: string[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const normalized = normalizeCrawlerUrl(href, baseUrl)
    if (!normalized) return
    if (!isSameDomain(normalized, `https://${domain}`)) return
    if (shouldSkipUrl(normalized)) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    links.push(normalized)
  })

  return links
}
