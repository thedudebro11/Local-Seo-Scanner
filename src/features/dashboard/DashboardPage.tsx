import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../scans/state/useScanStore'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { scoreBandColor } from '@engine/types/findings'
import { format } from 'date-fns'

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { savedScans, latestResult, loadSavedScans } = useScanStore()

  // Load saved scans when the dashboard mounts
  useEffect(() => {
    loadSavedScans()
  }, [loadSavedScans])

  return (
    <div style={styles.page}>
      {/* Header row */}
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.heading}>Local Business Revenue Leak Detector</h2>
          <p style={styles.subheading}>
            Scan local business websites to find what's hurting their visibility,
            conversions, and trust — then generate a client-ready report.
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/scan/new')}>
          + New Scan
        </Button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatCard
          icon="◉"
          label="Total Scans"
          value={String(savedScans.length)}
        />
        <StatCard
          icon="⚡"
          label="Last Scan"
          value={
            latestResult
              ? latestResult.domain
              : savedScans[0]?.domain ?? '—'
          }
          sub={
            latestResult
              ? format(new Date(latestResult.scannedAt), 'MMM d, h:mm a')
              : savedScans[0]
              ? format(new Date(savedScans[0].scannedAt), 'MMM d, h:mm a')
              : undefined
          }
        />
        <StatCard
          icon="📍"
          label="Avg Score"
          value={
            savedScans.length > 0
              ? String(
                  Math.round(
                    savedScans.reduce((s, x) => s + x.overallScore, 0) /
                      savedScans.length,
                  ),
                )
              : '—'
          }
        />
      </div>

      {/* Latest result shortcut */}
      {latestResult && (
        <div style={styles.latestBanner}>
          <div style={styles.latestInfo}>
            <span style={styles.latestLabel}>Latest scan</span>
            <span style={styles.latestDomain}>{latestResult.domain}</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: scoreBandColor(latestResult.scores.overall.value),
              }}
            >
              {latestResult.scores.overall.value}
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>
                /100
              </span>
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/scan/results/${latestResult.id}`)}
          >
            View Results →
          </Button>
        </div>
      )}

      {/* Saved scans list */}
      {savedScans.length > 0 ? (
        <SavedScansList scans={savedScans} onOpen={(id) => navigate(`/scan/results/${id}`)} />
      ) : (
        <EmptyState
          icon="◌"
          title="No saved scans yet"
          description="Run your first scan to start building a library of site audits."
          action={
            <Button onClick={() => navigate('/scan/new')}>Start a New Scan</Button>
          }
        />
      )}

      {/* Feature cards */}
      <div style={styles.featureGrid}>
        <FeatureCard
          icon="⚡"
          title="Quick Scan"
          text="Homepage + key pages in under 2 minutes. Great for fast outreach qualification."
        />
        <FeatureCard
          icon="🔍"
          title="Full Audit"
          text="Deep crawl with Lighthouse performance scores and full signal extraction."
        />
        <FeatureCard
          icon="📄"
          title="Client Reports"
          text="Generates a polished HTML report you can share directly with prospects."
        />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: string
  label: string
  value: string
  sub?: string
}): JSX.Element {
  return (
    <Card style={statStyles.card}>
      <span style={statStyles.icon}>{icon}</span>
      <span style={statStyles.label}>{label}</span>
      <span style={statStyles.value}>{value}</span>
      {sub && <span style={statStyles.sub}>{sub}</span>}
    </Card>
  )
}

function SavedScansList({
  scans,
  onOpen,
}: {
  scans: Array<{ id: string; domain: string; scannedAt: string; overallScore: number }>
  onOpen: (id: string) => void
}): JSX.Element {
  return (
    <div>
      <h3 style={styles.sectionTitle}>Recent Scans</h3>
      <div style={styles.scanList}>
        {scans.slice(0, 10).map((scan) => (
          <button
            key={scan.id}
            style={styles.scanRow}
            onClick={() => onOpen(scan.id)}
          >
            <span style={styles.scanDomain}>{scan.domain}</span>
            <span style={styles.scanDate}>
              {format(new Date(scan.scannedAt), 'MMM d, yyyy')}
            </span>
            <span
              style={{
                ...styles.scanScore,
                color: scoreBandColor(scan.overallScore),
              }}
            >
              {scan.overallScore}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, text }: {
  icon: string; title: string; text: string
}): JSX.Element {
  return (
    <Card>
      <div style={{ fontSize: 28, marginBottom: 'var(--space-3)' }}>{icon}</div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{text}</p>
    </Card>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
    maxWidth: 960,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-6)',
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    lineHeight: 1.2,
    marginBottom: 'var(--space-2)',
  },
  subheading: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    maxWidth: 560,
    lineHeight: 1.6,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-3)',
  },
  latestBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    padding: 'var(--space-4) var(--space-5)',
    backgroundColor: 'var(--color-brand-light)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 'var(--radius-lg)',
    flexWrap: 'wrap',
  },
  latestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  latestLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-brand-hover)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  latestDomain: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-3)',
  },
  scanList: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  scanRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  scanDomain: {
    flex: 1,
    fontSize: 13,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  scanDate: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
  },
  scanScore: {
    fontSize: 16,
    fontWeight: 700,
    width: 40,
    textAlign: 'right',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
  },
}

const statStyles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 'var(--space-4)',
  },
  icon: {
    fontSize: 16,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  value: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  sub: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
}
