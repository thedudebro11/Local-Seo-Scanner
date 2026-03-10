import { useLocation, useNavigate } from 'react-router-dom'

const ROUTE_LABELS: Record<string, string> = {
  '/':           'Dashboard',
  '/scan/new':   'New Scan',
  '/scans':      'Saved Scans',
  '/settings':   'Settings',
}

function getLabel(pathname: string): string {
  if (pathname.startsWith('/scan/results/')) return 'Scan Results'
  return ROUTE_LABELS[pathname] ?? 'Local SEO Scanner'
}

export default function Topbar(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const label = getLabel(location.pathname)

  return (
    <header style={styles.topbar}>
      <h1 style={styles.title}>{label}</h1>
      <div style={styles.actions}>
        <button
          style={styles.newScanBtn}
          onClick={() => navigate('/scan/new')}
        >
          + New Scan
        </button>
      </div>
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  topbar: {
    height: 52,
    minHeight: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    letterSpacing: '0.01em',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  newScanBtn: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
}
