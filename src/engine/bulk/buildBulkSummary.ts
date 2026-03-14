/**
 * Bulk scan summary helpers — Phase 13.
 *
 * Ranking and comparison utilities used by runBulkScan and the UI.
 * All functions are pure — they accept BulkScanResult and return sorted views.
 */

import type { BulkScanItemResult, BulkScanResult } from './bulkTypes'

// ─── Sort keys ────────────────────────────────────────────────────────────────

export type BulkSortKey =
  | 'score-asc'        // lowest score first (most problems)
  | 'score-desc'       // highest score first
  | 'issues-desc'      // most issues first
  | 'revenue-desc'     // highest estimated revenue loss first

/**
 * Return only the successful items, sorted by the given key.
 * Failed items are excluded from ranked views.
 */
export function rankItems(
  result: BulkScanResult,
  by: BulkSortKey = 'score-asc',
): BulkScanItemResult[] {
  const successful = result.items.filter((i) => i.ok)

  switch (by) {
    case 'score-asc':
      return successful.slice().sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))

    case 'score-desc':
      return successful.slice().sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))

    case 'issues-desc':
      return successful.slice().sort(
        (a, b) => (b.issueCount ?? 0) - (a.issueCount ?? 0),
      )

    case 'revenue-desc':
      return successful.slice().sort(
        (a, b) =>
          revenueKey(b) - revenueKey(a),
      )
  }
}

/**
 * Return the item with the highest estimated revenue loss.
 * Returns undefined if there are no successful items with revenue data.
 */
export function worstRevenueItem(
  result: BulkScanResult,
): BulkScanItemResult | undefined {
  return rankItems(result, 'revenue-desc')[0]
}

/**
 * Return the item with the lowest overall score.
 */
export function lowestScoreItem(
  result: BulkScanResult,
): BulkScanItemResult | undefined {
  return rankItems(result, 'score-asc')[0]
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function revenueKey(item: BulkScanItemResult): number {
  return item.revenueImpact?.revenueLossHigh ?? item.revenueImpact?.leadLossHigh ?? 0
}
