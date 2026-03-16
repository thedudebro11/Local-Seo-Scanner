/**
 * SEO opportunity display — Phase 16.
 *
 * Renders OpportunityItem[] grouped by opportunityLevel (High → Medium → Low).
 * Each item shows title, description, suggested page slug, value range,
 * and competitor coverage if present.
 */

import type { OpportunityItem } from '@engine/types/audit'

interface Props {
  opportunities: OpportunityItem[]
}

export function OpportunityList({ opportunities }: Props): JSX.Element {
  if (opportunities.length === 0) {
    return (
      <div style={emptyStyles.wrap}>
        <span style={emptyStyles.icon}>✦</span>
        <p style={emptyStyles.title}>No opportunities detected</p>
        <p style={emptyStyles.hint}>
          Run a full scan with competitor URLs to unlock SEO growth opportunities.
        </p>
      </div>
    )
  }

  const high   = opportunities.filter((o) => o.opportunityLevel === 'High')
  const medium = opportunities.filter((o) => o.opportunityLevel === 'Medium')
  const low    = opportunities.filter((o) => o.opportunityLevel === 'Low')

  return (
    <div style={styles.wrapper}>
      {high.length   > 0 && <OppGroup level="High"   items={high}   />}
      {medium.length > 0 && <OppGroup level="Medium" items={medium} />}
      {low.length    > 0 && <OppGroup level="Low"    items={low}    />}
    </div>
  )
}

function OppGroup({ level, items }: { level: string; items: OpportunityItem[] }): JSX.Element {
  const color = level === 'High' ? '#34d399' : level === 'Medium' ? '#facc15' : 'var(--color-text-muted)'

  return (
    <div style={styles.group}>
      <div style={styles.groupHeader}>
        <span style={{
          ...styles.levelBadge,
          color,
          borderColor: `${color}55`,
          backgroundColor: `${color}18`,
        }}>
          {level} Priority
        </span>
        <span style={styles.groupCount}>
          {items.length} opportunit{items.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <div style={styles.cards}>
        {items.map((opp, i) => (
          <OppCard key={i} opp={opp} />
        ))}
      </div>
    </div>
  )
}

function OppCard({ opp }: { opp: OpportunityItem }): JSX.Element {
  const hasValue = opp.estimatedMonthlyValueRange.high > 0

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={cardStyles.title}>{opp.title}</span>
        {hasValue && (
          <span style={cardStyles.value}>
            +${opp.estimatedMonthlyValueRange.low.toLocaleString()}–
            ${opp.estimatedMonthlyValueRange.high.toLocaleString()}/mo
          </span>
        )}
      </div>

      <p style={cardStyles.description}>{opp.description}</p>

      {opp.reason && (
        <p style={cardStyles.reason}>{opp.reason}</p>
      )}

      <div style={cardStyles.footer}>
        <code style={cardStyles.slug}>/{opp.suggestedPageSlug}</code>
        {opp.competitorCoverage && opp.competitorCoverage.length > 0 && (
          <span style={cardStyles.coverage}>
            {opp.competitorCoverage.length} competitor{opp.competitorCoverage.length !== 1 ? 's' : ''} have this
          </span>
        )}
      </div>
    </div>
  )
}

const emptyStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8) var(--space-4)',
    textAlign: 'center',
  },
  icon: { fontSize: 28, opacity: 0.3 },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' },
  hint: { fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 380, lineHeight: 1.6 },
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' },
  group: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  groupHeader: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  levelBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 9px',
    borderRadius: 99,
    border: '1px solid',
  },
  groupCount: { fontSize: 12, color: 'var(--color-text-muted)' },
  cards: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    flex: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
    color: '#34d399',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  description: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  reason: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    marginTop: 'var(--space-1)',
    paddingTop: 'var(--space-2)',
    borderTop: '1px solid var(--color-border)',
    flexWrap: 'wrap',
  },
  slug: {
    fontSize: 11,
    color: 'var(--color-brand)',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--color-bg-raised)',
    padding: '1px 6px',
    borderRadius: 4,
    border: '1px solid var(--color-border)',
  },
  coverage: {
    fontSize: 11,
    color: '#facc15',
    fontWeight: 600,
  },
}
