/**
 * Finding prioritization.
 * Sorts findings by business impact: category weight × severity penalty.
 * Used to surface the most revenue-impacting issues first.
 *
 * Category weights: Local SEO 30%, Technical 25%, Conversion 25%, Content 10%, Trust 10%
 * Severity penalties: high 20, medium 10, low 4
 */

import type { Finding } from '../types/audit'

const CATEGORY_WEIGHT: Record<Finding['category'], number> = {
  local: 0.30,
  technical: 0.25,
  conversion: 0.25,
  content: 0.10,
  trust: 0.10,
}

const SEVERITY_WEIGHT: Record<Finding['severity'], number> = {
  high: 20,
  medium: 10,
  low: 4,
}

function impactScore(f: Finding): number {
  return (CATEGORY_WEIGHT[f.category] ?? 0.1) * SEVERITY_WEIGHT[f.severity]
}

/**
 * Sort findings by business impact (highest first).
 * Returns a new array — does not mutate the input.
 */
export function prioritizeFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => impactScore(b) - impactScore(a))
}

/**
 * Top quick wins: medium + high findings, prioritized, capped at 5.
 * Returns the `recommendation` string for each.
 */
export function buildQuickWins(findings: Finding[]): string[] {
  return prioritizeFindings(findings)
    .filter((f) => f.severity === 'high' || f.severity === 'medium')
    .slice(0, 5)
    .map((f) => f.recommendation)
}

/**
 * Money leaks: high-severity findings only, prioritized, capped at 5.
 * Returns the `summary` string for each.
 */
export function buildMoneyLeaks(findings: Finding[]): string[] {
  return prioritizeFindings(findings)
    .filter((f) => f.severity === 'high')
    .slice(0, 5)
    .map((f) => f.summary)
}
