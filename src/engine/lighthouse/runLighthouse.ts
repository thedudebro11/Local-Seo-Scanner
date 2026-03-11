/**
 * Lighthouse runner.
 * Launches Chrome via chrome-launcher, runs a Lighthouse audit on the given URL,
 * and returns structured performance/SEO/accessibility metrics.
 *
 * Both lighthouse and chrome-launcher are ESM-only — loaded via dynamic import.
 * Uses system Chrome if available; falls back to Playwright's bundled Chromium.
 *
 * Returns null on any failure — callers treat Lighthouse as a best-effort step.
 */

import type { LaunchedChrome } from 'chrome-launcher'
import type { LighthouseMetrics } from '../types/audit'
import { createLogger } from '../utils/logger'

const log = createLogger('lighthouse')

const CHROME_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
]

/**
 * Run a Lighthouse audit on `url`.
 * @param url - Fully-qualified URL to audit (homepage recommended).
 * @param fallbackChromiumPath - Playwright's Chromium path, used if system Chrome is not found.
 */
export async function runLighthouse(
  url: string,
  fallbackChromiumPath?: string,
): Promise<LighthouseMetrics | null> {
  // Dynamic imports — both packages are ESM-only
  const { launch } = await import('chrome-launcher') as typeof import('chrome-launcher')
  const { default: lighthouse } = await import('lighthouse') as { default: Function }

  let chrome: LaunchedChrome | null = null

  try {
    // Try auto-detecting system Chrome first; fall back to Playwright's Chromium
    try {
      chrome = await launch({ chromeFlags: CHROME_FLAGS, logLevel: 'silent' })
    } catch {
      if (!fallbackChromiumPath) {
        log.warn('System Chrome not found and no fallback path provided — skipping Lighthouse')
        return null
      }
      log.info(`System Chrome not found, using Playwright Chromium: ${fallbackChromiumPath}`)
      chrome = await launch({
        chromePath: fallbackChromiumPath,
        chromeFlags: CHROME_FLAGS,
        logLevel: 'silent',
      })
    }

    // At this point chrome is always set: every non-null path above either assigned
    // it or returned/threw. The explicit guard satisfies the type checker.
    if (!chrome) return null

    log.info(`Chrome launched on port ${chrome.port}, running Lighthouse on ${url}`)

    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'silent',
      onlyCategories: ['performance', 'seo', 'accessibility'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false,
      },
    })

    if (!runnerResult?.lhr) {
      log.warn('Lighthouse returned no result')
      return null
    }

    const { lhr } = runnerResult

    const score = (cat: string): number =>
      Math.round((lhr.categories[cat]?.score ?? 0) * 100)

    const audit = (key: string): number | undefined => {
      const val = lhr.audits?.[key]?.numericValue
      return typeof val === 'number' ? Math.round(val) : undefined
    }

    const metrics: LighthouseMetrics = {
      url,
      performanceScore: score('performance'),
      seoScore: score('seo'),
      accessibilityScore: score('accessibility'),
      firstContentfulPaint: audit('first-contentful-paint'),
      largestContentfulPaint: audit('largest-contentful-paint'),
      totalBlockingTime: audit('total-blocking-time'),
      cumulativeLayoutShift: lhr.audits?.['cumulative-layout-shift']?.numericValue,
      speedIndex: audit('speed-index'),
    }

    log.info(
      `Lighthouse complete: perf=${metrics.performanceScore} seo=${metrics.seoScore} a11y=${metrics.accessibilityScore}`,
    )
    return metrics
  } catch (err) {
    log.warn(`Lighthouse run failed: ${(err as Error).message}`)
    return null
  } finally {
    if (chrome) {
      try { chrome.kill() } catch { /* ignore */ }
    }
  }
}
