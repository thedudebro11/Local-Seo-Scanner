/**
 * Score Confidence — scan completeness metadata.
 *
 * Evaluates HOW trustworthy / complete a scan result is, not SEO quality.
 * Reads from already-computed AuditResult data — no new crawl steps.
 *
 * Does NOT touch or modify the scoring model.
 */

import type {
  CrawledPage,
  LighthouseMetrics,
  VisualAnalysisResult,
  CompetitorAnalysisResult,
  ScoreConfidence,
} from '../types/audit'

export interface ConfidenceInput {
  pages: CrawledPage[]
  lighthouse?: LighthouseMetrics[]
  visual?: VisualAnalysisResult
  competitor?: CompetitorAnalysisResult
}

export function computeScoreConfidence(input: ConfidenceInput): ScoreConfidence {
  const { pages, lighthouse, visual, competitor } = input

  let score = 0
  const positives: string[] = []
  const negatives: string[] = []

  // ── 1. Pages crawled ────────────────────────────────────────────────────────
  const pageCount = pages.length
  if (pageCount >= 8) {
    score += 2
    positives.push(`${pageCount} pages crawled`)
  } else if (pageCount >= 4) {
    score += 1
    positives.push(`${pageCount} pages crawled`)
  } else {
    negatives.push(`only ${pageCount} page${pageCount !== 1 ? 's' : ''} crawled`)
  }

  // ── 2. Homepage found ───────────────────────────────────────────────────────
  const homepageFound = pages.some((p) => p.pageType === 'home')
  if (homepageFound) {
    score += 1
    positives.push('homepage found')
  } else {
    negatives.push('homepage not detected')
  }

  // ── 3. Key secondary pages ──────────────────────────────────────────────────
  const importantTypes = ['contact', 'service', 'location', 'about'] as const
  const foundTypes = importantTypes.filter((t) => pages.some((p) => p.pageType === t))

  if (foundTypes.length >= 2) {
    score += 2
    positives.push(`key pages found (${foundTypes.join(', ')})`)
  } else if (foundTypes.length === 1) {
    score += 1
    positives.push(`${foundTypes[0]} page found`)
    const missingType = importantTypes.find((t) => !foundTypes.includes(t)) ?? 'supporting page'
    negatives.push(`no ${missingType} page detected`)
  } else {
    negatives.push('no contact, service, or location pages detected')
  }

  // ── 4. Lighthouse ───────────────────────────────────────────────────────────
  const lighthouseDone = (lighthouse ?? []).length > 0
  if (lighthouseDone) {
    score += 1
    positives.push('Lighthouse completed')
  } else {
    negatives.push('Lighthouse data missing')
  }

  // ── 5. Crawl health ─────────────────────────────────────────────────────────
  const errorPageCount = pages.filter((p) => p.statusCode >= 400).length
  if (errorPageCount === 0) {
    score += 1
    // No mention needed — clean crawl is the expected baseline
  } else if (errorPageCount / Math.max(pageCount, 1) > 0.3) {
    negatives.push(`${errorPageCount} pages returned errors`)
  }

  // ── 6. Visual analysis (minor boost) ────────────────────────────────────────
  if (visual && visual.pagesAnalyzed.length > 0) {
    score += 1
    positives.push('visual analysis completed')
  }

  // ── 7. Competitor analysis (minor boost) ────────────────────────────────────
  if (competitor && competitor.competitors.length > 0) {
    score += 1
    positives.push('competitor analysis completed')
  }

  // ── Level thresholds ────────────────────────────────────────────────────────
  // Max possible score: 2 + 1 + 2 + 1 + 1 + 1 + 1 = 9
  let level: ScoreConfidence['level']
  if (score >= 6) {
    level = 'High'
  } else if (score >= 3) {
    level = 'Medium'
  } else {
    level = 'Low'
  }

  // ── Reason string ────────────────────────────────────────────────────────────
  const reason = buildReason(level, positives, negatives)

  return { level, reason }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildReason(
  level: ScoreConfidence['level'],
  positives: string[],
  negatives: string[],
): string {
  if (positives.length === 0 && negatives.length === 0) {
    return 'Scan data was limited.'
  }

  // Build a natural-English sentence combining positives and negatives.
  const posPart = joinList(positives)
  const negPart = joinList(negatives)

  if (level === 'High') {
    // e.g. "9 pages crawled, Lighthouse completed, and key pages found."
    return cap(posPart) + '.'
  }

  if (level === 'Medium') {
    if (posPart && negPart) {
      return `${cap(posPart)}, but ${negPart}.`
    }
    return posPart ? `${cap(posPart)}.` : `${cap(negPart)}.`
  }

  // Low
  if (negPart && posPart) {
    return `${cap(negPart)}; ${posPart}.`
  }
  return negPart ? `${cap(negPart)}.` : `Scan coverage was very limited.`
}

/** Oxford-ish list join: "a, b, and c" */
function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
