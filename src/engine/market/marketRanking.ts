/**
 * Ranking and sorting helpers for MarketDashboardBusiness arrays.
 */

import type { MarketDashboardBusiness } from './marketTypes'

export type MarketSortKey =
  | 'score-desc'
  | 'score-asc'
  | 'revenue-desc'
  | 'outreach-desc'
  | 'issues-desc'

export function rankBusinesses(
  items: MarketDashboardBusiness[],
  by: MarketSortKey,
): MarketDashboardBusiness[] {
  const copy = [...items]
  switch (by) {
    case 'score-desc':
      return copy.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    case 'score-asc':
      return copy.sort((a, b) => (a.overallScore ?? 999) - (b.overallScore ?? 999))
    case 'revenue-desc':
      return copy.sort(
        (a, b) =>
          (b.estimatedRevenueLossHigh ?? b.estimatedRevenueLossLow ?? 0) -
          (a.estimatedRevenueLossHigh ?? a.estimatedRevenueLossLow ?? 0),
      )
    case 'outreach-desc':
      return copy.sort((a, b) => b.outreachScore - a.outreachScore)
    case 'issues-desc':
      return copy.sort((a, b) => (b.issueCount ?? 0) - (a.issueCount ?? 0))
  }
}

export function topN(
  items: MarketDashboardBusiness[],
  by: MarketSortKey,
  n: number,
): MarketDashboardBusiness[] {
  return rankBusinesses(items, by).slice(0, n)
}
