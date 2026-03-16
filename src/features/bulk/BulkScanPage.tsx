import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useBulkScanStore } from './useBulkScanStore'
import { rankItems } from '@engine/bulk/buildBulkSummary'
import type { BulkScanItemResult, BulkScanRequest } from '@engine/bulk/bulkTypes'
import type { ScanMode, BusinessType } from '@engine/types/audit'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BulkScanPage(): JSX.Element {
  const { phase, progress, result, error, startBulkScan, reset } = useBulkScanStore()

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Bulk Scan</h2>
        <p style={styles.subtitle}>
          Scan multiple websites at once and compare their SEO scores side-by-side.
        </p>
      </div>

      {phase === 'idle' && <BulkForm onSubmit={startBulkScan} />}

      {phase === 'running' && progress && (
        <BulkProgress
          domain={progress.domain}
          domainIndex={progress.domainIndex}
          totalDomains={progress.totalDomains}
          domainStep={progress.domainStep}
          domainPercent={progress.domainPercent}
          batchPercent={progress.batchPercent}
        />
      )}

      {phase === 'running' && !progress && (
        <Card>
          <p style={styles.waiting}>Starting bulk scan…</p>
        </Card>
      )}

      {phase === 'error' && (
        <Card>
          <p style={{ color: '#f87171', marginBottom: 12 }}>{error}</p>
          <Button size="sm" onClick={reset}>Try Again</Button>
        </Card>
      )}

      {phase === 'done' && result && (
        <BulkResults
          result={{
            batchId: result.batchId,
            startedAt: result.startedAt,
            completedAt: result.completedAt,
            totalDomains: result.totalDomains,
            successfulScans: result.successfulScans,
            failedScans: result.failedScans,
            items: result.items,
          }}
          onReset={reset}
        />
      )}
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function BulkForm({ onSubmit }: { onSubmit: (req: BulkScanRequest) => void }): JSX.Element {
  const [domainsText, setDomainsText] = useState('')
  const [scanMode, setScanMode] = useState<ScanMode>('quick')
  const [businessType, setBusinessType] = useState<BusinessType>('auto')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const lines = domainsText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      setValidationError('Please enter at least one domain.')
      return
    }
    if (lines.length > 20) {
      setValidationError('Maximum 20 domains per batch.')
      return
    }
    setValidationError(null)
    onSubmit({ domains: lines, scanMode, businessType })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} style={formStyles.form}>
        {/* Domain list */}
        <div style={formStyles.field}>
          <label style={formStyles.label}>Domains to scan <span style={formStyles.hint}>(one per line, max 20)</span></label>
          <textarea
            style={formStyles.textarea}
            placeholder={'goettl.com\nparkerandsons.com\nhamstrahvac.com'}
            value={domainsText}
            onChange={(e) => {
              setDomainsText(e.target.value)
              if (validationError) setValidationError(null)
            }}
            rows={8}
          />
          {validationError && <span style={formStyles.error}>{validationError}</span>}
        </div>

        {/* Scan mode */}
        <div style={formStyles.row}>
          <div style={formStyles.fieldGroup}>
            <span style={formStyles.label}>Scan Mode</span>
            <div style={formStyles.radioGroup}>
              {(['quick', 'full'] as ScanMode[]).map((mode) => (
                <label key={mode} style={formStyles.radioLabel}>
                  <input
                    type="radio"
                    name="bulkScanMode"
                    value={mode}
                    checked={scanMode === mode}
                    onChange={() => setScanMode(mode)}
                    style={{ accentColor: 'var(--color-brand)', marginTop: 2 }}
                  />
                  <div>
                    <div style={formStyles.radioTitle}>{mode === 'quick' ? 'Quick' : 'Full'}</div>
                    <div style={formStyles.radioHint}>
                      {mode === 'quick' ? '~1–2 min per site' : '~5–10 min per site'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Business type */}
          <div style={formStyles.fieldGroup}>
            <span style={formStyles.label}>Business Type</span>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              style={formStyles.select}
            >
              <option value="auto">Auto-detect</option>
              <option value="roofer">Roofer</option>
              <option value="contractor">Contractor</option>
              <option value="dentist">Dentist</option>
              <option value="salon">Salon</option>
              <option value="auto_shop">Auto Shop</option>
              <option value="restaurant">Restaurant</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div style={formStyles.submitRow}>
          <Button type="submit" size="lg">Start Bulk Scan</Button>
          <span style={formStyles.submitHint}>
            Sites are scanned one at a time. Failed sites do not stop the batch.
          </span>
        </div>
      </form>
    </Card>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

interface BulkProgressProps {
  domain: string
  domainIndex: number
  totalDomains: number
  domainStep: string
  domainPercent: number
  batchPercent: number
}

function BulkProgress(props: BulkProgressProps): JSX.Element {
  const { domain, domainIndex, totalDomains, domainStep, domainPercent, batchPercent } = props
  return (
    <Card>
      <div style={progressStyles.container}>
        <div style={progressStyles.batchLabel}>
          Scanning site {domainIndex + 1} of {totalDomains}
        </div>

        {/* Batch bar */}
        <div style={progressStyles.barWrap}>
          <div style={{ ...progressStyles.bar, width: `${batchPercent}%` }} />
        </div>
        <div style={progressStyles.batchPercent}>{batchPercent}% overall</div>

        {/* Current domain */}
        <div style={progressStyles.domainRow}>
          <span style={progressStyles.domainLabel}>{domain}</span>
          <span style={progressStyles.domainStep}>{domainStep}</span>
        </div>
        <div style={progressStyles.domainBarWrap}>
          <div style={{ ...progressStyles.domainBar, width: `${domainPercent}%` }} />
        </div>
      </div>
    </Card>
  )
}

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultItem {
  batchId: string
  startedAt: string
  completedAt?: string
  totalDomains: number
  successfulScans: number
  failedScans: number
  items: BulkScanItemResult[]
}

type BulkSortKey = 'score-asc' | 'score-desc' | 'issues-desc' | 'revenue-desc' | 'confidence-asc'

function BulkResults({ result, onReset }: { result: ResultItem; onReset: () => void }): JSX.Element {
  const [sortKey, setSortKey] = useState<BulkSortKey>('score-asc')
  const [filter, setFilter] = useState('')

  const ranked = rankItems(result as Parameters<typeof rankItems>[0], sortKey as Parameters<typeof rankItems>[1])

  const visible = filter.trim()
    ? ranked.filter((i) => i.domain.toLowerCase().includes(filter.trim().toLowerCase()))
    : ranked

  const failed = result.items.filter((i) => !i.ok)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Summary header */}
      <Card>
        <div style={resultsStyles.summary}>
          <div style={resultsStyles.stat}>
            <span style={resultsStyles.statNum}>{result.totalDomains}</span>
            <span style={resultsStyles.statLabel}>Total</span>
          </div>
          <div style={resultsStyles.stat}>
            <span style={{ ...resultsStyles.statNum, color: '#34d399' }}>{result.successfulScans}</span>
            <span style={resultsStyles.statLabel}>Succeeded</span>
          </div>
          <div style={resultsStyles.stat}>
            <span style={{ ...resultsStyles.statNum, color: result.failedScans > 0 ? '#f87171' : 'var(--color-text-secondary)' }}>
              {result.failedScans}
            </span>
            <span style={resultsStyles.statLabel}>Failed</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button size="sm" onClick={onReset}>New Batch</Button>
          </div>
        </div>
      </Card>

      {/* Comparison table */}
      {ranked.length > 0 && (
        <Card>
          {/* Controls: search + sort */}
          <div style={resultsStyles.controls}>
            <input
              type="text"
              placeholder="Filter by domain…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={resultsStyles.filterInput}
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as BulkSortKey)}
              style={resultsStyles.sortSelect}
            >
              <option value="score-asc">Score ↑ (lowest first)</option>
              <option value="score-desc">Score ↓ (highest first)</option>
              <option value="issues-desc">Most issues first</option>
              <option value="revenue-desc">Revenue leak ↓</option>
            </select>
            <span style={resultsStyles.countLabel}>
              {visible.length} of {ranked.length} site{ranked.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={resultsStyles.tableWrap}>
            <table style={resultsStyles.table}>
              <thead>
                <tr>
                  {['Domain', 'Score', 'Label', 'Issues', 'High Priority', 'Confidence', 'Est. Revenue Loss', 'Report'].map((h) => (
                    <th key={h} style={resultsStyles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.domain} style={resultsStyles.tr}>
                    <td style={resultsStyles.td}><strong>{item.domain}</strong></td>
                    <td style={{ ...resultsStyles.td, ...scoreColor(item.overallScore) }}>
                      {item.overallScore ?? '—'}
                    </td>
                    <td style={resultsStyles.td}>{item.scoreLabel ?? '—'}</td>
                    <td style={resultsStyles.td}>{item.issueCount ?? '—'}</td>
                    <td style={{ ...resultsStyles.td, color: (item.highPriorityIssueCount ?? 0) > 0 ? '#f87171' : 'inherit' }}>
                      {item.highPriorityIssueCount ?? '—'}
                    </td>
                    <td style={resultsStyles.td}>
                      {item.confidence ? (
                        <span style={confidenceColor(item.confidence.level)}>
                          {item.confidence.level}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={resultsStyles.td}>
                      {item.revenueImpact?.revenueLossHigh != null
                        ? `$${item.revenueImpact.revenueLossLow?.toLocaleString() ?? '?'} – $${item.revenueImpact.revenueLossHigh.toLocaleString()}/mo`
                        : item.revenueImpact?.leadLossHigh != null
                          ? `~${item.revenueImpact.leadLossHigh} leads/mo`
                          : '—'}
                    </td>
                    <td style={resultsStyles.td}>
                      {item.reportPaths?.htmlPath ? (
                        <button
                          style={resultsStyles.openBtn}
                          onClick={() => window.api.openReport(item.reportPaths!.htmlPath!)}
                        >
                          Open
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...resultsStyles.td, textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>
                      No domains match "{filter}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Failed sites */}
      {failed.length > 0 && (
        <Card>
          <div style={resultsStyles.tableTitle}>Failed Sites</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {failed.map((item) => (
              <div key={item.domain} style={resultsStyles.failRow}>
                <span style={resultsStyles.failDomain}>{item.domain}</span>
                <span style={resultsStyles.failError}>{item.error ?? 'Unknown error'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score?: number): React.CSSProperties {
  if (score == null) return {}
  if (score >= 85) return { color: '#34d399', fontWeight: 700 }
  if (score >= 70) return { color: '#a3e635', fontWeight: 700 }
  if (score >= 55) return { color: '#facc15', fontWeight: 700 }
  return { color: '#f87171', fontWeight: 700 }
}

function confidenceColor(level: 'High' | 'Medium' | 'Low'): React.CSSProperties {
  if (level === 'High') return { color: '#34d399' }
  if (level === 'Medium') return { color: '#facc15' }
  return { color: '#f87171' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1100 },
  header: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 },
  waiting: { color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 14 },
}

const formStyles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  hint: { fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--color-text-muted)' },
  textarea: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    padding: '10px 12px',
    resize: 'vertical',
    fontFamily: 'monospace',
    lineHeight: 1.6,
  },
  error: { fontSize: 12, color: '#f87171' },
  row: { display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 180 },
  radioGroup: { display: 'flex', gap: 'var(--space-3)' },
  radioLabel: { display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', flex: 1 },
  radioTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  radioHint: { fontSize: 11, color: 'var(--color-text-muted)' },
  select: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    padding: '7px 10px',
    width: '100%',
  },
  submitRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' },
  submitHint: { fontSize: 12, color: 'var(--color-text-muted)' },
}

const progressStyles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  batchLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  barWrap: { height: 8, backgroundColor: 'var(--color-bg-base)', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: 'var(--color-brand)', borderRadius: 4, transition: 'width 0.3s ease' },
  batchPercent: { fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' },
  domainRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  domainLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  domainStep: { fontSize: 12, color: 'var(--color-text-secondary)' },
  domainBarWrap: { height: 4, backgroundColor: 'var(--color-bg-base)', borderRadius: 4, overflow: 'hidden' },
  domainBar: { height: '100%', backgroundColor: 'var(--color-brand-hover)', borderRadius: 4, transition: 'width 0.3s ease' },
}

const resultsStyles: Record<string, React.CSSProperties> = {
  summary: { display: 'flex', alignItems: 'center', gap: 'var(--space-8)' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum: { fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 },
  statLabel: { fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterInput: {
    flex: 1,
    minWidth: 160,
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    padding: '6px 10px',
  },
  sortSelect: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    padding: '5px 8px',
    flexShrink: 0,
  },
  countLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 12px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px 12px', color: 'var(--color-text-primary)', verticalAlign: 'middle' },
  openBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-brand)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '3px 8px',
  },
  failRow: { display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', padding: '4px 0' },
  failDomain: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 160 },
  failError: { fontSize: 12, color: '#f87171' },
}
