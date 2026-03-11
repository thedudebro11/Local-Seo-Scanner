/**
 * Visual UX analyzer.
 *
 * Opens a small subset of pages (homepage, contact, one service/menu/location)
 * in a fresh Playwright context, captures screenshots, and runs deterministic
 * above-the-fold checks on the homepage.
 *
 * One page visit per target — screenshot and all checks are done together.
 * The existing browser instance is reused; no second browser is launched.
 *
 * Returns visual findings (all category: conversion or trust, severity: medium)
 * and a structured VisualAnalysisResult for the report.
 */

import path from 'path'
import type { Browser } from 'playwright'
import type { CrawledPage, Finding } from '../types/audit'
import type { VisualAnalysisResult, VisualPageAnalysis, VisualPageChecks } from './visualTypes'
import { takeScreenshot } from './captureScreenshots'
import {
  checkAboveFoldCta,
  checkPhoneVisible,
  checkTrustSignals,
  checkHeroClarity,
} from './viewportChecks'
import { createLogger } from '../utils/logger'

const log = createLogger('visualAnalyzer')

const NAVIGATE_TIMEOUT = 15_000

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0'

export interface VisualAnalysisOutput {
  result: VisualAnalysisResult
  findings: Finding[]
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runVisualAnalysis(
  browser: Browser,
  crawledPages: CrawledPage[],
  screenshotDir: string,
): Promise<VisualAnalysisOutput> {
  const pagesAnalyzed: VisualPageAnalysis[] = []
  const findings: Finding[] = []

  // ── Select target pages (small subset only) ───────────────────────────────
  const homepage =
    crawledPages.find((p) => p.pageType === 'home') ?? crawledPages[0]
  const contactPage = crawledPages.find((p) => p.pageType === 'contact')
  const servicePage = crawledPages.find((p) =>
    ['service', 'menu', 'location'].includes(p.pageType),
  )

  const targets: Array<{ crawledPage: CrawledPage; label: string; runChecks: boolean }> = []
  if (homepage) targets.push({ crawledPage: homepage, label: 'homepage', runChecks: true })
  if (contactPage) targets.push({ crawledPage: contactPage, label: 'contact', runChecks: false })
  if (servicePage) targets.push({ crawledPage: servicePage, label: 'service', runChecks: false })

  if (targets.length === 0) {
    log.warn('No pages available for visual analysis')
    return { result: { pagesAnalyzed: [] }, findings: [] }
  }

  // ── Open a fresh browser context (separate from the crawl context) ────────
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: USER_AGENT,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
  })

  try {
    for (const { crawledPage, label, runChecks } of targets) {
      const url = crawledPage.finalUrl

      try {
        const page = await context.newPage()
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATE_TIMEOUT })

          // Screenshot and checks happen in the same page visit
          const screenshotPath = await takeScreenshot(page, screenshotDir, label)
          const screenshotFile = screenshotPath ? path.basename(screenshotPath) : undefined

          let checks: VisualPageChecks

          if (runChecks) {
            // Run all four checks in parallel for the homepage
            const [cta, phone, trust, hero] = await Promise.all([
              checkAboveFoldCta(page),
              checkPhoneVisible(page),
              checkTrustSignals(page),
              checkHeroClarity(page),
            ])
            checks = {
              hasAboveFoldCta: cta,
              hasPhoneVisible: phone,
              hasTrustSignalsVisible: trust,
              hasHeroClarity: hero,
            }
            log.info(
              `Visual checks [${label}]: cta=${cta.passed} phone=${phone.passed} ` +
              `trust=${trust.passed} hero=${hero.passed}`,
            )
          } else {
            // Non-homepage targets: screenshot only, mark checks as skipped
            checks = {
              hasAboveFoldCta: { passed: true, detail: 'Not checked (homepage only)' },
              hasPhoneVisible: { passed: true, detail: 'Not checked (homepage only)' },
              hasTrustSignalsVisible: { passed: true, detail: 'Not checked (homepage only)' },
              hasHeroClarity: { passed: true, detail: 'Not checked (homepage only)' },
            }
          }

          const analysis: VisualPageAnalysis = {
            url,
            pageType: label,
            screenshotPath,
            screenshotFile,
            checks,
          }

          pagesAnalyzed.push(analysis)

          if (runChecks) {
            findings.push(...buildFindings(analysis))
          }
        } finally {
          await page.close()
        }
      } catch (err) {
        log.warn(`Visual analysis failed for ${label} (${url}): ${(err as Error).message}`)
      }
    }
  } finally {
    await context.close()
  }

  log.info(
    `Visual analysis complete: ${pagesAnalyzed.length} page(s) analyzed, ${findings.length} finding(s)`,
  )

  return { result: { pagesAnalyzed }, findings }
}

