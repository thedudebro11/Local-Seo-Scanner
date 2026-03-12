/**
 * Revenue Impact Estimator.
 *
 * Translates scan findings into a plain-English business impact estimate.
 *
 * HONESTY CONTRACT:
 *   - All output is explicitly framed as estimated / directional
 *   - Uses ranges, never exact numbers
 *   - Assumptions are always listed in the output
 *   - Does NOT modify any scores or findings
 */

import type { BusinessType, Finding, RevenueImpactEstimate, ScoreConfidence } from '../types/audit'

// ─── Business-type lead value config ─────────────────────────────────────────
// All values are broad, conservative assumptions in USD.
// Edit this table to update all estimates — nothing is hardcoded elsewhere.

interface LeadValueConfig {
  low: number     // conservative value per converted lead ($)
  high: number    // optimistic value per converted lead ($)
  label: string   // plain-English business category for assumptions text
}

const LEAD_VALUE: Record<BusinessType, LeadValueConfig> = {
  roofer:      { low: 800,  high: 3000, label: 'roofing' },
  contractor:  { low: 600,  high: 2500, label: 'contracting / home services' },
  auto_shop:   { low: 150,  high: 600,  label: 'auto repair' },
  auto:        { low: 300,  high: 1000, label: 'automotive' },
  dentist:     { low: 400,  high: 1800, label: 'dental / healthcare' },
  salon:       { low: 40,   high: 200,  label: 'salon / spa' },
  restaurant:  { low: 20,   high: 100,  label: 'restaurant / food service' },
  other:       { low: 150,  high: 600,  label: 'local business' },
}

// ─── Issue weight mapping ─────────────────────────────────────────────────────
// Converts impactLevel into a numeric weight used to score total issue severity.
// These weights are internal only — they do not feed back into any category score.

const IMPACT_WEIGHT: Record<string, number> = {
  CRITICAL: 8,
  HIGH:     4,
  MEDIUM:   1.5,
  LOW:      0.3,
}

// ─── Lead loss range buckets ──────────────────────────────────────────────────
// Maps total issue score → estimated monthly lead loss range.
// Ranges are intentionally broad and conservative.

interface LeadRange { low: number; high: number }

