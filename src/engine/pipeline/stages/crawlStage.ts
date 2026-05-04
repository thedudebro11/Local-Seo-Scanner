import { fetchRobots } from '../../crawl/robots'
import { fetchSitemap } from '../../crawl/sitemap'
import { discoverUrls } from '../../crawl/discoverUrls'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'

const log = createLogger('crawlStage')

/**
 * Launch the Playwright browser, fetch robots.txt and sitemap, then BFS-crawl
 * up to request.maxPages pages.
 *
 * Required — throws on browser launch failure or crawl errors.
 *
 * Browser lifecycle note:
 *   ctx.browser is set here and intentionally left open so that subsequent
 *   optional stages (visual, competitor) can reuse it.
 *   The orchestrator closes it in its finally block.
 */
export async function crawlStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  const { chromium } = await import('playwright')

  // If the bulk scan pool pre-opened a browser, reuse it; otherwise launch one.
  if (!ctx.browser) {
    emit('Launching browser…', 5)
    ctx.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // Removes the "Chrome is being controlled by automated software" flag
        // that bot-detection services read via navigator.webdriver
        '--disable-blink-features=AutomationControlled',
      ],
    })
  } else {
    emit('Reusing browser…', 5)
  }
  // Always capture the path — needed by impactStage for Lighthouse.
  ctx.chromiumPath = chromium.executablePath()

  // robots.txt
  emit('Loading robots.txt…', 8)
  const robotsResult = await fetchRobots(ctx.normalizedUrl)
  ctx.robotsFound = robotsResult.found
  log.info(`robots.txt: found=${ctx.robotsFound}, sitemaps=${robotsResult.sitemapUrls.length}`)

  // Sitemap
  emit('Loading sitemap…', 12)
  const sitemapResult = await fetchSitemap(ctx.normalizedUrl, robotsResult.sitemapUrls)
  ctx.sitemapFound = sitemapResult.found
  log.info(`sitemap: found=${ctx.sitemapFound}, urls=${sitemapResult.urls.length}`)

  // BFS crawl
  emit('Fetching homepage…', 16)
  const { fetchedPages } = await discoverUrls(
    ctx.normalizedUrl,
    ctx.browser,
    ctx.request.maxPages,
    ctx.domain,
    (fetched, queued) => {
      const ratio = Math.min(fetched / Math.max(ctx.request.maxPages, 1), 1)
      const pct = Math.round(16 + ratio * 49)
      emit(`Crawling pages… (${fetched} fetched, ${queued} queued)`, pct)
    },
  )

  ctx.rawPages = fetchedPages
  log.info(`Crawl complete: ${fetchedPages.length} pages fetched`)
}
