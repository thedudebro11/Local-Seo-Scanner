/**
 * Lighthouse metrics + visual checks display — Phase 16.
 *
 * Renders LighthouseMetrics[] as a score grid + key vitals table.
 * Also renders VisualAnalysisResult (above-the-fold checks per page)
 * when present in the same panel.
 */

import { Card } from '../ui/Card'
import type { LighthouseMetrics, VisualAnalysisResult } from '@engine/types/audit'

interface Props {
  lighthouse?: LighthouseMetrics[]
  visual?: VisualAnalysisResult
}

export function LighthouseCard({ lighthouse, visual }: Props): JSX.Element {
  const hasLighthouse = lighthouse && lighthouse.length > 0
  const hasVisual = visual && visual.pagesAnalyzed.length > 0

  if (!hasLighthouse && !hasVisual) {
    return (
      <Card>
        <div style={emptyStyles.wrap}>
          <span style={emptyStyles.icon}>◌</span>
          <p style={emptyStyles.title}>No performance data</p>
          <p style={emptyStyles.hint}>
            Run a Full scan to collect Lighthouse scores and visual analysis.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {hasLighthouse && lighthouse.map((m, i) => (
        <LighthousePanel key={i} metrics={m} />
      ))}
      {hasVisual && (
        <VisualChecksPanel visual={visual} />
      )}
    </div>
  )
}

// ─── Lighthouse panel ─────────────────────────────────────────────────────────

function LighthousePanel({ metrics }: { metrics: LighthouseMetrics }): JSX.Element {
  return (
    <Card>
      <div style={lhStyles.header}>
        <span style={lhStyles.title}>Lighthouse — {metrics.url}</span>
      </div>

      {/* Score grid */}
      <div style={lhStyles.scoreGrid}>
        <ScorePill label="Performance" score={metrics.performanceScore} />
        <ScorePill label="SEO"         score={metrics.seoScore} />
        <ScorePill label="Accessibility" score={metrics.accessibilityScore} />
      </div>

      {/* Core Web Vitals */}
      {(metrics.firstContentfulPaint != null ||
        metrics.largestContentfulPaint != null ||
        metrics.totalBlockingTime != null ||
        metrics.cumulativeLayoutShift != null) && (
        <div style={lhStyles.vitals}>
          <span style={lhStyles.vitalsLabel}>Core Web Vitals</span>
          <div style={lhStyles.vitalsGrid}>
            {metrics.firstContentfulPaint != null && (
              <Vital label="FCP" value={`${(metrics.firstContentfulPaint / 1000).toFixed(1)}s`}
                good={metrics.firstContentfulPaint < 1800} />
            )}
            {metrics.largestContentfulPaint != null && (
              <Vital label="LCP" value={`${(metrics.largestContentfulPaint / 1000).toFixed(1)}s`}
                good={metrics.largestContentfulPaint < 2500} />
            )}
            {metrics.totalBlockingTime != null && (
              <Vital label="TBT" value={`${metrics.totalBlockingTime}ms`}
                good={metrics.totalBlockingTime < 200} />
            )}
            {metrics.cumulativeLayoutShift != null && (
              <Vital label="CLS" value={metrics.cumulativeLayoutShift.toFixed(3)}
                good={metrics.cumulativeLayoutShift < 0.1} />
            )}
            {metrics.speedIndex != null && (
              <Vital label="Speed Index" value={`${(metrics.speedIndex / 1000).toFixed(1)}s`}
                good={metrics.speedIndex < 3400} />
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function ScorePill({ label, score }: { label: string; score: number }): JSX.Element {
  const color = score >= 90 ? '#34d399' : score >= 50 ? '#facc15' : '#f87171'
  return (
    <div style={lhStyles.scorePill}>
      <span style={{ ...lhStyles.scoreNum, color }}>{score}</span>
      <span style={lhStyles.scoreLabel}>{label}</span>
    </div>
  )
}

function Vital({ label, value, good }: { label: string; value: string; good: boolean }): JSX.Element {
  return (
    <div style={lhStyles.vital}>
      <span style={{ ...lhStyles.vitalValue, color: good ? '#34d399' : '#f87171' }}>{value}</span>
      <span style={lhStyles.vitalLabel}>{label}</span>
    </div>
  )
}

// ─── Visual checks panel ──────────────────────────────────────────────────────

function VisualChecksPanel({ visual }: { visual: VisualAnalysisResult }): JSX.Element {
  const checkLabels: Record<string, string> = {
    hasAboveFoldCta:       'Above-fold CTA button',
    hasPhoneVisible:       'Phone number visible',
    hasTrustSignalsVisible:'Trust signals visible',
    hasHeroClarity:        'Hero headline clarity',
  }

  return (
    <Card>
      <div style={vcStyles.header}>
        <span style={vcStyles.title}>Visual Analysis</span>
        <span style={vcStyles.subtitle}>Above-the-fold checks per page</span>
      </div>

      {visual.pagesAnalyzed.map((page, i) => (
        <div key={i} style={vcStyles.page}>
          <div style={vcStyles.pageHeader}>
            <span style={vcStyles.pageType}>{page.pageType}</span>
            <span style={vcStyles.pageUrl}>{page.url}</span>
          </div>
          <div style={vcStyles.checksGrid}>
            {Object.entries(page.checks).map(([key, result]) => (
              <div key={key} style={vcStyles.checkRow}>
                <span style={{ ...vcStyles.checkIcon, color: result.passed ? '#34d399' : '#f87171' }}>
                  {result.passed ? '✓' : '✗'}
                </span>
                <span style={vcStyles.checkLabel}>{checkLabels[key] ?? key}</span>
                {result.detail && (
                  <span style={vcStyles.checkDetail}>{result.detail}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const emptyStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  icon: { fontSize: 28, opacity: 0.3 },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' },
  hint: { fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 360, lineHeight: 1.6 },
}

const lhStyles: Record<string, React.CSSProperties> = {
  header: { marginBottom: 'var(--space-3)' },
  title: { fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' },
  scoreGrid: {
    display: 'flex',
    gap: 'var(--space-6)',
    marginBottom: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  scorePill: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  scoreNum: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  vitals: { display: 'flex', flexDirection: 'column', gap: 6 },
  vitalsLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  vitalsGrid: { display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' },
  vital: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  vitalValue: { fontSize: 16, fontWeight: 700, lineHeight: 1 },
  vitalLabel: { fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
}

const vcStyles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' },
  subtitle: { fontSize: 12, color: 'var(--color-text-muted)' },
  page: {
    marginBottom: 'var(--space-4)',
    paddingBottom: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
  },
  pageHeader: { display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' },
  pageType: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'capitalize',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    padding: '1px 7px',
    borderRadius: 99,
  },
  pageUrl: { fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' },
  checksGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 },
  checkIcon: { fontWeight: 700, fontSize: 13, flexShrink: 0, width: 16, textAlign: 'center' as const },
  checkLabel: { color: 'var(--color-text-secondary)', flex: 1 },
  checkDetail: { fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' },
}
