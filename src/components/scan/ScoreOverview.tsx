import { Card } from '../ui/Card'
import type { AuditScores, CategoryScore } from '@engine/types/audit'
import { scoreBandColor } from '@engine/types/findings'

interface Props {
  scores: AuditScores
  domain: string
}

interface ScoreCardProps {
  label: string
  score: CategoryScore
  isOverall?: boolean
  emoji: string
}

function ScoreCard({ label, score, isOverall, emoji }: ScoreCardProps): JSX.Element {
  const color = scoreBandColor(score.value)
  const size = isOverall ? 56 : 40

  return (
    <div
      style={{
        ...cardStyles.card,
        ...(isOverall ? cardStyles.overallCard : {}),
      }}
    >
      <div style={cardStyles.header}>
        <span style={cardStyles.emoji}>{emoji}</span>
        <span style={cardStyles.label}>{label}</span>
      </div>

      <div style={cardStyles.scoreRow}>
        <span
          style={{
            fontSize: size,
            fontWeight: 800,
            color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score.value}
        </span>
        <span style={{ fontSize: isOverall ? 22 : 16, color: 'var(--color-text-muted)', fontWeight: 400 }}>
          /100
        </span>
      </div>

      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 600,
          color,
          backgroundColor: `${color}22`,
          padding: '2px 8px',
          borderRadius: 99,
          border: `1px solid ${color}44`,
        }}
      >
        {score.label}
      </span>

      {score.rationale.length > 0 && !isOverall && (
        <ul style={cardStyles.rationale}>
          {score.rationale.slice(0, 2).map((r, i) => (
            <li key={i} style={cardStyles.rationaleItem}>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ScoreOverview({ scores, domain }: Props): JSX.Element {
  return (
    <div style={styles.wrapper}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Score Overview</h2>
        <span style={styles.domainLabel}>{domain}</span>
      </div>

      {/* Overall — full width */}
      <ScoreCard
        label="Overall Score"
        score={scores.overall}
        isOverall
        emoji="◉"
      />

      {/* Category grid */}
      <div style={styles.grid}>
        <ScoreCard label="Technical SEO"  score={scores.technical}  emoji="⚙" />
        <ScoreCard label="Local SEO"      score={scores.localSeo}   emoji="📍" />
        <ScoreCard label="Conversion"     score={scores.conversion} emoji="⚡" />
        <ScoreCard label="Content"        score={scores.content}    emoji="📝" />
        <ScoreCard label="Trust"          score={scores.trust}      emoji="🛡" />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--space-3)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  domainLabel: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 'var(--space-3)',
  },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  overallCard: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border-strong)',
    padding: 'var(--space-6)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--space-1)',
  },
  rationale: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    marginTop: 'var(--space-1)',
  },
  rationaleItem: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    paddingLeft: 'var(--space-3)',
    position: 'relative',
  },
}
