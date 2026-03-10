/**
 * NewScanPage — Phase 1 stub.
 * The real scan form and Zustand wiring are implemented in Phase 2.
 */
export default function NewScanPage(): JSX.Element {
  return (
    <div style={styles.page}>
      <h2 style={styles.title}>New Scan</h2>
      <p style={styles.sub}>
        Scan form coming in Phase 2 — enter a URL, pick a scan mode, and run.
      </p>
      <div style={styles.placeholder}>
        [ScanForm will render here]
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 },
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
