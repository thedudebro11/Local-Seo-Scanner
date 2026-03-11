/**
 * Finding-specific helpers and constants.
 * The core Finding interface lives in audit.ts — this file adds
 * category/severity metadata used by analyzers and scoring.
 */

import type { FindingCategory, Severity } from './audit'

export interface FindingWeights {
  category: FindingCategory
  severity: Severity
  impactScore: number   // 0–10 how much this class of finding matters
}

/**
 * Base impact scores per severity — used by prioritizeFindings.
 */
export const SEVERITY_IMPACT: Record<Severity, number> = {
  high:   10,
  medium:  5,
  low:     2,
}

/**
 * Category weights in final score (must sum to 1.0).
 */
export const CATEGORY_WEIGHTS: Record<FindingCategory, number> = {
  technical:  0.25,
  localSeo:      0.30,
  conversion: 0.25,
  content:    0.10,
  trust:      0.10,
}

/**
 * Score band labels for display.
 */
export function scoreBandLabel(score: number): string {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Solid'
  if (score >= 55) return 'Needs Work'
  return 'Leaking Opportunity'
}

/**
 * Score band CSS color variable name.
 */
export function scoreBandColor(score: number): string {
  if (score >= 85) return 'var(--color-score-strong)'
  if (score >= 70) return 'var(--color-score-solid)'
  if (score >= 55) return 'var(--color-score-needs)'
  return 'var(--color-score-leak)'
}
