import React from 'react'

export interface ProgressProps {
  value: number          // 0–100
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md'
  color?: string
  style?: React.CSSProperties
}

export function Progress({
  value,
  label,
  showPercent = false,
  size = 'md',
  color,
  style,
}: ProgressProps): JSX.Element {
  const clamped = Math.min(100, Math.max(0, value))
  const trackHeight = size === 'sm' ? 4 : 8

  const barColor = color ?? getBarColor(clamped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {(label || showPercent) && (
        <div style={headerRow}>
          {label && <span style={labelStyle}>{label}</span>}
          {showPercent && (
            <span style={percentStyle}>{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: trackHeight,
          backgroundColor: 'var(--color-bg-raised)',
          borderRadius: trackHeight / 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            backgroundColor: barColor,
            borderRadius: trackHeight / 2,
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

function getBarColor(value: number): string {
  if (value >= 85) return 'var(--color-score-strong)'
  if (value >= 70) return 'var(--color-score-solid)'
  if (value >= 55) return 'var(--color-score-needs)'
  if (value > 0)   return 'var(--color-score-leak)'
  return 'var(--color-bg-overlay)'
}

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-secondary)',
}

const percentStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
}