// ─── Finding builder ──────────────────────────────────────────────────────────

function buildFindings(analysis: VisualPageAnalysis): Finding[] {
  const out: Finding[] = []
  const { checks, url } = analysis

  if (!checks.hasHeroClarity.passed) {
    out.push({
      id: 'visual-no-hero-clarity',
      category: 'conversion',
      severity: 'medium',
      title: 'Hero section does not clearly communicate what the business offers',
      summary:
        checks.hasHeroClarity.detail ??
        'The above-the-fold headline is missing or too vague to tell visitors what to expect.',
      whyItMatters:
        'Visitors decide whether to stay or leave within seconds. A clear H1 headline stating what you do, where you do it, and what to do next dramatically reduces bounce rates from local searches.',
      recommendation:
        'Write an H1 that answers three questions: What do you do? Where do you serve? What should the visitor do? Example: "Expert Roof Repairs in Dallas, TX — Call for a Free Estimate."',
      affectedUrls: [url],
    })
  }

  if (!checks.hasAboveFoldCta.passed) {
    out.push({
      id: 'visual-no-above-fold-cta',
      category: 'conversion',
      severity: 'medium',
      title: 'No clear call-to-action visible above the fold',
      summary:
        checks.hasAboveFoldCta.detail ??
        'No prominent CTA button or link was detected in the first viewport.',
      whyItMatters:
        "Visitors from local search are ready to act immediately. Without a visible CTA above the fold they must scroll or hunt for a way to contact you — most won't.",
      recommendation:
        'Place a high-contrast "Call Now" or "Book Online" button in the hero section, visible without scrolling. On mobile it should be large, tap-friendly, and linked to a tel: number.',
      affectedUrls: [url],
    })
  }

  if (!checks.hasPhoneVisible.passed) {
    out.push({
      id: 'visual-no-phone-above-fold',
      category: 'conversion',
      severity: 'medium',
      title: 'Phone number not visible in the initial viewport',
      summary:
        checks.hasPhoneVisible.detail ??
        'No phone number was detected in the first screenful of the homepage.',
      whyItMatters:
        'Mobile searchers expect to see a phone number immediately. If they have to scroll to find it, many will hit back and call a competitor.',
      recommendation:
        'Add your phone number to the site header so it is always visible. Use a `tel:` link so mobile visitors can tap to call directly.',
      affectedUrls: [url],
    })
  }

  if (!checks.hasTrustSignalsVisible.passed) {
    out.push({
      id: 'visual-no-trust-signals-visible',
      category: 'trust',
      severity: 'medium',
      title: 'No visible trust signals near the top of the homepage',
      summary:
        checks.hasTrustSignalsVisible.detail ??
        'No reviews, ratings, or credibility indicators were detected near the top of the page.',
      whyItMatters:
        'Trust signals (star ratings, review counts, "Licensed & Insured") reduce hesitation for first-time visitors. Their absence makes the site feel less credible than competitors who display them prominently.',
      recommendation:
        'Add a trust bar below the hero section: number of Google reviews + star rating, years in business, license/insurance status, and any industry certifications.',
      affectedUrls: [url],
    })
  }

  return out
}
