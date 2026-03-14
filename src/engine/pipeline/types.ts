/**
 * Pipeline types.
 *
 * ScanJobContext — the single mutable accumulator threaded through every stage.
 * Stages read from it and write to it; the orchestrator owns its lifecycle.
 *
 * ScanStageResult — lightweight envelope returned by each stage so the
 * orchestrator can decide whether to abort (required stages) or continue
 * (optional stages).
 */

import type { Browser } from 'playwright'
import type {
  AuditRequest,
  AuditResult,
  AuditScores,
  BusinessType,
  CategoryScore,
  CrawledPage,
  CompetitorAnalysisResult,
  Finding,
  FixRoadmapItem,
  LighthouseMetrics,
  OpportunityItem,
  RevenueImpactEstimate,
  ScoreConfidence,
  VisualAnalysisResult,
} from '../types/audit'
import type { FetchHtmlResult } from '../crawl/fetchHtml'

// ─── Stage names ──────────────────────────────────────────────────────────────

export type ScanStageName =
  | 'validate'
  | 'crawl'
  | 'extract'
  | 'analysis'
  | 'visual'
  | 'impact'
  | 'score'
  | 'competitor'
  | 'confidence'
  | 'roadmap'
  | 'revenue'
  | 'opportunity'
  | 'report'
  | 'complete'

// ─── Stage result wrapper ─────────────────────────────────────────────────────

export interface ScanStageResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

// ─── Shared job context ───────────────────────────────────────────────────────

/**
 * All state accumulated as the pipeline runs.
 * Initialised by createScanJobContext(), then enriched by each stage in order.
 *
 * Fields are typed non-optional where guaranteed by the time that stage runs,
 * and optional where the preceding stage may not have produced them.
 */
export interface ScanJobContext {
  // ── Input (set at construction) ───────────────────────────────────────────
  readonly request: AuditRequest
  readonly startedAt: string

  // ── validate stage ────────────────────────────────────────────────────────
  scanId: string
  normalizedUrl: string
  domain: string

  // ── Browser lifecycle (managed by orchestrator, opened in crawlStage) ─────
  browser?: Browser
  /** Chromium executable path — stored for Lighthouse's separate process. */
  chromiumPath?: string

  // ── crawl stage ───────────────────────────────────────────────────────────
  rawPages: FetchHtmlResult[]
  robotsFound: boolean
  sitemapFound: boolean

  // ── extract stage ─────────────────────────────────────────────────────────
  pages: CrawledPage[]
  detectedBusinessType: Exclude<BusinessType, 'auto'>

  // ── analysis stage ────────────────────────────────────────────────────────
  categoryFindings: {
    technical: Finding[]
    localSeo: Finding[]
    conversion: Finding[]
    content: Finding[]
    trust: Finding[]
  }
  /** Merged findings from all analyzers. Appended to by visual + impact stages. */
  allFindings: Finding[]

  // ── visual stage (optional) ───────────────────────────────────────────────
  visualResult?: VisualAnalysisResult
  screenshotPaths: Record<string, string>

  // ── impact stage ──────────────────────────────────────────────────────────
  lighthouseMetrics: LighthouseMetrics[]

  // ── score stage ───────────────────────────────────────────────────────────
  scores: AuditScores
  quickWins: string[]
  moneyLeaks: string[]

  // ── optional stage outputs ────────────────────────────────────────────────
  competitorResult?: CompetitorAnalysisResult
  scoreConfidence?: ScoreConfidence
  roadmap?: FixRoadmapItem[]
  revenueImpact?: RevenueImpactEstimate
  seoOpportunities?: OpportunityItem[]

  // ── report stage ──────────────────────────────────────────────────────────
  artifacts: AuditResult['artifacts']
}

// ─── Context factory ──────────────────────────────────────────────────────────

export function createScanJobContext(request: AuditRequest): ScanJobContext {
  return {
    request,
    startedAt: new Date().toISOString(),
    // Populated by validateStage
    scanId: '',
    normalizedUrl: '',
    domain: '',
    // Populated by crawlStage
    rawPages: [],
    robotsFound: false,
    sitemapFound: false,
    screenshotPaths: {},
    // Populated by extractStage
    pages: [],
    detectedBusinessType: request.businessType !== 'auto' ? request.businessType : 'other',
    // Populated by analysisStage
    categoryFindings: { technical: [], localSeo: [], conversion: [], content: [], trust: [] },
    allFindings: [],
    // Populated by impactStage
    lighthouseMetrics: [],
    // Populated by scoreStage
    scores: buildPlaceholderScores(),
    quickWins: [],
    moneyLeaks: [],
    // Populated by reportStage
    artifacts: {},
  }
}

// ─── Progress emitter type ────────────────────────────────────────────────────

export type PipelineProgressEmitter = (step: string, percent: number, message?: string) => void

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildPlaceholderScores(): AuditScores {
  const make = (): CategoryScore => ({ value: 0, label: 'Leaking Opportunity', rationale: [] })
  return {
    technical: make(),
    localSeo: make(),
    conversion: make(),
    content: make(),
    trust: make(),
    overall: make(),
  }
}
