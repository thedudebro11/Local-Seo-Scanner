/**
 * Sitemap discovery and URL extraction.
 * Checks common sitemap paths and any URLs found in robots.txt.
 * Parses both regular sitemaps and sitemap index files.
 * Uses Cheerio in XML mode for parsing.
 */

import * as cheerio from 'cheerio/slim'
import { createLogger } from '../utils/logger'

const log = createLogger('sitemap')

const FETCH_TIMEOUT_MS = 10_000

// Common sitemap paths to try if robots.txt has no Sitemap: directive
const CANDIDATE_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap.php',
  '/wp-sitemap.xml',
  '/sitemap-index.xml',
]

export interface SitemapResult {
  found: boolean
  /** All page URLs extracted from the sitemap(s) */
  urls: string[]
  /** The URL where the sitemap was actually found */
  sitemapUrl?: string
}

/**
 * Discover and parse a sitemap for the given site.
 * Prefers Sitemap: declarations from robots.txt, then falls back to common paths.
 */
export async function fetchSitemap(
  siteUrl: string,
  robotsSitemapUrls: string[] = [],
): Promise<SitemapResult> {
  let base: string
  try {
    const parsed = new URL(siteUrl)
    base = `${parsed.protocol}//${parsed.host}`
  } catch {
    return { found: false, urls: [] }
  }

  const candidates = [
    ...robotsSitemapUrls,
    ...CANDIDATE_PATHS.map((p) => `${base}${p}`),
  ]

  for (const url of candidates) {
    try {
      const result = await trySitemap(url)
      if (result.found) return result
    } catch {
      // try next candidate
    }
  }

  log.info('No sitemap found')
  return { found: false, urls: [] }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function trySitemap(sitemapUrl: string): Promise<SitemapResult> {
  const response = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'LocalSEOScanner/1.0' },
  })

  if (!response.ok) return { found: false, urls: [] }

  const text = await response.text()
  if (!text.trim().startsWith('<')) return { found: false, urls: [] }

  const urls = parseSitemapXml(text)

  log.info(`Sitemap found at ${sitemapUrl}: ${urls.length} URLs`)
  return { found: true, urls, sitemapUrl }
}

/**
 * Parse a sitemap or sitemap index XML string.
 * Handles both <urlset> (regular) and <sitemapindex> (index) formats.
 * For sitemap indexes, returns the child sitemap URLs (not fetched recursively —
 * the orchestrator can use these as additional hints).
 */
function parseSitemapXml(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const urls: string[] = []

  // Regular sitemap: <urlset><url><loc>…</loc></url></urlset>
  $('urlset url loc, url loc').each((_, el) => {
    const url = $(el).text().trim()
    if (url.startsWith('http')) urls.push(url)
  })

  // Sitemap index: <sitemapindex><sitemap><loc>…</loc></sitemap></sitemapindex>
  if (urls.length === 0) {
    $('sitemapindex sitemap loc, sitemap loc').each((_, el) => {
      const url = $(el).text().trim()
      if (url.startsWith('http')) urls.push(url)
    })
  }

  return [...new Set(urls)]
}