function issueScoreToLeadRange(score: number): LeadRange {
  if (score < 5)   return { low: 1,  high: 4  }  // minor issues
  if (score < 15)  return { low: 3,  high: 10 }  // light issues
  if (score < 30)  return { low: 8,  high: 20 }  // moderate issues
  if (score < 55)  return { low: 15, high: 35 }  // significant issues
  return              { low: 25, high: 60 }        // severe issues
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EstimateInput {
  findings: Finding[]
  detectedBusinessType: BusinessType
  scoreConfidence?: ScoreConfidence
}

export function estimateRevenueImpact(input: EstimateInput): RevenueImpactEstimate {
  const { findings, detectedBusinessType, scoreConfidence } = input
  const leadValueConfig = LEAD_VALUE[detectedBusinessType] ?? LEAD_VALUE.other

  // ── Step 1: Weighted issue score ────────────────────────────────────────────
  const issueScore = findings.reduce((sum, f) => {
    const w = IMPACT_WEIGHT[f.impactLevel ?? ''] ?? 0
    return sum + w
  }, 0)

  // ── Step 2: Lead loss range ─────────────────────────────────────────────────
  const leadLoss = issueScoreToLeadRange(issueScore)

  // ── Step 3: Revenue loss range (optional) ───────────────────────────────────
  // Only computed when we have a real lead value to work with.
  // We use a conversion rate assumption of 20–40% of leads → customers.
  const CONVERSION_LOW  = 0.20
  const CONVERSION_HIGH = 0.40

  const revLow  = Math.round(leadLoss.low  * CONVERSION_LOW  * leadValueConfig.low  / 100) * 100
  const revHigh = Math.round(leadLoss.high * CONVERSION_HIGH * leadValueConfig.high / 100) * 100

  const estimatedRevenueLossRange = revLow > 0
    ? { low: revLow, high: revHigh }
    : undefined

  // ── Step 4: Impact drivers ──────────────────────────────────────────────────
  // Top findings by weight, translated into plain-English driver descriptions.
  const impactDrivers = buildDriverList(findings)

  // ── Step 5: Explanation ─────────────────────────────────────────────────────
  const explanation = buildExplanation(findings, leadLoss, detectedBusinessType)

  // ── Step 6: Confidence ──────────────────────────────────────────────────────
  const confidence = deriveConfidence(findings, scoreConfidence)

  // ── Step 7: Assumptions ─────────────────────────────────────────────────────
  const assumptions = buildAssumptions(detectedBusinessType, leadValueConfig, confidence)

  return {
    estimatedLeadLossRange: leadLoss,
    estimatedRevenueLossRange,
    impactDrivers,
    explanation,
    assumptions,
    confidence,
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Map known finding IDs to concise, plain-English driver descriptions.
 * Fallback: use the finding's own title for unrecognized IDs.
 */
const DRIVER_LABELS: Record<string, string> = {
  'local-no-phone-homepage':        'Phone number missing from the homepage — visitors cannot call without searching for it',
  'local-no-phone-contact':         'Phone number absent from the contact page — the most conversion-critical page on the site',
  'conversion-no-phone-homepage':   'No clickable phone link on the homepage — mobile visitors cannot tap to call',
  'visual-no-phone-above-fold':     'Phone number not visible before scrolling — most visitors never scroll far enough to find it',
  'conversion-no-cta-homepage':     'No clear call-to-action button on the homepage — visitors have no obvious next step',
  'visual-no-above-fold-cta':       'No "contact" or "get a quote" button visible on first load — visitors leave without acting',
  'conversion-low-cta-coverage':    'Contact options are missing on many pages — visitors who browse rarely find a way to reach you',
  'conversion-no-booking-cta':      'No booking or appointment link — customers must find another way to schedule',
  'conversion-no-form':             'No contact form anywhere on the site — enquiries outside business hours are lost',
  'conversion-no-form-contact-page':'No form on the contact page — the expected action on that page is unavailable',
  'technical-noindex-money-pages':  'Key service or contact pages blocked from Google — they cannot appear in search results',
  'technical-broken-pages':         'Broken pages on the site — visitors and Google hit dead ends',
  'lh-performance-poor':            'Very slow page loading speed — most visitors leave before the page finishes loading',
  'lh-performance-needs-work':      'Below-average page speed — slow enough to increase visitor drop-off rate',
  'lh-lcp-slow':                    'Largest element takes too long to appear — visitors experience a blank or partial page',
  'lh-tbt-high':                    'Page interactivity is heavily delayed — buttons and links feel unresponsive',
  'trust-no-testimonials':          'No customer reviews or testimonials — visitors cannot gauge whether to trust the business',
  'trust-weak-trust-signals':       'Weak credibility signals on the homepage — first-time visitors may lack confidence to contact',
  'trust-homepage-no-trust-content':'Nothing on the homepage establishes trust — the site looks generic',
  'local-no-localbusiness-schema':  'No structured business data for Google — harder to appear in local map results',
  'local-no-address-homepage':      'Business address not on the homepage — local customers cannot verify the location quickly',
  'local-no-map':                   'No embedded map — visitors must leave the site to find directions',
  'content-thin-homepage':          'Homepage has very little content — gives Google and visitors minimal information about the business',
  'content-no-service-pages':       'No dedicated service pages — each service cannot rank independently in search',
  'content-thin-service-pages':     'Service pages have too little content — unlikely to rank for relevant search terms',
}

function buildDriverList(findings: Finding[]): string[] {
  // Sort by impact weight, take the top 5
  const sorted = [...findings].sort((a, b) => {
    const wa = IMPACT_WEIGHT[a.impactLevel ?? ''] ?? 0
    const wb = IMPACT_WEIGHT[b.impactLevel ?? ''] ?? 0
    return wb - wa
  })

  return sorted
    .slice(0, 5)
    .map((f) => DRIVER_LABELS[f.id] ?? f.title)
}

function buildExplanation(
  findings: Finding[],
  leadLoss: LeadRange,
  businessType: BusinessType,
): string {
  const criticalCount = findings.filter((f) => f.impactLevel === 'CRITICAL').length
  const highCount     = findings.filter((f) => f.impactLevel === 'HIGH').length

  const hasConversionIssues = findings.some(
    (f) => f.category === 'conversion' && (f.impactLevel === 'CRITICAL' || f.impactLevel === 'HIGH'),
  )
  const hasSpeedIssues = findings.some(
    (f) => f.id.startsWith('lh-performance') || f.id === 'lh-lcp-slow' || f.id === 'lh-tbt-high',
  )
  const hasVisibilityIssues = findings.some(
    (f) => f.id === 'technical-noindex-money-pages' || f.id === 'technical-broken-pages',
  )
  const hasLocalIssues = findings.some(
    (f) => f.category === 'localSeo' && (f.impactLevel === 'CRITICAL' || f.impactLevel === 'HIGH'),
  )
  const hasTrustIssues = findings.some(
    (f) => f.category === 'trust' && (f.impactLevel === 'CRITICAL' || f.impactLevel === 'HIGH'),
  )

  const causes: string[] = []
  if (hasConversionIssues) causes.push('missing contact options and call-to-action buttons')
  if (hasSpeedIssues)      causes.push('slow page loading speed')
  if (hasVisibilityIssues) causes.push('pages that are hidden from or broken for Google')
  if (hasLocalIssues)      causes.push('weak local search signals')
  if (hasTrustIssues)      causes.push('lack of visible credibility signals')

  const causeText = causes.length > 0
    ? joinList(causes)
    : 'a combination of technical, conversion, and local SEO issues'

  const severityNote = (criticalCount + highCount) >= 3
    ? 'Several high-priority issues were detected. '
    : criticalCount > 0
      ? 'At least one critical issue was detected. '
      : ''

  return (
    `${severityNote}Based on the issues found, this website may be losing an estimated ` +
    `${leadLoss.low}–${leadLoss.high} potential leads per month due to ${causeText}. ` +
    `This is a directional estimate only — actual results depend on traffic volume, market, and competition.`
  )
}

function deriveConfidence(
  findings: Finding[],
  scoreConfidence?: ScoreConfidence,
): RevenueImpactEstimate['confidence'] {
  const criticalOrHigh = findings.filter(
    (f) => f.impactLevel === 'CRITICAL' || f.impactLevel === 'HIGH',
  ).length

  // If the scan itself was high-confidence and we have clear high-impact signals, be more confident
  if (scoreConfidence?.level === 'High' && criticalOrHigh >= 2) return 'Medium'
  if (scoreConfidence?.level === 'Low') return 'Low'
  if (criticalOrHigh === 0) return 'Low'
  if (criticalOrHigh >= 3) return 'Medium'
  return 'Low'
}

function buildAssumptions(
  businessType: BusinessType,
  leadValueConfig: LeadValueConfig,
  confidence: RevenueImpactEstimate['confidence'],
): string[] {
  return [
    `Business type: ${leadValueConfig.label}`,
    `Estimated lead value assumed at $${leadValueConfig.low.toLocaleString()}–$${leadValueConfig.high.toLocaleString()} per converted customer (conservative range)`,
    'Lead-to-customer conversion rate assumed at 20–40% of enquiries',
    'Lead loss estimates are based on detected website issues only — actual traffic and market conditions are not known',
    'Revenue estimates assume current organic and direct traffic levels; paid traffic is not considered',
    confidence === 'Low'
      ? 'Confidence is low — fewer pages were crawled or fewer high-impact issues were identified, making the estimate less certain'
      : 'Estimate is directional; consult an SEO professional for a detailed revenue projection',
    'All figures are estimates and should not be treated as guaranteed outcomes',
  ]
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}
