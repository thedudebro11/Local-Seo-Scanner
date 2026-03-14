/**
 * Bulk scan data model — Phase 13.
 *
 * Pure TypeScript interfaces — no runtime imports.
 */

import type { ScanMode, BusinessType } from '../types/audit'

// ─── Request ─────────────────────────────────────────────────────────────────

export interface BulkScanRequest {
  /** Raw domain/URL strings entered by the user — normalized before scanning. */
  domains: string[]
  scanMode: ScanMode
  /** Applied to every domain in the batch. Defaults to 'auto' if omitted. */
  businessType?: BusinessType
  /** Max pages per domain. Defaults to mode default if omitted. */
  maxPages?: number
}

// ─── Per-site result ──────────────────────────────────────────────────────────

export interface BulkScanItemResult {
  domain: string
  /** true = scan completed without a thrown error */
  ok: boolean
  overallScore?: number
  scoreLabel?: string
  issueCount?: number
  highPriorityIssueCount?: number
  revenueImpact?: {
    leadLossLow?: number
    leadLossHigh?: number
    revenueLossLow?: number
    revenueLossHigh?: number
  }
  confidence?: {
    level: 'High' | 'Medium' | 'Low'
    reason: string
  }
  reportPaths?: {
    htmlPath?: string
    jsonPath?: string
  }
  /** Error message when ok === false */
  error?: string
}

// ─── Batch result ─────────────────────────────────────────────────────────────

export interface BulkScanResult {
  batchId: string
  startedAt: string
  completedAt?: string
  totalDomains: number
  successfulScans: number
  failedScans: number
  items: BulkScanItemResult[]
}

// ─── Progress event ───────────────────────────────────────────────────────────

/** Emitted by runBulkScan and forwarded to the renderer over IPC. */
export interface BulkScanProgressEvent {
  batchId: string
  domain: string
  /** 0-based index of the domain currently being scanned. */
  domainIndex: number
  totalDomains: number
  /** Pipeline step message for the current domain (e.g. "Crawling pages…"). */
  domainStep: string
  /** Percent complete for the current domain (0–100). */
  domainPercent: number
  /** Overall batch progress (0–100). */
  batchPercent: number
}
