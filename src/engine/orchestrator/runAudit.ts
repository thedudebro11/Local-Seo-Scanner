/**
 * Main audit orchestrator entry point.
 * Called by the Electron IPC scan handler.
 *
 * Phase 3: Real crawler (Playwright BFS + robots + sitemap + classifyPage).
 * Phase 4: All extractors (extractAllSignals).
 * Phase 5: All analyzers + businessTypeDetector → real findings.
 * Phase 6+: Scoring and report generation wired here.
 */

import type { AuditRequest, AuditResult, AuditScores, CrawledPage } from '../types/audit'
import { normalizeInputUrl, getDomain } from '../utils/domain'
import { generateScanId } from '../storage/pathResolver'
import { createLogger } from '../utils/logger'
import { fetchRobots } from '../crawl/robots'
import { fetchSitemap } from '../crawl/sitemap'
import { discoverUrls } from '../crawl/discoverUrls'
import { classifyPage } from '../crawl/classifyPage'
import { extractAllSignals } from '../extractors'
import { detectBusinessType } from '../analyzers/businessTypeDetector'
import { analyzeTechnical } from '../analyzers/technicalAnalyzer'
import { analyzeLocalSeo } from '../analyzers/localSeoAnalyzer'
import { analyzeConversion } from '../analyzers/conversionAnalyzer'
import { analyzeContent } from '../analyzers/contentAnalyzer'
import { analyzeTrust } from '../analyzers/trustAnalyzer'
import type { AnalyzerInput } from '../analyzers/types'
import { scoreTechnical } from '../scoring/scoreTechnical'
import { scoreLocalSeo } from '../scoring/scoreLocalSeo'
import { scoreConversion } from '../scoring/scoreConversion'
import { scoreContent } from '../scoring/scoreContent'
import { scoreTrust } from '../scoring/scoreTrust'
import { computeWeightedScore } from '../scoring/weightedFinalScore'
import { prioritizeFindings, buildQuickWins, buildMoneyLeaks } from '../scoring/prioritizeFindings'

const log = createLogger('runAudit')

export type ProgressEmitter = (step: string, percent: number, message?: string) => void

