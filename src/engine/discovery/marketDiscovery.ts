/**
 * Market discovery orchestrator — Phase 14.
 *
 * Performs a DuckDuckGo Lite search for "{industry} {location}", parses the
 * HTML results to extract business names and website URLs, applies domain
 * normalization + blocklist filtering, saves the raw result for debugging,
 * and returns a MarketDiscoveryResult ready for the candidate review UI.
 *
 * No API key required. Uses the public DuckDuckGo Lite HTML endpoint.
 * Never throws — returns an empty result on any network/parse failure.
 */

import https from 'https'
import * as cheerio from 'cheerio/slim'
import fs from 'fs-extra'
import { normalizeToDomain } from './normalizeDomain'
import { filterCandidates } from './filterCandidates'
import { getDiscoveryDir, getDiscoveryPath } from '../storage/pathResolver'
import { createLogger } from '../utils/logger'
import type { MarketDiscoveryRequest, MarketDiscoveryResult, DiscoveredBusiness } from './discoveryTypes'

const log = createLogger('marketDiscovery')

const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/'
const BING_SEARCH_URL = 'https://www.bing.com/search'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0'

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runMarketDiscovery(
  request: MarketDiscoveryRequest,
): Promise<MarketDiscoveryResult> {
  const discoveryId = `discovery_${Date.now()}`
  const discoveredAt = new Date().toISOString()
  const query = `${request.industry} ${request.location}`

  log.info(`Market discovery starting: "${query}"`)

  // Try DDG Lite first
  let raw: DiscoveredBusiness[] = []
  let searchSource: MarketDiscoveryResult['searchSource'] = 'none'
  let searchWarning: string | undefined

  try {
    const html = await fetchDdgLite(query)
    raw = parseDdgResults(html, request.maxResults, 'duckduckgo')
    if (raw.length > 0) {
      searchSource = 'ddg-lite'
      log.info(`Parsed ${raw.length} raw results from DuckDuckGo Lite`)
    } else {
      log.warn('DDG Lite returned 0 results — trying Bing fallback')
    }
  } catch (err) {
    log.warn(`DDG Lite failed: ${(err as Error).message} — trying Bing fallback`)
  }

  // Bing fallback if DDG returned nothing
  if (raw.length === 0) {
    try {
      const html = await fetchBing(query)
      raw = parseBingResults(html, request.maxResults)
      if (raw.length > 0) {
        searchSource = 'bing'
        searchWarning = 'DuckDuckGo returned no results — results sourced from Bing.'
        log.info(`Parsed ${raw.length} raw results from Bing fallback`)
      } else {
        searchSource = 'none'
        searchWarning = 'Both DuckDuckGo and Bing returned no results. Check your query or try again later.'
        log.warn('Both DDG and Bing returned 0 results')
      }
    } catch (err) {
      searchSource = 'none'
      searchWarning = `Search unavailable: ${(err as Error).message}`
      log.warn(`Bing fallback also failed: ${(err as Error).message}`)
    }
  }

  const { scannable, excluded, validDomains } = filterCandidates(raw)
  const discovered = [...scannable, ...excluded]

  const result = buildResult(discoveryId, discoveredAt, request, discovered, validDomains, searchSource, searchWarning)

  await saveDiscoveryResult(result)

  log.info(
    `Discovery complete: ${scannable.length} scannable, ${excluded.length} excluded, ` +
    `source=${searchSource}, discoveryId=${discoveryId}`,
  )

  return result
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function buildResult(
  discoveryId: string,
  discoveredAt: string,
  request: MarketDiscoveryRequest,
  discovered: DiscoveredBusiness[],
  validDomains: string[],
  searchSource?: MarketDiscoveryResult['searchSource'],
  searchWarning?: string,
): MarketDiscoveryResult {
  return { discoveryId, request, discoveredAt, discovered, validDomains, searchSource, searchWarning }
}

/**
 * Fetch DuckDuckGo Lite HTML via Node.js https module.
 * Uses POST to avoid URL length limits and bot detection.
 */
function fetchDdgLite(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = `q=${encodeURIComponent(query)}&kl=us-en`
    const options = {
      hostname: 'lite.duckduckgo.com',
      path: '/lite/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': DDG_LITE_URL,
      },
    }

    const req = https.request(options, (res) => {
      // Follow a single redirect if needed
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchDdgLiteGet(res.headers.location).then(resolve).catch(reject)
        return
      }

      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (!data.trim()) {
          reject(new Error(`DDG Lite returned empty response (status ${res.statusCode})`))
        } else {
          resolve(data)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(15_000, () => {
      req.destroy(new Error('DDG Lite request timed out after 15s'))
    })
    req.write(body)
    req.end()
  })
}

function fetchDdgLiteGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => req.destroy(new Error('DDG Lite GET timed out')))
    req.end()
  })
}

/**
 * Fetch Bing search HTML (GET).
 */
function fetchBing(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const path = `/search?q=${encodeURIComponent(query)}&count=20`
    const options = {
      hostname: 'www.bing.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BING_SEARCH_URL,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (!data.trim()) reject(new Error(`Bing returned empty response (status ${res.statusCode})`))
        else resolve(data)
      })
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => req.destroy(new Error('Bing request timed out after 15s')))
    req.end()
  })
}

/**
 * Parse DuckDuckGo Lite HTML — tries multiple selector strategies in order.
 *
 * DDG Lite structure (current):
 *   <td class="result-link"><a href="https://goettl.com/">Goettl Air Conditioning</a></td>
 */
function parseDdgResults(html: string, maxResults: number, source: string): DiscoveredBusiness[] {
  const $ = cheerio.load(html)
  const results: DiscoveredBusiness[] = []

  const addResult = (title: string, href: string): void => {
    if (results.length >= maxResults) return
    if (!title || !href) return
    if (href.startsWith('/') || href.includes('duckduckgo.com')) return
    const domain = normalizeToDomain(href)
    results.push({
      name: title,
      domain: domain ?? undefined,
      sourceUrl: href,
      source,
      rankingPosition: results.length + 1,
      hasWebsite: domain !== null,
    })
  }

  // Strategy 1: td.result-link > a (classic DDG Lite)
  $('td.result-link a').each((_, el) => addResult($(el).text().trim(), $(el).attr('href') ?? ''))

  // Strategy 2: .result__a links (DDG modern)
  if (results.length === 0) {
    $('a.result__a, .result__a').each((_, el) => addResult($(el).text().trim(), $(el).attr('href') ?? ''))
  }

  // Strategy 3: any table anchor pointing to an external http URL
  if (results.length === 0) {
    $('table a[href^="http"]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (!href.includes('duckduckgo.com')) addResult($(el).text().trim(), href)
    })
  }

  return results
}

/**
 * Parse Bing search HTML.
 * Bing structure: <li class="b_algo"><h2><a href="...">Title</a></h2></li>
 */
function parseBingResults(html: string, maxResults: number): DiscoveredBusiness[] {
  const $ = cheerio.load(html)
  const results: DiscoveredBusiness[] = []

  $('li.b_algo h2 a, li.b_algo .b_title a').each((_, el) => {
    if (results.length >= maxResults) return
    const title = $(el).text().trim()
    const href = $(el).attr('href') ?? ''
    if (!title || !href || href.startsWith('/') || href.includes('bing.com')) return
    const domain = normalizeToDomain(href)
    results.push({
      name: title,
      domain: domain ?? undefined,
      sourceUrl: href,
      source: 'bing',
      rankingPosition: results.length + 1,
      hasWebsite: domain !== null,
    })
  })

  return results
}

async function saveDiscoveryResult(result: MarketDiscoveryResult): Promise<void> {
  try {
    const p = getDiscoveryPath(result.discoveryId)
    await fs.ensureDir(getDiscoveryDir())
    await fs.writeJson(p, result, { spaces: 2 })
    log.info(`Discovery result saved: ${p}`)
  } catch (err) {
    log.warn(`Failed to save discovery result: ${(err as Error).message}`)
  }
}
