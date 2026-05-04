import { useEffect, useState, useCallback } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ScoreTrendChart } from '../../components/charts/ScoreTrendChart'
import type { TrendPoint } from '../../components/charts/ScoreTrendChart'
import type { SavedScanMeta } from '@engine/types/ipc'
import type { AuditResult } from '@engine/types/audit'
import { format } from 'date-fns'

// ─── Domain group ─────────────────────────────────────────────────────────────

interface DomainGroup {
  domain: string
  scans: SavedScanMeta[]          // newest-first
  latestScore: number
  latestScan: SavedScanMeta
  trendDelta: number | null       // latest - previous, null if only 1 scan
}

function groupByDomain(scans: SavedScanMeta[]): DomainGroup[] {
  const map = new Map<string, SavedScanMeta[]>()
  for (const s of scans) {
    const list = map.get(s.domain) ?? []
    list.push(s)
    map.set(s.domain, list)
  }

  const groups: DomainGroup[] = []
  for (const [domain, list] of map.entries()) {
    // newest-first for display
    const sorted = list.slice().sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
    const latestScan = sorted[0]
    const latestScore = latestScan.overallScore
    const trendDelta = sorted.length >= 2 ? latestScore - sorted[1].overallScore : null
    groups.push({ domain, scans: sorted, latestScore, latestScan, trendDelta })
  }

  // Sort by most recently scanned
  return groups.sort((a, b) => b.latestScan.scannedAt.localeCompare(a.latestScan.scannedAt))
}

