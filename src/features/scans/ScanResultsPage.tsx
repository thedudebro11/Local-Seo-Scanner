import { useParams } from 'react-router-dom'

/**
 * ScanResultsPage — Phase 1 stub.
 * Full score display, findings, and report actions are wired in Phase 2+.
 */
export default function ScanResultsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Scan Results</h2>
      <p style={styles.sub}>Scan ID: {id ?? 'unknown'}</p>
      <div style={styles.placeholder}>
        [ScoreOverview + IssueList + QuickWins + ReportActions will render here]
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' },
  sub: { fontSize: 13, color: 'var(--color-text-secondary)' },
  placeholder: {
    padding: 'var(--space-10)',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    fontSize: 13,
  },
}
