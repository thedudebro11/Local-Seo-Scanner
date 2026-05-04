/**
 * Low-level HTML fetcher using Playwright.
 * Accepts a shared BrowserContext to avoid per-page browser startup cost.
 * Returns raw HTML, final URL (after redirects), and HTTP status code.
 */

import type { BrowserContext } from 'playwright'
import { createLogger } from '../utils/logger'

const log = createLogger('fetchHtml')

const PAGE_TIMEOUT_MS = 30_000
// Time to wait after 'load' for JS-driven content and bot-protection redirects to settle
const POST_LOAD_DWELL_MS = 1_500
// Extra wait if a challenge/bot-protection page is detected
const CHALLENGE_EXTRA_WAIT_MS = 4_000

// Phrases found in bot-protection interstitial pages (Cloudflare, Sucuri, Imperva, etc.)
const CHALLENGE_PATTERNS = [
  'checking your browser',
  'just a moment',
  'attention required',
  'enable javascript and cookies',
  'cf-browser-verification',
  'ddos-guard',
  'please wait while we verify',
  'bot protection',
  'human verification',
]

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
 *
 * Uses waitUntil:'load' + a post-load dwell so that bot-protection challenge
 * pages (Cloudflare, Sucuri, etc.) have time to redirect to the real content
 * before we capture the HTML.
 */
export async function fetchHtml(
  url: string,
  context: BrowserContext,
): Promise<FetchHtmlResult> {
  const page = await context.newPage()

  try {
    const response = await page.goto(url, {
      timeout: PAGE_TIMEOUT_MS,
      // 'load' waits for the load event — gives JS time to run, unlike 'domcontentloaded'
      waitUntil: 'load',
    })

    const statusCode = response?.status() ?? 0

    // Short dwell to let any post-load JS (challenge redirects, lazy renders) settle
    await page.waitForTimeout(POST_LOAD_DWELL_MS)

    let html = await page.content()

    // Detect bot-protection challenge pages. If found, wait for the redirect and
    // re-capture. Most challenges resolve within 3–5 seconds.
    const lower = html.toLowerCase()
    const isChallenge = CHALLENGE_PATTERNS.some((p) => lower.includes(p))
    if (isChallenge) {
      log.warn(`Challenge page detected at ${url} — waiting for redirect…`)
      await page.waitForTimeout(CHALLENGE_EXTRA_WAIT_MS)
      html = await page.content()
    }

    const finalUrl = page.url()
    log.info(`Fetched ${url} → ${finalUrl} [${statusCode}]${isChallenge ? ' (challenge bypassed)' : ''}`)

    return { requestedUrl: url, finalUrl, statusCode, html }
  } catch (err) {
    log.warn(`Failed to fetch ${url}: ${(err as Error).message}`)
    return { requestedUrl: url, finalUrl: url, statusCode: 0, html: '' }
  } finally {
    await page.close()
  }
}