function toTrendPoints(scans: SavedScanMeta[]): TrendPoint[] {
  // oldest-first for the chart x-axis
  return scans
    .slice()
    .sort((a, b) => a.scannedAt.localeCompare(b.scannedAt))
    .map((s) => ({
      scanId: s.id,
      scannedAt: s.scannedAt,
      score: s.overallScore,
      scanMode: s.scanMode,
    }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavedScansPage(): JSX.Element {
  const [scans, setScans] = useState<SavedScanMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  useEffect(() => {
    window.api.getSavedScans().then((s) => {
      setScans(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={styles.page}>
        <h2 style={styles.heading}>Saved Scans</h2>
        <div style={styles.loadingRow}>
          <div style={styles.spinner} />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading scan history…</span>
        </div>
      </div>
    )
  }

  const groups = groupByDomain(scans)

  if (groups.length === 0) {
    return (
      <div style={styles.page}>
        <h2 style={styles.heading}>Saved Scans</h2>
        <Card>
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📊</div>
            <p style={styles.emptyTitle}>No scans yet</p>
            <p style={styles.emptySub}>Run a scan from the Scanner or Market Discovery page and your results will appear here.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Saved Scans</h2>
        <span style={styles.countPill}>{groups.length} {groups.length === 1 ? 'domain' : 'domains'} · {scans.length} {scans.length === 1 ? 'scan' : 'scans'}</span>
      </div>

      {groups.map((g) => (
        <DomainCard
          key={g.domain}
          group={g}
          expanded={expandedDomain === g.domain}
          onToggle={() => setExpandedDomain(expandedDomain === g.domain ? null : g.domain)}
        />
      ))}
    </div>
  )
}

// ─── Domain card ──────────────────────────────────────────────────────────────

interface DomainCardProps {
  group: DomainGroup
  expanded: boolean
  onToggle: () => void
}

function DomainCard({ group, expanded, onToggle }: DomainCardProps): JSX.Element {
  const { domain, scans, latestScore, latestScan, trendDelta } = group
  const trendPoints = toTrendPoints(scans)
  const scoreColor = latestScore >= 80 ? 'var(--color-low)' : latestScore >= 60 ? 'var(--color-medium)' : 'var(--color-high)'

  const [compareScanId, setCompareScanId] = useState<string | null>(null)
  const [compareData, setCompareData] = useState<{ before: AuditResult; after: AuditResult } | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const handleCompare = useCallback(async (olderScanId: string) => {
    if (compareScanId === olderScanId) {
      setCompareScanId(null)
      setCompareData(null)
      return
    }
    setCompareScanId(olderScanId)
    setCompareLoading(true)
    try {
      const [before, after] = await Promise.all([
        window.api.loadScan(olderScanId),
        window.api.loadScan(latestScan.id),
      ])
      if (before && after) setCompareData({ before, after })
    } finally {
      setCompareLoading(false)
    }
  }, [compareScanId, latestScan.id])

  return (
    <Card style={styles.domainCard}>
      {/* ── Summary row ───────────────────────────────────────────────── */}
      <div style={styles.summaryRow} onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
      >
        <div style={styles.scoreCircle(scoreColor)}>
          {latestScore}
        </div>

        <div style={styles.domainInfo}>
          <div style={styles.domainName}>{domain}</div>
          <div style={styles.domainMeta}>
            {latestScan.businessType} · {latestScan.scanMode} scan · {format(new Date(latestScan.scannedAt), 'MMM d, yyyy')}
          </div>
        </div>

        <div style={styles.badges}>
          {trendDelta !== null && (
            <TrendBadge delta={trendDelta} />
          )}
          {scans.length > 1 && (
            <span style={styles.scanCount}>{scans.length} scans</span>
          )}
        </div>

        <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.api.openReport(latestScan.htmlPath)}
          >
            View Report
          </Button>
        </div>

        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* ── Expanded: trend chart + scan history ─────────────────────── */}
      {expanded && (
        <div style={styles.expandedBody}>
          {scans.length >= 2 && (
            <div style={styles.chartSection}>
              <div style={styles.sectionLabel}>Score trend</div>
              <ScoreTrendChart points={trendPoints} />
            </div>
          )}

          <div style={styles.scanList}>
            <div style={styles.sectionLabel}>Scan history</div>
            {scans.map((s, i) => (
              <ScanRow
                key={s.id}
                scan={s}
                isLatest={i === 0}
                canCompare={i > 0}
                isComparing={compareScanId === s.id}
                onCompare={() => handleCompare(s.id)}
              />
            ))}
          </div>

          {/* Before/After comparison panel */}
          {compareLoading && (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>
              Loading comparison…
            </div>
          )}
          {compareData && !compareLoading && (
            <ComparePanel
              before={compareData.before}
              after={compareData.after}
              onClose={() => { setCompareScanId(null); setCompareData(null) }}
            />
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Scan row (inside expanded domain card) ───────────────────────────────────

interface ScanRowProps {
  scan: SavedScanMeta
  isLatest: boolean
  canCompare?: boolean
  isComparing?: boolean
  onCompare?: () => void
}

function ScanRow({ scan, isLatest, canCompare, isComparing, onCompare }: ScanRowProps): JSX.Element {
  const scoreColor = scan.overallScore >= 80 ? 'var(--color-low)' : scan.overallScore >= 60 ? 'var(--color-medium)' : 'var(--color-high)'

  return (
    <div style={scanRowStyles.row}>
      <span style={{ ...scanRowStyles.score, color: scoreColor }}>{scan.overallScore}</span>
      <div style={scanRowStyles.info}>
        <span style={scanRowStyles.date}>{format(new Date(scan.scannedAt), 'MMM d, yyyy — h:mm a')}</span>
        <span style={scanRowStyles.mode}>{scan.scanMode}</span>
        {isLatest && <span style={scanRowStyles.latestBadge}>latest</span>}
      </div>
      <div style={scanRowStyles.rowActions}>
        {canCompare && (
          <Button
            size="sm"
            variant={isComparing ? 'primary' : 'ghost'}
            onClick={onCompare}
          >
            {isComparing ? 'Hide diff' : 'vs latest'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => window.api.openReport(scan.htmlPath)}>
          Report
        </Button>
      </div>
    </div>
  )
}

// ─── Before/After comparison panel ───────────────────────────────────────────

interface ComparePanelProps {
  before: AuditResult
  after: AuditResult
  onClose: () => void
}

function ComparePanel({ before, after, onClose }: ComparePanelProps): JSX.Element {
  const cats = ['localSeo', 'technical', 'conversion', 'content', 'trust'] as const
  const catLabels: Record<string, string> = {
    localSeo: 'Local SEO', technical: 'Technical', conversion: 'Conversion',
    content: 'Content', trust: 'Trust',
  }

  const overallDelta = after.scores.overall.value - before.scores.overall.value
  const deltaColor = (d: number) => d > 0 ? '#16a34a' : d < 0 ? '#dc2626' : '#6b7280'
  const deltaStr = (d: number) => d > 0 ? `+${d}` : `${d}`

  // Finding diff by ID
  const beforeIds = new Set(before.findings.map((f) => f.id))
  const afterIds  = new Set(after.findings.map((f) => f.id))
  const fixed   = before.findings.filter((f) => !afterIds.has(f.id))
  const newIssues = after.findings.filter((f) => !beforeIds.has(f.id))

  return (
    <div style={compareStyles.panel}>
      <div style={compareStyles.header}>
        <span style={compareStyles.title}>
          Before vs After — {format(new Date(before.scannedAt), 'MMM d, yyyy')} → {format(new Date(after.scannedAt), 'MMM d, yyyy')}
        </span>
        <Button size="sm" variant="ghost" onClick={onClose}>✕ Close</Button>
      </div>

      {/* Overall score delta */}
      <div style={compareStyles.overallRow}>
        <span style={compareStyles.overallLabel}>Overall score</span>
        <span style={compareStyles.overallBefore}>{before.scores.overall.value}</span>
        <span style={compareStyles.arrow}>→</span>
        <span style={compareStyles.overallAfter}>{after.scores.overall.value}</span>
        <span style={{ ...compareStyles.delta, color: deltaColor(overallDelta) }}>
          {deltaStr(overallDelta)} pts
        </span>
      </div>

      {/* Category scores */}
      <table style={compareStyles.table}>
        <thead>
          <tr>
            <th style={compareStyles.th}>Category</th>
            <th style={compareStyles.th}>Before</th>
            <th style={compareStyles.th}>After</th>
            <th style={compareStyles.th}>Change</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => {
            const d = after.scores[cat].value - before.scores[cat].value
            return (
              <tr key={cat}>
                <td style={compareStyles.td}>{catLabels[cat]}</td>
                <td style={compareStyles.td}>{before.scores[cat].value}</td>
                <td style={compareStyles.td}>{after.scores[cat].value}</td>
                <td style={{ ...compareStyles.td, fontWeight: 600, color: deltaColor(d) }}>{d !== 0 ? deltaStr(d) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Fixed issues */}
      {fixed.length > 0 && (
        <div style={compareStyles.issueGroup}>
          <div style={{ ...compareStyles.issueGroupLabel, color: '#16a34a' }}>
            ✓ {fixed.length} issue{fixed.length !== 1 ? 's' : ''} fixed
          </div>
          {fixed.map((f) => (
            <div key={f.id} style={compareStyles.issueRow}>
              <span style={compareStyles.issueFixed}>FIXED</span>
              <span style={compareStyles.issueTitle}>{f.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* New issues */}
      {newIssues.length > 0 && (
        <div style={compareStyles.issueGroup}>
          <div style={{ ...compareStyles.issueGroupLabel, color: '#dc2626' }}>
            ✗ {newIssues.length} new issue{newIssues.length !== 1 ? 's' : ''}
          </div>
          {newIssues.map((f) => (
            <div key={f.id} style={compareStyles.issueRow}>
              <span style={compareStyles.issueNew}>NEW</span>
              <span style={compareStyles.issueTitle}>{f.title}</span>
            </div>
          ))}
        </div>
      )}

      {fixed.length === 0 && newIssues.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}>
          No finding changes between these two scans.
        </div>
      )}
    </div>
  )
}

const compareStyles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' },
  overallRow: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    padding: '10px 0', borderBottom: '1px solid var(--color-border)',
  },
  overallLabel: { fontSize: 13, color: 'var(--color-text-muted)', flex: 1 },
  overallBefore: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-muted)' },
  arrow: { fontSize: 14, color: 'var(--color-text-muted)' },
  overallAfter: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' },
  delta: { fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right' as const },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' as const, borderBottom: '1px solid var(--color-border)' },
  td: { padding: '6px 8px', borderBottom: '1px solid var(--color-bg-elevated)' },
  issueGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  issueGroupLabel: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  issueRow: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  issueFixed: { fontSize: 10, fontWeight: 700, color: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 2 },
  issueNew: { fontSize: 10, fontWeight: 700, color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 2 },
  issueTitle: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 },
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ delta }: { delta: number }): JSX.Element {
  if (delta === 0) return <span style={trendStyles.neutral}>→ No change</span>
  if (delta > 0) return <span style={trendStyles.up}>▲ +{delta}</span>
  return <span style={trendStyles.down}>▼ {delta}</span>
}

const trendStyles: Record<string, React.CSSProperties> = {
  up: { fontSize: 12, fontWeight: 600, color: 'var(--color-low)', backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 12 },
  down: { fontSize: 12, fontWeight: 600, color: 'var(--color-high)', backgroundColor: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: 12 },
  neutral: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', padding: '2px 8px', borderRadius: 12 },
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' } as React.CSSProperties,
  headerRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' } as React.CSSProperties,
  heading: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 } as React.CSSProperties,
  countPill: {
    fontSize: 12, color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    padding: '2px 10px', borderRadius: 12,
  } as React.CSSProperties,
  loadingRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-8)' } as React.CSSProperties,
  spinner: {
    width: 20, height: 20,
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-brand)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-10) var(--space-6)', textAlign: 'center' } as React.CSSProperties,
  emptyIcon: { fontSize: 36, marginBottom: 'var(--space-2)' } as React.CSSProperties,
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 } as React.CSSProperties,
  emptySub: { fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 380, margin: 0 } as React.CSSProperties,
  domainCard: { display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' } as React.CSSProperties,
  summaryRow: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    padding: 'var(--space-4)', cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  } as React.CSSProperties,
  scoreCircle: (color: string): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color,
    border: `2px solid ${color}`,
    flexShrink: 0,
  }),
  domainInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,
  domainName: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' } as React.CSSProperties,
  domainMeta: { fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 } as React.CSSProperties,
  badges: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 } as React.CSSProperties,
  scanCount: { fontSize: 12, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 12 } as React.CSSProperties,
  actions: { flexShrink: 0 } as React.CSSProperties,
  chevron: { fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 } as React.CSSProperties,
  expandedBody: {
    borderTop: '1px solid var(--color-border)',
    padding: 'var(--space-5)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
  } as React.CSSProperties,
  chartSection: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' } as React.CSSProperties,
  scanList: { display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' } as React.CSSProperties,
  sectionLabel: { fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' } as React.CSSProperties,
}

const scanRowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    padding: '6px 0', borderBottom: '1px solid var(--color-border)',
  },
  score: { fontSize: 15, fontWeight: 700, width: 32, textAlign: 'center', flexShrink: 0 },
  info: { flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' },
  date: { fontSize: 12, color: 'var(--color-text-secondary)' },
  mode: { fontSize: 11, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', padding: '1px 6px', borderRadius: 8 },
  latestBadge: { fontSize: 11, fontWeight: 600, color: 'var(--color-brand)', backgroundColor: 'var(--color-brand-light)', padding: '1px 6px', borderRadius: 8 },
  rowActions: { flexShrink: 0 },
}
