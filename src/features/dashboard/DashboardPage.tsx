import { useNavigate } from 'react-router-dom'

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Local Business Revenue Leak Detector</h2>
        <p style={styles.heroSubtitle}>
          Scan any local business website to find what's hurting their visibility,
          conversions, and trust — then generate a client-ready report.
        </p>
        <button style={styles.ctaBtn} onClick={() => navigate('/scan/new')}>
          Start a New Scan
        </button>
      </div>

      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>⚡</div>
          <h3 style={styles.cardTitle}>Quick Scan</h3>
          <p style={styles.cardText}>
            Homepage + key pages in under 2 minutes. Great for fast outreach qualification.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>🔍</div>
          <h3 style={styles.cardTitle}>Full Audit</h3>
          <p style={styles.cardText}>
            Deep crawl of up to 50 pages with Lighthouse performance scores and full
            signal extraction.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📄</div>
          <h3 style={styles.cardTitle}>Client Reports</h3>
          <p style={styles.cardText}>
            Auto-generates a polished HTML report you can open in any browser and share
            directly with prospects.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-8)',
    maxWidth: 900,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'var(--color-text-secondary)',
    maxWidth: 600,
    lineHeight: 1.6,
  },
  ctaBtn: {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  cardText: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
}
