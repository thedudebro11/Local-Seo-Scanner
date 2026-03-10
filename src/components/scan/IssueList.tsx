import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import type { Finding, FindingCategory } from '@engine/types/audit'
import type { BadgeVariant } from '../ui/Badge'

interface Props {
  findings: Finding[]
}

const CATEGORY_ORDER: FindingCategory[] = [
  'technical', 'local', 'conversion', 'content', 'trust',
]

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  technical:  'Technical SEO',
  local:      'Local SEO',
  conversion: 'Conversion',
  content:    'Content',
  trust:      'Trust',
}

const CATEGORY_EMOJIS: Record<FindingCategory, string> = {
  technical:  '⚙',
  local:      '📍',
  conversion: '⚡',
  content:    '📝',
  trust:      '🛡',
}

function FindingRow({ finding }: { finding: Finding }): JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={rowStyles.wrapper}>
      {/* Header row — clickable to expand */}
      <button
        style={rowStyles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={rowStyles.headerLeft}>
          <Badge variant={finding.severity as BadgeVariant}>
            {finding.severity.toUpperCase()}
          </Badge>
          <span style={rowStyles.title}>{finding.title}</span>
        </div>
        <span style={rowStyles.chevron}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={rowStyles.detail}>
          {finding.summary && (
            <p style={rowStyles.summary}>{finding.summary}</p>
          )}

          <div style={rowStyles.metaGrid}>
            {finding.whyItMatters && (
              <div style={rowStyles.metaBlock}>
                <span style={rowStyles.metaLabel}>Why it matters</span>
                <p style={rowStyles.metaText}>{finding.whyItMatters}</p>
              </div>
            )}
            {finding.recommendation && (
              <div style={rowStyles.metaBlock}>
                <span style={rowStyles.metaLabel}>Recommendation</span>
                <p style={rowStyles.metaText}>{finding.recommendation}</p>
              </div>
            )}
          </div>

          {finding.affectedUrls && finding.affectedUrls.length > 0 && (
            <div style={rowStyles.metaBlock}>
              <span style={rowStyles.metaLabel}>Affected pages</span>
              <ul style={rowStyles.urlList}>
                {finding.affectedUrls.slice(0, 5).map((url) => (
                  <li key={url} style={rowStyles.urlItem}>{url}</li>
                ))}
                {finding.affectedUrls.length > 5 && (
                  <li style={{ ...rowStyles.urlItem, color: 'var(--color-text-muted)' }}>
                    +{finding.affectedUrls.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function IssueList({ findings }: Props): JSX.Element {
  if (findings.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 24 }}>✓</span>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No findings recorded.</p>
      </div>
    )
  }

  // Group findings by category
  const byCategory = CATEGORY_ORDER.reduce<Record<FindingCategory, Finding[]>>(
    (acc, cat) => {
      acc[cat] = findings.filter((f) => f.category === cat)
      return acc
    },
    { technical: [], local: [], conversion: [], content: [], trust: [] },
  )

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.sectionTitle}>Findings</h3>
      {CATEGORY_ORDER.map((cat) => {
        const catFindings = byCategory[cat]
        if (catFindings.length === 0) return null

        const highCount = catFindings.filter((f) => f.severity === 'high').length
        const medCount  = catFindings.filter((f) => f.severity === 'medium').length

        return (
          <div key={cat} style={styles.group}>
            {/* Category header */}
            <div style={styles.groupHeader}>
              <span style={styles.groupEmoji}>{CATEGORY_EMOJIS[cat]}</span>
              <span style={styles.groupLabel}>{CATEGORY_LABELS[cat]}</span>
              <span style={styles.groupCount}>{catFindings.length} issue{catFindings.length !== 1 ? 's' : ''}</span>
              {highCount > 0 && (
                <Badge variant="high">{highCount} high</Badge>
              )}
              {medCount > 0 && (
                <Badge variant="medium">{medCount} medium</Badge>
              )}
            </div>

            {/* Finding rows */}
            <div style={styles.findingList}>
              {catFindings
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 }
                  return order[a.severity] - order[b.severity]
                })
                .map((f) => (
                  <FindingRow key={f.id} finding={f} />
                ))
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) 0',
  },
  groupEmoji: {
    fontSize: 14,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    flex: 1,
  },
  groupCount: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginRight: 'var(--space-2)',
  },
  findingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    borderLeft: '2px solid var(--color-border)',
    paddingLeft: 'var(--space-4)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-8)',
    color: 'var(--color-score-strong)',
  },
}

const rowStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    gap: 'var(--space-3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    flex: 1,
    minWidth: 0,
  },
  chevron: {
    fontSize: 10,
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  detail: {
    padding: 'var(--space-4)',
    paddingTop: 0,
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  summary: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    paddingTop: 'var(--space-3)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-4)',
  },
  metaBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metaText: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  urlList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  urlItem: {
    fontSize: 12,
    color: 'var(--color-brand-hover)',
    fontFamily: 'var(--font-mono)',
  },
}
