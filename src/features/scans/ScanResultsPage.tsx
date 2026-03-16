/**
 * Single-site interactive report dashboard — Phase 16.
 *
 * Replaces the flat scrollable layout with a tabbed dashboard:
 *   Overview  |  Findings  |  Opportunities  |  Performance  |  Export
 *
 * Also wires up disk loading: if the scan ID is not in memory,
 * loadScan() is called and the result is injected into the store.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ScoreOverview } from '../../components/scan/ScoreOverview'
import { IssueList } from '../../components/scan/IssueList'
import { QuickWins } from '../../components/scan/QuickWins'
import { ReportActions } from '../../components/reports/ReportActions'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TabNav } from '../../components/dashboard/TabNav'
import { RevenueImpactCard } from '../../components/dashboard/RevenueImpactCard'
import { OpportunityList } from '../../components/dashboard/OpportunityList'
import { RoadmapList } from '../../components/dashboard/RoadmapList'
import { LighthouseCard } from '../../components/dashboard/LighthouseCard'
import { useScanStore } from './state/useScanStore'
import { format } from 'date-fns'
import type { CrawledPage } from '@engine/types/audit'

type TabId = 'overview' | 'findings' | 'opportunities' | 'performance' | 'export'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanResultsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(false)

  const latestResult = useScanStore((s) => s.latestResult)
  const setResult    = useScanStore((s) => s.setResult)

  // Load from disk when result is not in memory
  useEffect(() => {
    if (!id) return
    if (latestResult?.id === id) return

    setLoading(true)
    window.api.loadScan(id).then((loaded) => {
      if (loaded) setResult(loaded)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id, latestResult, setResult])

  const result = latestResult?.id === id ? latestResult : null

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading scan result…</p>
        </div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!result) {
    return (
      <div style={styles.page}>
        <EmptyState
          icon="◌"
          title="Scan result not found"
          description={
            id
              ? `No result found for scan "${id}". The report may have been deleted, or the session was restarted.`
              : 'No scan ID provided.'
          }
          action={
            <Button variant="primary" onClick={() => navigate('/scan/new')}>
              Run a New Scan
            </Button>
          }
        />
      </div>
    )
  }

  // ── Build tab definitions ──────────────────────────────────────────────────

  const findingCount      = result.findings.length
  const opportunityCount  = (result.seoOpportunities?.length ?? 0) + (result.roadmap?.length ?? 0)

  const tabs = [
    { id: 'overview'      as TabId, label: 'Overview' },
    { id: 'findings'      as TabId, label: 'Findings',      count: findingCount },
    { id: 'opportunities' as TabId, label: 'Opportunities', count: opportunityCount },
    { id: 'performance'   as TabId, label: 'Performance' },
    { id: 'export'        as TabId, label: 'Export' },
  ]

  const scannedAt = format(new Date(result.scannedAt), 'MMM d, yyyy — h:mm a')

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.pageHeader}>
        <div style={styles.resultMeta}>
          <h2 style={styles.domain}>{result.domain}</h2>
          <div style={styles.metaRow}>
            <span style={styles.metaBadge}>{result.request.scanMode} scan</span>
            <span style={styles.metaBadge}>{result.detectedBusinessType}</span>
            {result.scoreConfidence && (
              <span style={{
                ...styles.metaBadge,
                color: result.scoreConfidence.level === 'High' ? '#34d399'
                     : result.scoreConfidence.level === 'Medium' ? '#facc15' : '#f87171',
              }}>
                {result.scoreConfidence.level} confidence
              </span>
            )}
            <span style={styles.metaTime}>{scannedAt}</span>
          </div>
        </div>
        <Link to="/scan/new" style={styles.backLink}>← New Scan</Link>
      </div>

      {/* ── Tab navigation ── */}
      <TabNav tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {/* ── Tab content ── */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab result={result} />
        )}
        {activeTab === 'findings' && (
          <IssueList findings={result.findings} />
        )}
        {activeTab === 'opportunities' && (
          <OpportunitiesTab result={result} />
        )}
        {activeTab === 'performance' && (
          <LighthouseCard lighthouse={result.lighthouse} visual={result.visual} />
        )}
        {activeTab === 'export' && (
          <ExportTab result={result} />
        )}
      </div>
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: NonNullable<ReturnType<typeof useScanStore.getState>['latestResult']> }): JSX.Element {
  return (
    <div style={tabStyles.wrapper}>
      {/* Score cards */}
      <ScoreOverview scores={result.scores} domain={result.domain} />

      {/* Confidence note */}
      {result.scoreConfidence && (
        <Card>
          <div style={tabStyles.confidenceRow}>
            <span style={tabStyles.confidenceIcon}>
              {result.scoreConfidence.level === 'High' ? '◉' : result.scoreConfidence.level === 'Medium' ? '◎' : '○'}
            </span>
            <div>
              <span style={tabStyles.confidenceLabel}>Score Confidence: </span>
              <span style={{
                ...tabStyles.confidenceLevel,
                color: result.scoreConfidence.level === 'High' ? '#34d399'
                     : result.scoreConfidence.level === 'Medium' ? '#facc15' : '#f87171',
              }}>
                {result.scoreConfidence.level}
              </span>
              <p style={tabStyles.confidenceReason}>{result.scoreConfidence.reason}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Revenue impact */}
      {result.revenueImpact && (
        <RevenueImpactCard impact={result.revenueImpact} />
      )}

      {/* Quick wins & money leaks */}
      {(result.quickWins.length > 0 || result.moneyLeaks.length > 0) && (
        <QuickWins quickWins={result.quickWins} moneyLeaks={result.moneyLeaks} />
      )}

      {/* Competitor summary */}
      {result.competitor && result.competitor.gaps.length > 0 && (
        <CompetitorSummary gaps={result.competitor.gaps} />
      )}
    </div>
  )
}

// ─── Opportunities tab ────────────────────────────────────────────────────────

function OpportunitiesTab({ result }: { result: NonNullable<ReturnType<typeof useScanStore.getState>['latestResult']> }): JSX.Element {
  const hasOpportunities = result.seoOpportunities && result.seoOpportunities.length > 0
  const hasRoadmap = result.roadmap && result.roadmap.length > 0

  if (!hasOpportunities && !hasRoadmap) {
    return (
      <div style={tabStyles.emptyTab}>
        <span style={tabStyles.emptyIcon}>✦</span>
        <p style={tabStyles.emptyTitle}>No opportunities or roadmap data</p>
        <p style={tabStyles.emptyHint}>
          Run a full scan with competitor URLs to generate SEO opportunities and a priority fix roadmap.
        </p>
      </div>
    )
  }

  return (
    <div style={tabStyles.wrapper}>
      {hasOpportunities && (
        <section>
          <h3 style={tabStyles.sectionTitle}>
            SEO Growth Opportunities
            <span style={tabStyles.sectionCount}>{result.seoOpportunities!.length}</span>
          </h3>
          <OpportunityList opportunities={result.seoOpportunities!} />
        </section>
      )}

      {hasRoadmap && (
        <section>
          <h3 style={tabStyles.sectionTitle}>
            Priority Fix Roadmap
            <span style={tabStyles.sectionCount}>{result.roadmap!.length} actions</span>
          </h3>
          <RoadmapList items={result.roadmap!} />
        </section>
      )}
    </div>
  )
}

// ─── Export tab ───────────────────────────────────────────────────────────────

function ExportTab({ result }: { result: NonNullable<ReturnType<typeof useScanStore.getState>['latestResult']> }): JSX.Element {
  return (
    <div style={tabStyles.wrapper}>
      <ReportActions result={result} onNewScan={() => {}} />

      {result.pages.length > 0 && (
        <PageInventory pages={result.pages} />
      )}
    </div>
  )
}

// ─── Competitor summary ───────────────────────────────────────────────────────

import type { CompetitorGap } from '@engine/types/audit'

function CompetitorSummary({ gaps }: { gaps: CompetitorGap[] }): JSX.Element {
  return (
    <Card>
      <div style={compStyles.header}>
        <span style={compStyles.title}>Competitor Gaps</span>
        <span style={compStyles.count}>{gaps.length} gap{gaps.length !== 1 ? 's' : ''} identified</span>
      </div>
      <div style={compStyles.gapList}>
        {gaps.slice(0, 5).map((gap) => (
          <div key={gap.id} style={compStyles.gapRow}>
            <div style={compStyles.gapLeft}>
              <span style={compStyles.gapTitle}>{gap.title}</span>
              <span style={compStyles.gapDesc}>{gap.description}</span>
            </div>
            {gap.competitorDomains.length > 0 && (
              <span style={compStyles.gapCompetitors}>
                {gap.competitorDomains.slice(0, 2).join(', ')}
                {gap.competitorDomains.length > 2 ? ` +${gap.competitorDomains.length - 2}` : ''}
              </span>
            )}
          </div>
        ))}
        {gaps.length > 5 && (
          <p style={compStyles.more}>+{gaps.length - 5} more gaps — see full report</p>
        )}
      </div>
    </Card>
  )
}

// ─── Page inventory ───────────────────────────────────────────────────────────

function PageInventory({ pages }: { pages: CrawledPage[] }): JSX.Element {
  return (
    <Card>
      <h3 style={piStyles.title}>Page Inventory <span style={piStyles.count}>({pages.length})</span></h3>
      <div style={piStyles.table}>
        <div style={piStyles.header}>
          <span style={{ flex: 2 }}>URL</span>
          <span style={{ width: 80, textAlign: 'center' as const }}>Type</span>
          <span style={{ width: 60, textAlign: 'center' as const }}>Status</span>
        </div>
        {pages.map((p) => (
          <div key={p.url} style={piStyles.row}>
            <span style={{ ...piStyles.url, flex: 2 }}>{p.url}</span>
            <span style={{ width: 80, textAlign: 'center' as const, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' as const }}>
              {p.pageType}
            </span>
            <span style={{
              width: 60,
              textAlign: 'center' as const,
              fontSize: 12,
              color: p.statusCode === 200 ? 'var(--color-score-strong)' : '#f87171',
            }}>
              {p.statusCode}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    maxWidth: 960,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  resultMeta: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  domain: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    margin: 0,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 99,
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    textTransform: 'capitalize',
  },
  metaTime: { fontSize: 12, color: 'var(--color-text-muted)' },
  backLink: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    flexShrink: 0,
    marginTop: 4,
  },
  tabContent: {
    paddingTop: 'var(--space-2)',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-brand)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: 13, color: 'var(--color-text-secondary)' },
}

const tabStyles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 99,
    padding: '1px 7px',
  },
  confidenceRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
  },
  confidenceIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  confidenceLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' },
  confidenceLevel: { fontSize: 13, fontWeight: 700 },
  confidenceReason: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginTop: 3,
    lineHeight: 1.5,
  },
  emptyTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: 28, opacity: 0.3 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' },
  emptyHint: { fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.6 },
}

const compStyles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' },
  count: { fontSize: 12, color: 'var(--color-text-muted)' },
  gapList: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  gapRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
    paddingBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-border)',
  },
  gapLeft: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  gapTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  gapDesc: { fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  gapCompetitors: { fontSize: 11, color: '#facc15', flexShrink: 0, fontFamily: 'var(--font-mono)' },
  more: { fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 },
}

const piStyles: Record<string, React.CSSProperties> = {
  title: { fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' },
  count: { fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 13 },
  table: { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  header: {
    display: 'flex',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-bg-raised)',
    borderBottom: '1px solid var(--color-border)',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    alignItems: 'center',
  },
  url: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