/**
 * Run a full audit for the given request.
 * The emitProgress callback pushes ScanProgressEvents to the renderer via IPC.
 */
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult> {
  log.info(`Starting audit for ${request.url}`)

  // ── 1. Validate + normalize URL ──────────────────────────────────────────
  emitProgress('Validating URL…', 2)

  let normalizedUrl: string
  try {
    normalizedUrl = normalizeInputUrl(request.url)
  } catch {
    throw new Error(`Invalid URL: ${request.url}`)
  }

  const domain = getDomain(normalizedUrl)
  const scanId = generateScanId(domain)
  log.info(`Normalized: ${normalizedUrl} | domain: ${domain} | id: ${scanId}`)

  // ── 2. Launch Playwright browser ─────────────────────────────────────────
  emitProgress('Launching browser…', 5)

  // Dynamic import keeps playwright out of the renderer bundle
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let crawledPages: CrawledPage[] = []
  let robotsFound = false
  let sitemapFound = false
  let allFindings: AuditResult['findings'] = []
  let scores: AuditScores = buildPlaceholderScores()
  // Narrowed to non-auto; detectBusinessType() is guaranteed never to return 'auto'
  let detectedBusinessType = (
    request.businessType !== 'auto' ? request.businessType : 'other'
  ) as Exclude<typeof request.businessType, 'auto'>

  try {
    // ── 3. Robots.txt ─────────────────────────────────────────────────────
    emitProgress('Loading robots.txt…', 8)
    const robotsResult = await fetchRobots(normalizedUrl)
    robotsFound = robotsResult.found
    log.info(`robots.txt: found=${robotsFound}, sitemaps=${robotsResult.sitemapUrls.length}`)

    // ── 4. Sitemap ────────────────────────────────────────────────────────
    emitProgress('Loading sitemap…', 12)
    const sitemapResult = await fetchSitemap(normalizedUrl, robotsResult.sitemapUrls)
    sitemapFound = sitemapResult.found
    log.info(`sitemap: found=${sitemapFound}, urls=${sitemapResult.urls.length}`)

    // ── 5. BFS Crawl ──────────────────────────────────────────────────────
    emitProgress('Fetching homepage…', 16)

    const { fetchedPages } = await discoverUrls(
      normalizedUrl,
      browser,
      request.maxPages,
      domain,
      (fetched, queued) => {
        // Map crawl progress to 16–65% range
        const ratio = Math.min(fetched / Math.max(request.maxPages, 1), 1)
        const pct = Math.round(16 + ratio * 49)
        emitProgress(`Crawling pages… (${fetched} fetched, ${queued} queued)`, pct)
      },
    )

    log.info(`Crawl complete: ${fetchedPages.length} pages fetched`)

    // ── 6. Extract all signals + classify each page ───────────────────────
    emitProgress('Extracting signals…', 66)

    crawledPages = fetchedPages.map((raw) => {
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
        html: raw.html,
        textContent: signals.textContent,
        wordCount: signals.wordCount,
        imageCount: signals.imageCount,
        missingAltCount: signals.missingAltCount,
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
      } satisfies CrawledPage
    })

    log.info(`Extraction complete: ${crawledPages.length} pages enriched`)

    // ── 7. Detect business type ───────────────────────────────────────────
    emitProgress('Detecting business type…', 72)
    detectedBusinessType = detectBusinessType(crawledPages, request.businessType) as typeof detectedBusinessType
    log.info(`Detected business type: ${detectedBusinessType}`)

    // ── 8. Run all analyzers ──────────────────────────────────────────────
    emitProgress('Analyzing technical SEO…', 76)
    const analyzerInput: AnalyzerInput = {
      pages: crawledPages,
      domain,
      robotsFound,
      sitemapFound,
      detectedBusinessType,
    }

    const [technical, localSeo, conversion, content, trust] = [
      analyzeTechnical(analyzerInput),
      analyzeLocalSeo(analyzerInput),
      analyzeConversion(analyzerInput),
      analyzeContent(analyzerInput),
      analyzeTrust(analyzerInput),
    ]

    emitProgress('Analyzing local SEO…', 80)
    emitProgress('Analyzing conversions…', 84)
    emitProgress('Analyzing content & trust…', 88)

    allFindings = [
      ...technical.findings,
      ...localSeo.findings,
      ...conversion.findings,
      ...content.findings,
      ...trust.findings,
    ]

    log.info(
      `Analyzers complete: ${allFindings.length} findings (tech=${technical.findings.length}, local=${localSeo.findings.length}, conv=${conversion.findings.length}, content=${content.findings.length}, trust=${trust.findings.length})`,
    )

    // ── 9. Score each category + compute weighted overall ─────────────────
    emitProgress('Scoring results…', 92)

    const techScore = scoreTechnical({ findings: technical.findings, pages: crawledPages, robotsFound, sitemapFound })
    const localScore = scoreLocalSeo({ findings: localSeo.findings, pages: crawledPages })
    const convScore = scoreConversion({ findings: conversion.findings, pages: crawledPages })
    const contentScore = scoreContent({ findings: content.findings, pages: crawledPages })
    const trustScore = scoreTrust({ findings: trust.findings, pages: crawledPages, domain })

    const categoryScores = {
      technical: techScore,
      localSeo: localScore,
      conversion: convScore,
      content: contentScore,
      trust: trustScore,
    }

    scores = { ...categoryScores, overall: computeWeightedScore(categoryScores) }
    allFindings = prioritizeFindings(allFindings)

    log.info(
      `Scoring complete: tech=${techScore.value} local=${localScore.value} conv=${convScore.value} content=${contentScore.value} trust=${trustScore.value} overall=${scores.overall.value}`,
    )

    // ── 10. Placeholder: Reports (Phase 7) ───────────────────────────────
    emitProgress('Building reports…', 97)
    // Phase 7 report writers will save JSON + HTML to disk

  } finally {
    await browser.close()
    log.info('Browser closed')
  }

  emitProgress('Complete.', 100)
  log.info(`Audit complete for ${domain}: ${crawledPages.length} pages, ${allFindings.length} findings`)

  return {
    id: scanId,
    request,
    scannedAt: new Date().toISOString(),
    domain,
    detectedBusinessType,
    pages: crawledPages,
    findings: allFindings,
    scores,
    quickWins: buildQuickWins(allFindings),
    moneyLeaks: buildMoneyLeaks(allFindings),
    artifacts: {},
  }
}

// ─── Placeholder scores (initial value before scoring runs) ──────────────────

function buildPlaceholderScores(): AuditScores {
  const make = (): import('../types/audit').CategoryScore => ({
    value: 0,
    label: 'Leaking Opportunity',
    rationale: [],
  })

  return {
    technical: make(),
    localSeo: make(),
    conversion: make(),
    content: make(),
    trust: make(),
    overall: make(),
  }
}
