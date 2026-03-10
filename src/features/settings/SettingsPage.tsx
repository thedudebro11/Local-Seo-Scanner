/**
 * SettingsPage — Phase 1 stub.
 * Settings are deferred until they become necessary.
 */
export default function SettingsPage(): JSX.Element {
  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Settings</h2>
      <p style={styles.sub}>Settings panel — coming soon.</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' },
  sub: { fontSize: 14, color: 'var(--color-text-secondary)' },
}
