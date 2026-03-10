import { Progress } from '../ui/Progress'
import { Card } from '../ui/Card'

interface Props {
  progress: number    // 0–100
  stepLabel: string
  domain?: string
}

// The ordered list of steps — matches runAudit.ts milestones
const STEPS = [
  { label: 'Validating URL',         threshold: 2 },
  { label: 'Fetching homepage',      threshold: 8 },
  { label: 'Loading robots.txt',     threshold: 14 },
  { label: 'Loading sitemap',        threshold: 20 },
  { label: 'Discovering pages',      threshold: 30 },
  { label: 'Extracting signals',     threshold: 50 },
  { label: 'Detecting business type',threshold: 60 },
  { label: 'Analyzing technical SEO',threshold: 68 },
  { label: 'Analyzing local SEO',    threshold: 74 },
  { label: 'Analyzing conversions',  threshold: 80 },
  { label: 'Running Lighthouse',     threshold: 88 },
  { label: 'Scoring results',        threshold: 94 },
  { label: 'Building reports',       threshold: 98 },
  { label: 'Complete',               threshold: 100 },
]

export function ScanProgress({ progress, stepLabel, domain }: Props): JSX.Element {
  return (
    <Card style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Scanning in progress…</h3>
        {domain && (
          <span style={styles.domain}>{domain}</span>
        )}
      </div>

      {/* Main progress bar */}
      <Progress
        value={progress}
        showPercent
        label={stepLabel || 'Starting…'}
        size="md"
        color="var(--color-brand)"
        style={{ marginBottom: 'var(--space-6)' }}
      />

      {/* Step checklist */}
      <div style={styles.stepList}>
        {STEPS.map((step) => {
          const done    = progress > step.threshold
          const active  = progress >= step.threshold && progress < step.threshold + 10

          return (
            <div key={step.label} style={styles.stepRow}>
              <span
                style={{
                  ...styles.stepIcon,
                  color: done
                    ? 'var(--color-score-strong)'
                    : active
                    ? 'var(--color-brand)'
                    : 'var(--color-text-muted)',
                }}
              >
                {done ? '✓' : active ? '◉' : '○'}
              </span>
              <span
                style={{
                  ...styles.stepText,
                  color: done
                    ? 'var(--color-text-secondary)'
                    : active
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <p style={styles.disclaimer}>
        Do not close the app while scanning is in progress.
      </p>
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    maxWidth: 560,
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-5)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  domain: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-5)',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  stepIcon: {
    width: 16,
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: 12,
    transition: 'color 0.2s ease',
  },
  disclaimer: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-3)',
    marginTop: 'var(--space-2)',
  },
}
