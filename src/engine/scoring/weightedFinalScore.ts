/**
 * Weighted overall score.
 * Combines all 5 category scores into one composite score.
 *
 * Weights (must sum to 1.0):
 *   Technical  25%
 *   Local SEO  30%
 *   Conversion 25%
 *   Content    10%
 *   Trust      10%
 */

import type { AuditScores, CategoryScore } from '../types/audit'
import { scoreBand } from './scoreHelpers'

const WEIGHTS = {
  technical: 0.25,
  localSeo: 0.30,
  conversion: 0.25,
  content: 0.10,
  trust: 0.10,
} as const

export function computeWeightedScore(scores: Omit<AuditScores, 'overall'>): CategoryScore {
  const weighted =
    scores.technical.value * WEIGHTS.technical +
    scores.localSeo.value * WEIGHTS.localSeo +
    scores.conversion.value * WEIGHTS.conversion +
    scores.content.value * WEIGHTS.content +
    scores.trust.value * WEIGHTS.trust

  const value = Math.round(weighted)

  const rationale = [
    `Technical (25%): ${scores.technical.value} → ${scores.technical.label}`,
    `Local SEO (30%): ${scores.localSeo.value} → ${scores.localSeo.label}`,
    `Conversion (25%): ${scores.conversion.value} → ${scores.conversion.label}`,
    `Content (10%): ${scores.content.value} → ${scores.content.label}`,
    `Trust (10%): ${scores.trust.value} → ${scores.trust.label}`,
  ]

  return { value, label: scoreBand(value), rationale }
}
