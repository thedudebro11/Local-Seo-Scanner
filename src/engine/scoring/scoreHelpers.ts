/**
 * Shared scoring utilities used by all category scorers.
 *
 * Scoring model: deduction-based.
 * Start at 100, subtract points for each finding by severity.
 * Score is clamped to 0–100.
 *
 * Deductions:
 *   high    = 20 pts
 *   medium  = 10 pts
 *   low     =  4 pts
 */

import type { Finding, ScoreOutput } from '../types/audit'

// ─── Constants ────────────────────────────────────────────────────────────────

export const PENALTY: Record<Finding['severity'], number> = {
  high: 20,
  medium: 10,
  low: 4,
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/** Compute a 0–100 score by deducting from 100 for each finding. */
export function computeScore(findings: Finding[]): number {
  const total = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0)
  return Math.max(0, 100 - total)
}

/** Map a numeric score to its display band label. */
export function scoreBand(value: number): string {
  if (value >= 85) return 'Strong'
  if (value >= 70) return 'Solid'
  if (value >= 55) return 'Needs Work'
  return 'Leaking Opportunity'
}

/**
 * Build rationale bullet points from findings.
 * Negative bullets (issues) come first.
 * Caller can append positive bullets.
 */
export function buildNegativeRationale(findings: Finding[]): string[] {
  return findings.map((f) => {
    const tag =
      f.severity === 'high' ? '[High]' : f.severity === 'medium' ? '[Medium]' : '[Low]'
    return `${tag} ${f.title}`
  })
}

/**
 * Compose a complete ScoreOutput from category findings + optional positive notes.
 */
export function makeScore(
  findings: Finding[],
  positives: string[] = [],
): ScoreOutput {
  const value = computeScore(findings)
  const negatives = buildNegativeRationale(findings)

  const rationale =
    negatives.length === 0 && positives.length === 0
      ? ['No issues detected in this category.']
      : [...negatives, ...positives]

  return { value, label: scoreBand(value), rationale }
}
