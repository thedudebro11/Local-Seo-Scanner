/**
 * Scoring-related types and helper interfaces.
 * The primary scoring interfaces live in audit.ts — this file adds
 * scoring-engine internals used by the individual scorers.
 */

import type { Finding, FindingCategory } from './audit'

/**
 * Input passed to each category scorer.
 */
export interface ScorerInput {
  findings: Finding[]
  categoryFindings: Finding[]   // findings filtered to this scorer's category
  totalPagesScanned: number
  robotsFound: boolean
  sitemapFound: boolean
  isHttps: boolean
}

/**
 * Penalty applied for each finding by severity.
 */
export const FINDING_PENALTIES: Record<string, number> = {
  high:   15,
  medium:  7,
  low:     3,
}

/**
 * Starting score for each category before deductions.
 */
export const BASE_SCORE = 100
