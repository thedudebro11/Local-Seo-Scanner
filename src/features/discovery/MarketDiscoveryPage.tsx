import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useBulkScanStore } from '../bulk/useBulkScanStore'
import { rankItems } from '@engine/bulk/buildBulkSummary'
import type { DiscoveredBusiness, MarketDiscoveryResult } from '@engine/discovery/discoveryTypes'
import type { BulkScanItemResult } from '@engine/bulk/bulkTypes'
import type { ScanMode } from '@engine/types/audit'

// ─── Page ─────────────────────────────────────────────────────────────────────

type DiscPhase = 'form' | 'discovering' | 'candidates'

export default function MarketDiscoveryPage(): JSX.Element {
  const [discPhase, setDiscPhase] = useState<DiscPhase>('form')
  const [discResult, setDiscResult] = useState<MarketDiscoveryResult | null>(null)
  const [discError, setDiscError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<ScanMode>('quick')

  const bulk = useBulkScanStore()

  async function handleDiscover(industry: string, location: string, maxResults: number): Promise<void> {
    setDiscError(null)
    setDiscPhase('discovering')
    bulk.reset()
    try {
      const result = await window.api.runDiscovery({ industry, location, maxResults })
      setDiscResult(result)
      setDiscPhase('candidates')
    } catch (err) {
      setDiscError(err instanceof Error ? err.message : String(err))
      setDiscPhase('form')
    }
  }

  function handleScanSelected(domains: string[]): void {
    bulk.startBulkScan({ domains, scanMode })
  }

  // ── Determine what to render ───────────────────────────────────────────────

  // If bulk scan has been kicked off, show its UI
  if (bulk.phase === 'running') {
    return (
      <div style={styles.page}>
        <PageHeader />
        <BulkProgress bulk={bulk} />
      </div>
    )
  }

  if (bulk.phase === 'done' && bulk.result) {
    return (
      <div style={styles.page}>
        <PageHeader />
        <BulkResults
          result={bulk.result}
          onReset={() => { bulk.reset(); setDiscPhase('form'); setDiscResult(null) }}
        />
      </div>
    )
  }

  if (bulk.phase === 'error') {
    return (
      <div style={styles.page}>
        <PageHeader />
        <Card>
          <p style={{ color: '#f87171', marginBottom: 12 }}>{bulk.error}</p>
          <Button size="sm" onClick={() => { bulk.reset(); setDiscPhase('candidates') }}>Back to Candidates</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <PageHeader />

      {discError && (
        <Card>
          <p style={{ color: '#f87171', marginBottom: 12 }}>{discError}</p>
          <Button size="sm" onClick={() => setDiscPhase('form')}>Try Again</Button>
        </Card>
      )}

      {discPhase === 'form' && (
        <DiscoveryForm scanMode={scanMode} onScanModeChange={setScanMode} onSubmit={handleDiscover} />
      )}

      {discPhase === 'discovering' && (
        <Card>
          <div style={styles.discovering}>
            <div style={styles.spinner} />
            <p style={styles.discoveringText}>Discovering businesses…</p>
            <p style={styles.discoveringHint}>Searching DuckDuckGo and filtering results</p>
          </div>
        </Card>
      )}

      {discPhase === 'candidates' && discResult && (
        <CandidateTable
          result={discResult}
          scanMode={scanMode}
          onScanModeChange={setScanMode}
          onScanSelected={handleScanSelected}
          onNewSearch={() => { setDiscPhase('form'); setDiscResult(null) }}
        />
      )}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function PageHeader(): JSX.Element {
  return (
    <div style={styles.header}>
      <h2 style={styles.title}>Market Discovery</h2>
      <p style={styles.subtitle}>
        Enter an industry and location to automatically discover local businesses,
        review candidates, and scan selected sites in bulk.
      </p>
    </div>
  )
}

// ─── Discovery form ───────────────────────────────────────────────────────────

interface DiscoveryFormProps {
  scanMode: ScanMode
  onScanModeChange: (m: ScanMode) => void
  onSubmit: (industry: string, location: string, maxResults: number) => void
}

function DiscoveryForm({ scanMode, onScanModeChange, onSubmit }: DiscoveryFormProps): JSX.Element {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState(15)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!industry.trim()) { setError('Please enter an industry.'); return }
    if (!location.trim()) { setError('Please enter a location.'); return }
    setError(null)
    onSubmit(industry.trim(), location.trim(), maxResults)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} style={formStyles.form}>
        <div style={formStyles.row}>
          <div style={formStyles.field}>
            <label style={formStyles.label}>Industry</label>
            <input
              style={formStyles.input}
              type="text"
              placeholder="e.g. HVAC, Roofing, Plumber"
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setError(null) }}
              autoFocus
            />
          </div>
          <div style={formStyles.field}>
            <label style={formStyles.label}>Location</label>
            <input
              style={formStyles.input}
              type="text"
              placeholder="e.g. Tucson, Phoenix AZ"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setError(null) }}
            />
          </div>
          <div style={{ ...formStyles.field, maxWidth: 120 }}>
            <label style={formStyles.label}>Max Results</label>
            <input
              style={formStyles.input}
              type="number"
              min={5}
              max={30}
              value={maxResults}
              onChange={(e) => setMaxResults(Math.min(30, Math.max(5, parseInt(e.target.value, 10) || 15)))}
            />
          </div>
        </div>

        <div style={formStyles.modeRow}>
          <span style={formStyles.label}>Scan Mode <span style={formStyles.modeHint}>(applied when scanning selected businesses)</span></span>
          <div style={formStyles.radioGroup}>
            {(['quick', 'full'] as ScanMode[]).map((mode) => (
              <label key={mode} style={formStyles.radioLabel}>
                <input
                  type="radio"
                  name="discScanMode"
                  value={mode}
                  checked={scanMode === mode}
                  onChange={() => onScanModeChange(mode)}
                  style={{ accentColor: 'var(--color-brand)', marginTop: 2 }}
                />
                <div>
                  <div style={formStyles.radioTitle}>{mode === 'quick' ? 'Quick' : 'Full'}</div>
                  <div style={formStyles.radioHint}>{mode === 'quick' ? '~1–2 min per site' : '~5–10 min per site'}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>}

        <div style={formStyles.submitRow}>
          <Button type="submit" size="lg">Discover Businesses</Button>
          <span style={formStyles.submitHint}>
            Searches DuckDuckGo for "{industry || 'industry'} {location || 'location'}" and filters the results
          </span>
        </div>
      </form>
    </Card>
  )
}

