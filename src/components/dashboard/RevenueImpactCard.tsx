/**
 * Revenue impact summary card — Phase 16.
 *
 * Displays the RevenueImpactEstimate produced by the engine:
 *   • confidence level badge
 *   • lead loss range + revenue loss range
 *   • top impact drivers
 *   • plain-English explanation
 */

import { Card } from '../ui/Card'
import type { RevenueImpactEstimate } from '@engine/types/audit'

interface Props {
  impact: RevenueImpactEstimate
}

export function RevenueImpactCard({ impact }: Props): JSX.Element {
  const confColor =
    impact.confidence === 'High'   ? '#34d399' :
    impact.confidence === 'Medium' ? '#facc15'  : '#f87171'

  return (
    <Card>
      <div style={styles.header}>
        <span style={styles.title}>Revenue Impact Estimate</span>
        <span style={{
          ...styles.confBadge,
          color: confColor,
          borderColor: `${confColor}55`,
          backgroundColor: `${confColor}18`,
        }}>
          {impact.confidence} Confidence
        </span>
      </div>

      {/* Key metrics */}
      <div style={styles.metricsRow}>
        <Metric
          value={`${impact.estimatedLeadLossRange.low}–${impact.estimatedLeadLossRange.high}`}
          label="Leads/mo lost"
        />
        {impact.estimatedRevenueLossRange && (
          <Metric
            value={`$${impact.estimatedRevenueLossRange.low.toLocaleString()}–$${impact.estimatedRevenueLossRange.high.toLocaleString()}`}
            label="Revenue/mo at risk"
            valueColor="#f87171"
          />
        )}
      </div>

      {/* Impact drivers */}
      {impact.impactDrivers.length > 0 && (
        <div style={styles.driversSection}>
          <span style={styles.driversLabel}>Top drivers</span>
          <ul style={styles.driversList}>
            {impact.impactDrivers.slice(0, 4).map((d, i) => (
              <li key={i} style={styles.driverItem}>
                <span style={styles.driverBullet}>›</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation */}
      {impact.explanation && (
        <p style={styles.explanation}>{impact.explanation}</p>
      )}

      {/* Assumptions (collapsed) */}
      {impact.assumptions.length > 0 && (
        <details style={styles.assumptions}>
          <summary style={styles.assumptionsSummary}>Assumptions</summary>
          <ul style={styles.assumptionsList}>
            {impact.assumptions.map((a, i) => (
              <li key={i} style={styles.assumptionItem}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}

function Metric({ value, label, valueColor }: { value: string; label: string; valueColor?: string }): JSX.Element {
  return (
    <div style={metricStyles.cell}>
      <span style={{ ...metricStyles.value, color: valueColor ?? 'var(--color-text-primary)' }}>
        {value}
      </span>
      <span style={metricStyles.label}>{label}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' },
  confBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 9px',
    borderRadius: 99,
    border: '1px solid',
    flexShrink: 0,
  },
  metricsRow: {
    display: 'flex',
    gap: 'var(--space-8)',
    marginBottom: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  driversSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 'var(--space-3)',
  },
  driversLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  driversList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 },
  driverItem: {
    display: 'flex',
    gap: 6,
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    alignItems: 'flex-start',
    lineHeight: 1.5,
  },
  driverBullet: { color: '#f87171', flexShrink: 0, fontWeight: 700, marginTop: 1 },
  explanation: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    lineHeight: 1.7,
    fontStyle: 'italic',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-3)',
    marginTop: 'var(--space-2)',
  },
  assumptions: { marginTop: 'var(--space-2)' },
  assumptionsSummary: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  assumptionsList: { listStyleType: 'disc', paddingLeft: 18, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 },
  assumptionItem: { fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 },
}

const metricStyles: Record<string, React.CSSProperties> = {
  cell: { display: 'flex', flexDirection: 'column', gap: 2 },
  value: { fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  label: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
}
