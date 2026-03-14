import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useBulkScanStore } from '../bulk/useBulkScanStore'
import type { MarketDashboard, MarketDashboardBusiness } from '@engine/market/marketTypes'
import type { MarketSortKey } from '@engine/market/marketRanking'

type PagePhase = 'ready' | 'building' | 'done' | 'error'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketDashboardPage(): JSX.Element {
  const bulk = useBulkScanStore()
  const [phase, setPhase] = useState<PagePhase>('ready')
  const [label, setLabel] = useState('')
  const [dashboard, setDashboard] = useState<MarketDashboard | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasBulkResult = bulk.phase === 'done' && bulk.result != null

  async function handleBuild(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!bulk.result) return
    setPhase('building')
    setErrorMsg(null)
    try {
      const result = await window.api.buildMarketDashboard({
        bulkResult: bulk.result,
        label: label.trim() || undefined,
      })
      setDashboard(result)
      setPhase('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  function handleReset(): void {
    setPhase('ready')
    setDashboard(null)
    setErrorMsg(null)
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Market Intelligence</h2>
        <p style={styles.subtitle}>
          Aggregate insights from a bulk scan — identify top performers, weakest sites, and the best
          outreach targets.
        </p>
      </div>

      {phase === 'ready' && (
        hasBulkResult ? (
          <BuildForm
            batchId={bulk.result!.batchId}
            totalDomains={bulk.result!.totalDomains}
            successfulScans={bulk.result!.successfulScans}
            label={label}
            onLabelChange={setLabel}
            onSubmit={handleBuild}
          />
        ) : (
          <Card>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⊡</div>
              <p style={styles.emptyTitle}>No bulk scan available</p>
              <p style={styles.emptyHint}>
                Run a Bulk Scan or Market Discovery scan first, then come back here to build the
                market intelligence report.
              </p>
            </div>
          </Card>
        )
      )}

      {phase === 'building' && (
        <Card>
          <div style={styles.building}>
            <div style={styles.spinner} />
            <p style={styles.buildingText}>Building market dashboard…</p>
            <p style={styles.buildingHint}>
              Loading individual scan reports for deeper insights. This takes a few seconds.
            </p>
          </div>
        </Card>
      )}

      {phase === 'error' && (
        <Card>
          <p style={{ color: '#f87171', marginBottom: 12 }}>{errorMsg}</p>
          <Button size="sm" onClick={handleReset}>Try Again</Button>
        </Card>
      )}

      {phase === 'done' && dashboard && (
        <DashboardView dashboard={dashboard} onReset={handleReset} />
      )}
    </div>
  )
}

// ─── Build form ───────────────────────────────────────────────────────────────

interface BuildFormProps {
  batchId: string
  totalDomains: number
  successfulScans: number
  label: string
  onLabelChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

function BuildForm(p: BuildFormProps): JSX.Element {
  return (
    <Card>
      <form onSubmit={p.onSubmit} style={formStyles.form}>
        <div style={formStyles.batchInfo}>
          <span style={formStyles.batchLabel}>Bulk scan batch</span>
          <span style={formStyles.batchId}>{p.batchId}</span>
          <span style={formStyles.batchStats}>
            {p.successfulScans}/{p.totalDomains} sites scanned successfully
          </span>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label}>
            Market label <span style={formStyles.optional}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Plumbers in Austin TX"
            value={p.label}
            onChange={(e) => p.onLabelChange(e.target.value)}
            style={formStyles.input}
          />
        </div>

        <div style={formStyles.submitRow}>
          <Button type="submit" size="lg">Build Market Dashboard</Button>
          <span style={formStyles.submitHint}>
            Loads individual scan reports to enrich the comparison.
          </span>
        </div>
      </form>
    </Card>
  )
}

// ─── Dashboard view ───────────────────────────────────────────────────────────

function DashboardView({ dashboard, onReset }: { dashboard: MarketDashboard; onReset: () => void }): JSX.Element {
  const [sortKey, setSortKey] = useState<MarketSortKey>('score-desc')
  const [monitoringAdded, setMonitoringAdded] = useState<Set<string>>(new Set())

  const { summary } = dashboard

  async function handleAddMonitoring(domain: string): Promise<void> {
    try {
      await window.api.addMonitoredSite(domain)
      setMonitoringAdded(prev => new Set([...prev, domain]))
    } catch {
      // silent — monitoring add is best-effort
    }
  }

  const sortedAll = sortBusinesses(dashboard.allBusinesses, sortKey)

  return (
    <div style={styles.dashboardWrap}>
      {/* Header bar */}
      <Card>
        <div style={dashStyles.headerRow}>
          <div>
            <div style={dashStyles.marketLabel}>{dashboard.marketLabel}</div>
            <div style={dashStyles.generatedAt}>
              Generated {new Date(dashboard.generatedAt).toLocaleString()}
            </div>
          </div>
          <Button size="sm" onClick={onReset}>New Dashboard</Button>
        </div>
      </Card>

      {/* Summary stats */}
      <Card>
        <div style={dashStyles.statsGrid}>
          <Stat label="Total Sites" value={summary.totalBusinesses} />
          <Stat label="Scanned OK" value={summary.scannedSuccessfully} color="#34d399" />
          <Stat label="Avg Score" value={summary.averageScore} color={scoreHex(summary.averageScore)} />
          <Stat label="Highest" value={summary.highestScore} color="#34d399" />
          <Stat label="Lowest" value={summary.lowestScore} color={scoreHex(summary.lowestScore)} />
          <Stat label="Score < 70" value={summary.sitesBelow70} color={summary.sitesBelow70 > 0 ? '#facc15' : undefined} />
          <Stat label="Score < 55" value={summary.sitesBelow55} color={summary.sitesBelow55 > 0 ? '#f87171' : undefined} />
          <Stat
            label="Est. Revenue Leak"
            value={summary.totalEstimatedRevenueLeak > 0 ? `$${summary.totalEstimatedRevenueLeak.toLocaleString()}/mo` : '—'}
            color={summary.totalEstimatedRevenueLeak > 0 ? '#f87171' : undefined}
          />
        </div>
      </Card>

      {/* Quadrant cards */}
      <div style={dashStyles.quadrant}>
        <QuadrantCard title="Top Performers" items={dashboard.topPerformers} onOpen={openReport} onMonitor={handleAddMonitoring} monitoringAdded={monitoringAdded} />
        <QuadrantCard title="Weakest Sites" items={dashboard.weakestSites} onOpen={openReport} onMonitor={handleAddMonitoring} monitoringAdded={monitoringAdded} />
      </div>
      <div style={dashStyles.quadrant}>
        <QuadrantCard title="Highest Revenue Leak" items={dashboard.highestRevenueLeakSites} showRevenue onOpen={openReport} onMonitor={handleAddMonitoring} monitoringAdded={monitoringAdded} />
        <QuadrantCard title="Best Outreach Targets" items={dashboard.bestOpportunityTargets} showOutreach onOpen={openReport} onMonitor={handleAddMonitoring} monitoringAdded={monitoringAdded} />
      </div>

      {/* Full comparison table */}
      <Card>
        <div style={dashStyles.tableHeaderRow}>
          <div style={dashStyles.tableTitle}>All Businesses</div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MarketSortKey)}
            style={dashStyles.sortSelect}
          >
            <option value="score-desc">Sort: Score ↓</option>
            <option value="score-asc">Sort: Score ↑</option>
            <option value="revenue-desc">Sort: Revenue Leak ↓</option>
            <option value="outreach-desc">Sort: Outreach Score ↓</option>
            <option value="issues-desc">Sort: Issues ↓</option>
          </select>
        </div>
        <div style={dashStyles.tableWrap}>
          <table style={dashStyles.table}>
            <thead>
              <tr>
                {['Domain', 'Score', 'Issues', 'HP', 'Confidence', 'Revenue Leak', 'Biggest Problem', 'Outreach', 'Actions'].map((h) => (
                  <th key={h} style={dashStyles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAll.map((b) => (
                <tr key={b.domain} style={dashStyles.tr}>
                  <td style={dashStyles.td}>
                    <strong>{b.domain}</strong>
                    {!b.ok && <span style={dashStyles.failBadge}>failed</span>}
                  </td>
                  <td style={{ ...dashStyles.td, color: b.overallScore != null ? scoreHex(b.overallScore) : undefined, fontWeight: 700 }}>
                    {b.overallScore ?? '—'}
                  </td>
                  <td style={dashStyles.td}>{b.issueCount ?? '—'}</td>
                  <td style={{ ...dashStyles.td, color: (b.highPriorityIssueCount ?? 0) > 0 ? '#f87171' : undefined }}>
                    {b.highPriorityIssueCount ?? '—'}
                  </td>
                  <td style={{ ...dashStyles.td, color: b.confidenceLevel ? confColor(b.confidenceLevel) : undefined }}>
                    {b.confidenceLevel ?? '—'}
                  </td>
                  <td style={dashStyles.td}>
                    {b.estimatedRevenueLossHigh != null
                      ? `$${(b.estimatedRevenueLossLow ?? 0).toLocaleString()}–$${b.estimatedRevenueLossHigh.toLocaleString()}/mo`
                      : '—'}
                  </td>
                  <td style={{ ...dashStyles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.biggestProblem ?? '—'}
                  </td>
                  <td style={{ ...dashStyles.td, fontWeight: 700, color: b.outreachScore >= 6 ? '#f87171' : b.outreachScore >= 4 ? '#facc15' : undefined }}>
                    {b.outreachScore}
                  </td>
                  <td style={dashStyles.td}>
                    <div style={dashStyles.actions}>
                      {b.reportPaths?.htmlPath && (
                        <button style={dashStyles.actionBtn} onClick={() => openReport(b.reportPaths!.htmlPath!)}>
                          Open
                        </button>
                      )}
                      {b.ok && (
                        monitoringAdded.has(b.domain) ? (
                          <span style={dashStyles.monitoredBadge}>Tracked</span>
                        ) : (
                          <button style={dashStyles.monitorBtn} onClick={() => handleAddMonitoring(b.domain)}>
                            + Monitor
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Quadrant card ────────────────────────────────────────────────────────────

interface QuadrantCardProps {
  title: string
  items: MarketDashboardBusiness[]
  showRevenue?: boolean
  showOutreach?: boolean
  onOpen: (path: string) => void
  onMonitor: (domain: string) => void
  monitoringAdded: Set<string>
}

function QuadrantCard(p: QuadrantCardProps): JSX.Element {
  return (
    <Card style={{ flex: 1 }}>
      <div style={dashStyles.quadrantTitle}>{p.title}</div>
      {p.items.length === 0 ? (
        <p style={dashStyles.quadrantEmpty}>—</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {p.items.map((b) => (
            <div key={b.domain} style={dashStyles.quadrantRow}>
              <div style={dashStyles.quadrantLeft}>
                <span style={{ ...dashStyles.quadrantScore, color: b.overallScore != null ? scoreHex(b.overallScore) : undefined }}>
                  {b.overallScore ?? '—'}
                </span>
                <span style={dashStyles.quadrantDomain}>{b.domain}</span>
              </div>
              <div style={dashStyles.quadrantRight}>
                {p.showRevenue && b.estimatedRevenueLossHigh != null && (
                  <span style={dashStyles.revenueBadge}>
                    ${(b.estimatedRevenueLossHigh ?? 0).toLocaleString()}/mo
                  </span>
                )}
                {p.showOutreach && (
                  <span style={{ ...dashStyles.outreachBadge, color: b.outreachScore >= 6 ? '#f87171' : '#facc15' }}>
                    {b.outreachScore} pts
                  </span>
                )}
                {b.reportPaths?.htmlPath && (
                  <button style={dashStyles.actionBtn} onClick={() => p.onOpen(b.reportPaths!.htmlPath!)}>
                    Open
                  </button>
                )}
                {b.ok && !p.monitoringAdded.has(b.domain) && (
                  <button style={dashStyles.monitorBtn} onClick={() => p.onMonitor(b.domain)}>
                    +Monitor
                  </button>
                )}
                {p.monitoringAdded.has(b.domain) && (
                  <span style={dashStyles.monitoredBadge}>Tracked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }): JSX.Element {
  return (
    <div style={dashStyles.statCell}>
      <span style={{ ...dashStyles.statNum, color }}>{value}</span>
      <span style={dashStyles.statLabel}>{label}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openReport(path: string): void {
  window.api.openReport(path)
}

function scoreHex(score: number): string {
  if (score >= 85) return '#34d399'
  if (score >= 70) return '#a3e635'
  if (score >= 55) return '#facc15'
  return '#f87171'
}

function confColor(level: 'High' | 'Medium' | 'Low'): string {
  if (level === 'High') return '#34d399'
  if (level === 'Medium') return '#facc15'
  return '#f87171'
}

function sortBusinesses(items: MarketDashboardBusiness[], key: MarketSortKey): MarketDashboardBusiness[] {
  const copy = [...items]
  switch (key) {
    case 'score-desc': return copy.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    case 'score-asc':  return copy.sort((a, b) => (a.overallScore ?? 999) - (b.overallScore ?? 999))
    case 'revenue-desc': return copy.sort((a, b) => (b.estimatedRevenueLossHigh ?? b.estimatedRevenueLossLow ?? 0) - (a.estimatedRevenueLossHigh ?? a.estimatedRevenueLossLow ?? 0))
    case 'outreach-desc': return copy.sort((a, b) => b.outreachScore - a.outreachScore)
    case 'issues-desc': return copy.sort((a, b) => (b.issueCount ?? 0) - (a.issueCount ?? 0))
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1200 },
  header: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', textAlign: 'center' },
  emptyIcon: { fontSize: 40, opacity: 0.3 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' },
  emptyHint: { fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.6 },
  building: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' },
  spinner: {
    width: 32, height: 32, border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-brand)', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  buildingText: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  buildingHint: { fontSize: 12, color: 'var(--color-text-muted)' },
  dashboardWrap: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
}

const formStyles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  batchInfo: { display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' },
  batchLabel: { fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 },
  batchId: { fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' },
  batchStats: { fontSize: 12, color: 'var(--color-text-muted)' },
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  optional: { fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--color-text-muted)' },
  input: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' },
  submitHint: { fontSize: 12, color: 'var(--color-text-muted)' },
}

const dashStyles: Record<string, React.CSSProperties> = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  marketLabel: { fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' },
  generatedAt: { fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-4)' },
  statCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 },
  statLabel: { fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' },
  quadrant: { display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' },
  quadrantTitle: { fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  quadrantEmpty: { fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 },
  quadrantRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  quadrantLeft: { display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 },
  quadrantRight: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  quadrantScore: { fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0 },
  quadrantDomain: { fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  revenueBadge: { fontSize: 11, color: '#f87171', fontWeight: 600 },
  outreachBadge: { fontSize: 11, fontWeight: 700 },
  tableHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' },
  sortSelect: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    padding: '5px 8px',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 10px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '9px 10px', color: 'var(--color-text-primary)', verticalAlign: 'middle' },
  failBadge: { marginLeft: 6, fontSize: 10, color: '#f87171', border: '1px solid #f87171', borderRadius: 4, padding: '1px 5px' },
  actions: { display: 'flex', alignItems: 'center', gap: 6 },
  actionBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-brand)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '3px 7px',
  },
  monitorBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '3px 7px',
  },
  monitoredBadge: { fontSize: 11, color: '#34d399', fontWeight: 600 },
}