// ─── Candidate table ──────────────────────────────────────────────────────────

interface CandidateTableProps {
  result: MarketDiscoveryResult
  scanMode: ScanMode
  onScanModeChange: (m: ScanMode) => void
  onScanSelected: (domains: string[]) => void
  onNewSearch: () => void
}

function CandidateTable({ result, scanMode, onScanModeChange, onScanSelected, onNewSearch }: CandidateTableProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(result.validDomains),
  )

  function toggleAll(checked: boolean): void {
    setSelected(checked ? new Set(result.validDomains) : new Set())
  }

  function toggle(domain: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(domain) ? next.delete(domain) : next.add(domain)
      return next
    })
  }

  const selectedDomains = [...selected]
  const scannable = result.discovered.filter((b) => b.hasWebsite && b.domain && result.validDomains.includes(b.domain))
  const excluded = result.discovered.filter((b) => !b.hasWebsite || !b.domain || !result.validDomains.includes(b.domain ?? ''))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header card */}
      <Card>
        <div style={candStyles.header}>
          <div>
            <p style={candStyles.query}>
              Results for: <strong>{result.request.industry}</strong> in <strong>{result.request.location}</strong>
            </p>
            <p style={candStyles.subtext}>
              {scannable.length} scannable business{scannable.length !== 1 ? 'es' : ''} found
              {excluded.length > 0 ? ` · ${excluded.length} filtered out` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Button size="sm" onClick={onNewSearch}>New Search</Button>
          </div>
        </div>
      </Card>

      {/* Candidate list */}
      {scannable.length > 0 && (
        <Card>
          <div style={candStyles.tableHeader}>
            <div style={candStyles.tableTitle}>Select Businesses to Scan</div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <label style={candStyles.selectAllLabel}>
                <input
                  type="checkbox"
                  checked={selected.size === result.validDomains.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                <span>Select all</span>
              </label>
            </div>
          </div>
          <div style={candStyles.tableWrap}>
            <table style={candStyles.table}>
              <thead>
                <tr>
                  <th style={candStyles.th}></th>
                  <th style={candStyles.th}>#</th>
                  <th style={candStyles.th}>Business Name</th>
                  <th style={candStyles.th}>Website</th>
                </tr>
              </thead>
              <tbody>
                {scannable.map((biz) => {
                  const domain = biz.domain!
                  const isSelected = selected.has(domain)
                  return (
                    <tr
                      key={domain}
                      style={{ ...candStyles.tr, cursor: 'pointer', opacity: isSelected ? 1 : 0.5 }}
                      onClick={() => toggle(domain)}
                    >
                      <td style={candStyles.td}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(domain)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: 'var(--color-brand)' }}
                        />
                      </td>
                      <td style={{ ...candStyles.td, color: 'var(--color-text-muted)', fontSize: 11 }}>
                        {biz.rankingPosition ?? '—'}
                      </td>
                      <td style={candStyles.td}><strong>{biz.name}</strong></td>
                      <td style={{ ...candStyles.td, color: 'var(--color-brand)', fontFamily: 'monospace', fontSize: 12 }}>
                        {new URL(domain).hostname}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Rejected candidates — separate section with classification badges */}
          {excluded.length > 0 && (
            <div style={candStyles.rejectedSection}>
              <div style={candStyles.rejectedHeader}>
                <span style={candStyles.rejectedTitle}>Rejected Candidates</span>
                <span style={candStyles.rejectedCount}>{excluded.length} filtered out</span>
                <span style={candStyles.rejectedHint}>
                  These domains were blocked by the directory filter or candidate classifier
                </span>
              </div>
              <div style={candStyles.rejectedList}>
                {excluded.map((biz, i) => (
                  <div key={i} style={candStyles.excludedRow}>
                    <div style={candStyles.rejectedLeft}>
                      <span style={candStyles.rejectedName}>{biz.name}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
                        {biz.domain ? new URL(biz.domain).hostname : 'no website'}
                      </span>
                    </div>
                    {biz.rejectionReason && (
                      <span style={candStyles.rejectionBadge}>
                        {biz.rejectionReason}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan action row */}
          <div style={candStyles.actionRow}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <span style={formStyles.label}>Scan Mode:</span>
              {(['quick', 'full'] as ScanMode[]).map((mode) => (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="candScanMode"
                    value={mode}
                    checked={scanMode === mode}
                    onChange={() => onScanModeChange(mode)}
                    style={{ accentColor: 'var(--color-brand)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                    {mode === 'quick' ? 'Quick' : 'Full'}
                  </span>
                </label>
              ))}
            </div>
            <Button
              size="lg"
              disabled={selectedDomains.length === 0}
              onClick={() => onScanSelected(selectedDomains)}
            >
              Scan {selectedDomains.length} Selected {selectedDomains.length === 1 ? 'Business' : 'Businesses'}
            </Button>
          </div>
        </Card>
      )}

      {scannable.length === 0 && (
        <Card>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            No scannable businesses found. Try a different industry or location, or check your internet connection.
          </p>
          <div style={{ marginTop: 12 }}>
            <Button size="sm" onClick={onNewSearch}>New Search</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Bulk progress (reused from BulkScanPage) ─────────────────────────────────

function BulkProgress({ bulk }: { bulk: ReturnType<typeof useBulkScanStore> }): JSX.Element {
  const p = bulk.progress
  if (!p) return <Card><p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 14 }}>Starting bulk scan…</p></Card>
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Scanning site {p.domainIndex + 1} of {p.totalDomains}
        </div>
        <div style={{ height: 8, backgroundColor: 'var(--color-bg-base)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--color-brand)', borderRadius: 4, width: `${p.batchPercent}%`, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>{p.batchPercent}% overall</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.domain}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.domainStep}</span>
        </div>
        <div style={{ height: 4, backgroundColor: 'var(--color-bg-base)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--color-brand-hover)', borderRadius: 4, width: `${p.domainPercent}%`, transition: 'width 0.3s ease' }} />
        </div>
      </div>
    </Card>
  )
}

// ─── Bulk results ─────────────────────────────────────────────────────────────

function BulkResults({ result, onReset }: { result: NonNullable<ReturnType<typeof useBulkScanStore>['result']>; onReset: () => void }): JSX.Element {
  const ranked = rankItems(result, 'score-asc')
  const failed = result.items.filter((i) => !i.ok)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <Stat num={result.totalDomains} label="Total" />
          <Stat num={result.successfulScans} label="Succeeded" color="#34d399" />
          <Stat num={result.failedScans} label="Failed" color={result.failedScans > 0 ? '#f87171' : undefined} />
          <div style={{ marginLeft: 'auto' }}>
            <Button size="sm" onClick={onReset}>New Discovery</Button>
          </div>
        </div>
      </Card>

      {ranked.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Score Comparison (lowest first)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Domain', 'Score', 'Label', 'Issues', 'High Priority', 'Confidence', 'Est. Revenue Loss', 'Report'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((item) => (
                  <ResultRow key={item.domain} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {failed.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Failed Sites</div>
          {failed.map((item) => (
            <div key={item.domain} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 160 }}>{item.domain}</span>
              <span style={{ fontSize: 12, color: '#f87171' }}>{item.error ?? 'Unknown error'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function ResultRow({ item }: { item: BulkScanItemResult }): JSX.Element {
  const s = item.overallScore
  const scoreStyle: React.CSSProperties = s == null ? {} :
    s >= 85 ? { color: '#34d399', fontWeight: 700 } :
    s >= 70 ? { color: '#a3e635', fontWeight: 700 } :
    s >= 55 ? { color: '#facc15', fontWeight: 700 } :
    { color: '#f87171', fontWeight: 700 }

  const confStyle: React.CSSProperties =
    item.confidence?.level === 'High' ? { color: '#34d399' } :
    item.confidence?.level === 'Medium' ? { color: '#facc15' } :
    item.confidence ? { color: '#f87171' } : {}

  const tdStyle: React.CSSProperties = { padding: '10px 12px', color: 'var(--color-text-primary)', verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' }

  return (
    <tr>
      <td style={tdStyle}><strong>{item.domain}</strong></td>
      <td style={{ ...tdStyle, ...scoreStyle }}>{s ?? '—'}</td>
      <td style={tdStyle}>{item.scoreLabel ?? '—'}</td>
      <td style={tdStyle}>{item.issueCount ?? '—'}</td>
      <td style={{ ...tdStyle, color: (item.highPriorityIssueCount ?? 0) > 0 ? '#f87171' : 'inherit' }}>{item.highPriorityIssueCount ?? '—'}</td>
      <td style={{ ...tdStyle, ...confStyle }}>{item.confidence?.level ?? '—'}</td>
      <td style={tdStyle}>
        {item.revenueImpact?.revenueLossHigh != null
          ? `$${item.revenueImpact.revenueLossLow?.toLocaleString() ?? '?'}–$${item.revenueImpact.revenueLossHigh.toLocaleString()}/mo`
          : item.revenueImpact?.leadLossHigh != null
            ? `~${item.revenueImpact.leadLossHigh} leads/mo`
            : '—'}
      </td>
      <td style={tdStyle}>
        {item.reportPaths?.htmlPath ? (
          <button
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-brand)', cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
            onClick={() => window.api.openReport(item.reportPaths!.htmlPath!)}
          >
            Open
          </button>
        ) : '—'}
      </td>
    </tr>
  )
}

function Stat({ num, label, color }: { num: number; label: string; color?: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--color-text-primary)', lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1100 },
  header: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 },
  discovering: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-8) 0' },
  spinner: {
    width: 32, height: 32,
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-brand)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  discoveringText: { fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 },
  discoveringHint: { fontSize: 12, color: 'var(--color-text-muted)', margin: 0 },
}

const formStyles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  row: { display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: 160 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  modeHint: { fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--color-text-muted)' },
  input: {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    padding: '8px 10px',
    width: '100%',
    boxSizing: 'border-box',
  },
  modeRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  radioGroup: { display: 'flex', gap: 'var(--space-3)' },
  radioLabel: { display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', flex: 1 },
  radioTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  radioHint: { fontSize: 11, color: 'var(--color-text-muted)' },
  submitRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' },
  submitHint: { fontSize: 12, color: 'var(--color-text-muted)' },
}

const candStyles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' },
  query: { fontSize: 14, color: 'var(--color-text-primary)', margin: 0, marginBottom: 4 },
  subtext: { fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' },
  selectAllLabel: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px 12px', color: 'var(--color-text-primary)', verticalAlign: 'middle' },
  excludedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', padding: '6px 0', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' as const },
  rejectedSection: { marginTop: 'var(--space-4)', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-4)' },
  rejectedHeader: { display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' as const },
  rejectedTitle: { fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  rejectedCount: { fontSize: 12, color: '#f87171', fontWeight: 600 },
  rejectedHint: { fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' as const },
  rejectedList: { display: 'flex', flexDirection: 'column' as const, gap: 0 },
  rejectedLeft: { display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 0 },
  rejectedName: { fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  rejectionBadge: { fontSize: 10, fontWeight: 600, color: '#94a3b8', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 3, padding: '2px 6px', letterSpacing: '0.03em', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' },
}
