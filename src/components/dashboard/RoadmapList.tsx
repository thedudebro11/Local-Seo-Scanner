/**
 * Priority fix roadmap display — Phase 16.
 *
 * Renders FixRoadmapItem[] as a numbered priority list.
 * Each item shows: priority number, title, plain-English fix,
 * impact badge, effort badge, and category.
 */

import type { FixRoadmapItem } from '@engine/types/audit'

interface Props {
  items: FixRoadmapItem[]
}

export function RoadmapList({ items }: Props): JSX.Element {
  if (items.length === 0) {
    return (
      <div style={emptyStyles.wrap}>
        <p style={emptyStyles.text}>No roadmap items generated for this scan.</p>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      {items.map((item) => (
        <RoadmapRow key={item.priority} item={item} />
      ))}
    </div>
  )
}

function RoadmapRow({ item }: { item: FixRoadmapItem }): JSX.Element {
  const impactColor =
    item.impact === 'Critical' ? '#f87171' :
    item.impact === 'High'     ? '#fb923c' :
    item.impact === 'Medium'   ? '#facc15' : 'var(--color-text-muted)'

  const effortColor =
    item.effort === 'Low'    ? '#34d399' :
    item.effort === 'Medium' ? '#facc15' : '#f87171'

  const categoryLabel: Record<string, string> = {
    technical:  '⚙ Technical',
    localSeo:   '📍 Local SEO',
    conversion: '⚡ Conversion',
    content:    '📝 Content',
    trust:      '🛡 Trust',
  }

  return (
    <div style={rowStyles.row}>
      {/* Priority number */}
      <div style={rowStyles.priorityWrap}>
        <span style={rowStyles.priority}>#{item.priority}</span>
      </div>

      {/* Content */}
      <div style={rowStyles.content}>
        <div style={rowStyles.header}>
          <span style={rowStyles.title}>{item.title}</span>
          <div style={rowStyles.badges}>
            <span style={{
              ...rowStyles.badge,
              color: impactColor,
              borderColor: `${impactColor}55`,
              backgroundColor: `${impactColor}18`,
            }}>
              {item.impact}
            </span>
            <span style={{
              ...rowStyles.badge,
              color: effortColor,
              borderColor: `${effortColor}55`,
              backgroundColor: `${effortColor}18`,
            }}>
              {item.effort} effort
            </span>
            <span style={rowStyles.categoryBadge}>
              {categoryLabel[item.category] ?? item.category}
            </span>
          </div>
        </div>

        <p style={rowStyles.fix}>{item.plainEnglishFix}</p>

        {item.whyItMatters && (
          <p style={rowStyles.why}>{item.whyItMatters}</p>
        )}

        {item.affectedUrls && item.affectedUrls.length > 0 && (
          <div style={rowStyles.urlsRow}>
            <span style={rowStyles.urlsLabel}>Affects:</span>
            {item.affectedUrls.slice(0, 3).map((u) => (
              <code key={u} style={rowStyles.url}>{u}</code>
            ))}
            {item.affectedUrls.length > 3 && (
              <span style={rowStyles.urlsMore}>+{item.affectedUrls.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const emptyStyles: Record<string, React.CSSProperties> = {
  wrap: { padding: 'var(--space-6)', textAlign: 'center' },
  text: { fontSize: 13, color: 'var(--color-text-muted)' },
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
}

const rowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    alignItems: 'flex-start',
  },
  priorityWrap: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priority: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-text-secondary)',
  },
  content: { flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    flex: 1,
    minWidth: 180,
  },
  badges: { display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flexShrink: 0 },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 99,
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 99,
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
  },
  fix: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  why: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  urlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 'var(--space-1)',
  },
  urlsLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
  url: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--color-bg-raised)',
    padding: '1px 5px',
    borderRadius: 3,
    border: '1px solid var(--color-border)',
  },
  urlsMore: { fontSize: 11, color: 'var(--color-text-muted)' },
}
