/**
 * Main audit orchestrator entry point.
 * Called by the Electron IPC scan handler.
 *
 * Phase 1 stub: validates request, returns a placeholder result.
 * Real implementation wired in Phase 3+ (crawl, extract, analyze, score, report).
 */

import type { AuditRequest, AuditResult, AuditScores, CrawledPage } from '../types/audit'
import type { ScanProgressEvent } from '../types/ipc'
import { normalizeInputUrl, getDomain } from '../utils/domain'
import { generateScanId } from '../storage/pathResolver'
import { createLogger } from '../utils/logger'

const log = createLogger('runAudit')

export type ProgressEmitter = (
  step: string,
  percent: number,
  message?: string,
) => void

/**
 * Run a full audit for the given request.
 * The emitProgress callback pushes events to the renderer via IPC.
 */
export async function runAudit(
  request: AuditRequest,
  emitProgress: ProgressEmitter,
): Promise<AuditResult> {
  log.info(`Starting audit for ${request.url}`)

  // ── Step 1: Validate + normalize URL ────────────────────────────────────
  emitProgress('Validating URL…', 2)

  let normalizedUrl: string
  try {
    normalizedUrl = normalizeInputUrl(request.url)
  } catch (err) {
    throw new Error(`Invalid URL: ${request.url}`)
  }

  const domain = getDomain(normalizedUrl)
  const scanId = generateScanId(domain)

  log.info(`Normalized URL: ${normalizedUrl} | Domain: ${domain} | ID: ${scanId}`)

  // ── Step 2–17: Real pipeline (implemented in Phase 3+) ───────────────────
  // For Phase 1 we emit fake progress milestones and return a placeholder result.

  const steps = [
    ['Fetching homepage…',         8],
    ['Loading robots.txt…',       14],
    ['Loading sitemap…',          20],
    ['Discovering pages…',        30],
    ['Extracting signals…',       50],
    ['Detecting business type…',  60],
    ['Analyzing technical SEO…',  68],
    ['Analyzing local SEO…',      74],
    ['Analyzing conversions…',    80],
    ['Running Lighthouse…',       88],
    ['Scoring results…',          94],
    ['Building reports…',         98],
    ['Complete.',                100],
  ] as [string, number][]

  for (const [step, pct] of steps) {
    emitProgress(step, pct)
    // Simulate async work — real phases will do real work here
    await sleep(120)
  }

  // ── Placeholder result (replace entirely in Phase 3+) ──────────────────
  const placeholderResult: AuditResult = {
    id: scanId,
    request,
    scannedAt: new Date().toISOString(),
    domain,
    detectedBusinessType: request.businessType === 'auto' ? 'other' : request.businessType,
    pages: [],
    findings: [
      {
        id: 'placeholder-001',
        category: 'technical',
        severity: 'medium',
        title: 'Phase 1 Stub — Real scan not yet implemented',
        summary: `The crawler and analyzers will be wired in Phase 3–5.`,
        whyItMatters: 'This placeholder will be replaced by real findings.',
        recommendation: 'Continue to Phase 2 to wire up the scan form and Zustand store.',
      },
    ],
    scores: buildPlaceholderScores(),
    quickWins: [
      'Phase 3: Real crawler will find actual quick wins',
      'Phase 5: Analyzers will generate actionable recommendations',
    ],
    moneyLeaks: [
      'Phase 5: Revenue-impacting issues will appear here',
    ],
    artifacts: {},
  }

  log.info(`Audit complete for ${domain}`)
  return placeholderResult
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPlaceholderScores(): AuditScores {
  const make = (value: number): import('../types/audit').CategoryScore => ({
    value,
    label: value >= 70 ? 'Placeholder (solid)' : 'Placeholder (needs work)',
    rationale: ['Real scoring implemented in Phase 6'],
  })

  return {
    technical:  make(0),
    localSeo:   make(0),
    conversion: make(0),
    content:    make(0),
    trust:      make(0),
    overall:    make(0),
  }
}
