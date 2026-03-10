/**
 * SavedScansPage — Phase 1 stub.
 * Real saved scan table + load/open actions are wired in Phase 2+.
 */
export default function SavedScansPage(): JSX.Element {
  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Saved Scans</h2>
      <p style={styles.sub}>
        Previously completed scans will appear here. Run a scan first.
      </p>
      <div style={styles.placeholder}>
        [SavedScansTable will render here]
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' },
  sub: { fontSize: 14, color: 'var(--color-text-secondary)' },
  placeholder: {
    padding: 'var(--space-10)',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    fontSize: 13,
  },
}
