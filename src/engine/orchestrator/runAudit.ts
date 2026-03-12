/**
 * Main audit orchestrator entry point.
 * Called by the Electron IPC scan handler.
 *
 * Phase 3: Real crawler (Playwright BFS + robots + sitemap + classifyPage).
 * Phase 4: All extractors (extractAllSignals).
 * Phase 5: All analyzers + businessTypeDetector → real findings.
 * Phase 6+: Scoring and report generation wired here.
 * Phase 9: Visual UX analysis (screenshots + above-the-fold checks).
 * Phase 10: Competitor gap analysis (optional, manually provided URLs).
 */

import type { AuditRequest, AuditResult, AuditScores, CrawledPage, VisualAnalysisResult, CompetitorAnalysisResult } from '../types/audit'
import { normalizeInputUrl, getDomain } from '../utils/domain'
import { generateScanId, getScreenshotsDir } from '../storage/pathResolver'
import { runVisualAnalysis } from '../visual/visualAnalyzer'
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
import { enrichFindingsWithImpact, computeImpactPenalty } from '../impactAnalyzer'
import { buildJsonReport } from '../reports/buildJsonReport'
import { buildHtmlReport } from '../reports/buildHtmlReport'
import { saveScan } from '../storage/scanRepository'
import { buildJsonPath, buildHtmlPath } from '../storage/pathResolver'
import { runLighthouse } from '../lighthouse/runLighthouse'
import { analyzeLighthouse } from '../lighthouse/lighthouseAnalyzer'
import { runCompetitorAnalysis } from '../competitor'

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
  let reportArtifacts: AuditResult['artifacts'] = {}
  let lighthouseMetrics: import('../types/audit').LighthouseMetrics[] = []
  let visualResult: VisualAnalysisResult | undefined
  let competitorResult: CompetitorAnalysisResult | undefined
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

    // ── 8.5. Visual UX analysis (best-effort, non-blocking) ──────────────
    emitProgress('Capturing visual screenshots…', 89)
    try {
      const screenshotDir = getScreenshotsDir(scanId)
      const { result: vResult, findings: vFindings } = await runVisualAnalysis(
        browser,
        crawledPages,
        screenshotDir,
      )
      visualResult = vResult
      allFindings = [...allFindings, ...vFindings]
      // Collect screenshot paths for artifact storage
      const screenshotPaths: Record<string, string> = {}
      for (const p of vResult.pagesAnalyzed) {
        if (p.screenshotPath) screenshotPaths[p.pageType] = p.screenshotPath
      }
      if (Object.keys(screenshotPaths).length > 0) {
        reportArtifacts = { ...reportArtifacts, screenshotPaths }
      }
      log.info(`Visual analysis: ${vResult.pagesAnalyzed.length} page(s), ${vFindings.length} finding(s)`)
    } catch (vErr) {
      log.warn(`Visual analysis skipped: ${(vErr as Error).message}`)
    }

    // ── 9. Lighthouse performance audit (best-effort, non-blocking) ───────
    emitProgress('Running performance audit…', 90)
    try {
      const chromiumPath = chromium.executablePath()
      const lhMetric = await runLighthouse(normalizedUrl, chromiumPath)
      if (lhMetric) {
        lighthouseMetrics = [lhMetric]
        const lhFindings = analyzeLighthouse(lhMetric)
        allFindings = [...allFindings, ...lhFindings]
        log.info(`Lighthouse: perf=${lhMetric.performanceScore} seo=${lhMetric.seoScore} findings=${lhFindings.length}`)
      }
    } catch (lhErr) {
      log.warn(`Lighthouse step skipped: ${(lhErr as Error).message}`)
    }

    // ── 11. Score each category + compute weighted overall ───────────────
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
    allFindings = prioritizeFindings(enrichFindingsWithImpact(allFindings, detectedBusinessType))

    // Apply impact-weighted penalty to overall score (capped at -30)
    const impactPenalty = computeImpactPenalty(allFindings)
    if (impactPenalty > 0) {
      const adjusted = Math.max(0, scores.overall.value - impactPenalty)
      scores = { ...scores, overall: { ...scores.overall, value: adjusted } }
    }

    log.info(
      `Scoring complete: tech=${techScore.value} local=${localScore.value} conv=${convScore.value} content=${contentScore.value} trust=${trustScore.value} overall=${scores.overall.value}`,
    )

    // ── 12. Competitor gap analysis (optional, best-effort) ───────────────
    emitProgress('Analyzing competitors…', 94)
    if (request.competitorUrls && request.competitorUrls.length > 0) {
      try {
        competitorResult = await runCompetitorAnalysis(
          browser,
          normalizedUrl,
          crawledPages,
          request.competitorUrls.slice(0, 3),
        )
        log.info(`Competitor analysis: ${competitorResult.competitors.length} sites, ${competitorResult.gaps.length} gaps`)
      } catch (cErr) {
        log.warn(`Competitor analysis skipped: ${(cErr as Error).message}`)
      }
    }

    // ── 10. Write JSON + HTML reports and persist to index ───────────────
    emitProgress('Building reports…', 97)

    const jsonPath = buildJsonPath(scanId)
    const htmlPath = buildHtmlPath(scanId)

    // Build a partial result with real scores so the report writers have complete data
    const partialResult: AuditResult = {
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
      lighthouse: lighthouseMetrics.length > 0 ? lighthouseMetrics : undefined,
      visual: visualResult,
      competitor: competitorResult,
      artifacts: { jsonPath, htmlPath, screenshotPaths: reportArtifacts.screenshotPaths },
    }

    await Promise.all([
      buildJsonReport(partialResult, jsonPath),
      buildHtmlReport(partialResult, htmlPath),
    ])

    await saveScan(partialResult)
    reportArtifacts = { jsonPath, htmlPath, screenshotPaths: reportArtifacts.screenshotPaths }
    log.info(`Reports saved: ${jsonPath}`)

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
    lighthouse: lighthouseMetrics.length > 0 ? lighthouseMetrics : undefined,
    visual: visualResult,
    competitor: competitorResult,
    artifacts: reportArtifacts,
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
