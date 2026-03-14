/**
 * Outreach opportunity scoring heuristic.
 *
 * Higher score = better prospect for outreach (low score + high issues + high revenue leak).
 */

import type { MarketDashboardBusiness } from './marketTypes'

/**
 * Compute outreach priority score (0–11 max).
 *
 * Points awarded:
 *   +3  score < 70
 *   +2  score < 55 (stacks with above)
 *   +2  highPriorityIssueCount >= 3
 *   +2  estimatedRevenueLossLow > 1000
 *   +1  confidenceLevel !== 'Low' (data is reliable)
 *   +1  opportunityCount >= 3
 */
export function computeOutreachScore(b: Partial<MarketDashboardBusiness>): number {
  let score = 0
  const s = b.overallScore ?? 100
  if (s < 70) score += 3
  if (s < 55) score += 2
  if ((b.highPriorityIssueCount ?? 0) >= 3) score += 2
  if ((b.estimatedRevenueLossLow ?? 0) > 1000) score += 2
  if (b.confidenceLevel && b.confidenceLevel !== 'Low') score += 1
  if ((b.opportunityCount ?? 0) >= 3) score += 1
  return score
}
