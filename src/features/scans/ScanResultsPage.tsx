import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ScoreOverview } from '../../components/scan/ScoreOverview'
import { IssueList } from '../../components/scan/IssueList'
import { QuickWins } from '../../components/scan/QuickWins'
import { ReportActions } from '../../components/reports/ReportActions'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { useScanStore } from './state/useScanStore'
import { format } from 'date-fns'

export default function ScanResultsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const latestResult = useScanStore((s) => s.latestResult)

  // If the ID doesn't match the in-memory result, attempt a load from disk
  // (Phase 7 will make loadScan actually work; for now it will return null)
  useEffect(() => {
    if (!latestResult || latestResult.id !== id) {
      window.api.loadScan(id ?? '').then((result) => {
        // result will be null in Phase 2 — handled by the empty state below
        if (result) {
          // In Phase 7+: set it in the store
          // For now we just let the empty state render
        }
      })
    }
  }, [id, latestResult])

  // Resolve which result to display
  const result = latestResult?.id === id ? latestResult : null

  if (!result) {
    return (
      <div style={styles.page}>
        <EmptyState
          icon="◌"
          title="Scan result not found"
          description={
            id
              ? `No result in memory for scan ID "${id}". Results are kept in memory for the current session. Run a new scan or check Saved Scans after Phase 7 report persistence is wired up.`
              : 'No scan ID provided. Run a new scan to see results.'
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

  const scannedAt = format(new Date(result.scannedAt), 'MMM d, yyyy — h:mm a')

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.resultHeader}>
        <div style={styles.resultMeta}>
          <h2 style={styles.domain}>{result.domain}</h2>
          <div style={styles.metaRow}>
            <span style={styles.metaBadge}>{result.request.scanMode} scan</span>
            <span style={styles.metaBadge}>{result.detectedBusinessType}</span>
            <span style={styles.metaTime}>{scannedAt}</span>
          </div>
        </div>
        <Link to="/scan/new" style={styles.backLink}>← New Scan</Link>
      </div>

      {/* Report actions */}
      <ReportActions result={result} onNewScan={() => navigate('/scan/new')} />

      {/* Score overview */}
      <ScoreOverview scores={result.scores} domain={result.domain} />

      {/* Quick wins + money leaks */}
      {(result.quickWins.length > 0 || result.moneyLeaks.length > 0) && (
        <QuickWins
          quickWins={result.quickWins}
          moneyLeaks={result.moneyLeaks}
        />
      )}

      {/* Findings */}
      <IssueList findings={result.findings} />

      {/* Page inventory */}
      {result.pages.length > 0 && (
        <PageInventory pages={result.pages} />
      )}
    </div>
  )
}

// ─── Page inventory ───────────────────────────────────────────────────────────

import type { CrawledPage } from '@engine/types/audit'

function PageInventory({ pages }: { pages: CrawledPage[] }): JSX.Element {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Page Inventory ({pages.length})</h3>
      <div style={styles.pageTable}>
        <div style={tableStyles.header}>
          <span style={{ flex: 2 }}>URL</span>
          <span style={{ width: 80, textAlign: 'center' }}>Type</span>
          <span style={{ width: 60, textAlign: 'center' }}>Status</span>
        </div>
        {pages.map((p) => (
          <div key={p.url} style={tableStyles.row}>
            <span style={{ ...tableStyles.url, flex: 2 }}>{p.url}</span>
            <span style={{ width: 80, textAlign: 'center', ...tableStyles.type }}>
              {p.pageType}
            </span>
            <span
              style={{
                width: 60,
                textAlign: 'center',
                fontSize: 12,
                color: p.statusCode === 200 ? 'var(--color-score-strong)' : 'var(--color-high)',
              }}
            >
              {p.statusCode}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
    maxWidth: 960,
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  resultMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  domain: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
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
  metaTime: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
  },
  backLink: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    flexShrink: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  pageTable: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
}

const tableStyles: Record<string, React.CSSProperties> = {
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
  type: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    textTransform: 'capitalize',
  },
}
