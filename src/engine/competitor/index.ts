/**
 * Competitor analysis orchestrator.
 *
 * Accepts up to 3 competitor URLs, crawls each one (≤5 pages) using the
 * existing Playwright browser, extracts comparable signals, and runs gap
 * analysis against the client site.
 *
 * All per-competitor failures are isolated via Promise.allSettled — the
 * whole step is additionally wrapped in a try/catch in runAudit.ts.
 *
 * If competitorUrls is empty, the caller should skip this step entirely
 * rather than calling this function.
 */

import type { Browser } from 'playwright'
import type { CrawledPage } from '../types/audit'
import type { CompetitorAnalysisResult } from './competitorTypes'
import { crawlCompetitor } from './competitorCrawler'
import { analyzeCompetitor } from './competitorAnalyzer'
import { analyzeGaps } from './gapAnalysis'
import { normalizeInputUrl } from '../utils/domain'
import { createLogger } from '../utils/logger'

const log = createLogger('competitorAnalysis')

const MAX_COMPETITORS = 3

export async function runCompetitorAnalysis(
  browser: Browser,
  clientUrl: string,
  clientPages: CrawledPage[],
  competitorUrls: string[],
): Promise<CompetitorAnalysisResult> {
  // Deduplicate and cap at 3
  const urls = [...new Set(competitorUrls)].slice(0, MAX_COMPETITORS)
  log.info(`Starting competitor analysis: ${urls.length} competitor(s)`)

  // Crawl all competitors in parallel; failures are captured, not propagated
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const { pages, crawlError } = await crawlCompetitor(url, browser)
      let normalizedUrl = url
      try { normalizedUrl = normalizeInputUrl(url) } catch { /* keep original */ }
      return analyzeCompetitor(normalizedUrl, pages, crawlError)
    }),
  )

  const competitors = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
    log.warn(`Competitor ${urls[i]} failed: ${reason}`)
    return analyzeCompetitor(urls[i], [], reason)
  })

  const gaps = analyzeGaps(clientUrl, clientPages, competitors)

  log.info(
    `Competitor analysis complete: ${competitors.length} site(s) analyzed, ` +
    `${competitors.filter((c) => c.pageCount > 0).length} successful, ${gaps.length} gap(s) found`,
  )

  return {
    analyzedAt: new Date().toISOString(),
    competitors,
    gaps,
  }
}
