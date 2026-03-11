/**
 * Low-level HTML fetcher using Playwright.
 * Accepts a shared BrowserContext to avoid per-page browser startup cost.
 * Returns raw HTML, final URL (after redirects), and HTTP status code.
 */

import type { BrowserContext } from 'playwright'
import { createLogger } from '../utils/logger'

const log = createLogger('fetchHtml')

const PAGE_TIMEOUT_MS = 30_000

export interface FetchHtmlResult {
  requestedUrl: string
  finalUrl: string
  statusCode: number
  html: string
}

/**
 * Fetch a single URL using an existing BrowserContext.
 * Creates and closes a Page internally — caller owns the context lifecycle.
 * Returns statusCode 0 and empty html on network/timeout failure.
 */
export async function fetchHtml(
  url: string,
  context: BrowserContext,
): Promise<FetchHtmlResult> {
  const page = await context.newPage()

  try {
    const response = await page.goto(url, {
      timeout: PAGE_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    })

    const statusCode = response?.status() ?? 0
    const finalUrl = page.url()
    const html = await page.content()

    log.info(`Fetched ${url} → ${finalUrl} [${statusCode}]`)

    return { requestedUrl: url, finalUrl, statusCode, html }
  } catch (err) {
    log.warn(`Failed to fetch ${url}: ${(err as Error).message}`)
    return { requestedUrl: url, finalUrl: url, statusCode: 0, html: '' }
  } finally {
    await page.close()
  }
}
