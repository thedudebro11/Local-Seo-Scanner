import React from 'react'

export type BadgeVariant =
  | 'high'
  | 'medium'
  | 'low'
  | 'technical'
  | 'local'
  | 'conversion'
  | 'content'
  | 'trust'
  | 'default'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: React.CSSProperties
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  high: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  medium: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    color: '#fcd34d',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  low: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    color: '#86efac',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  technical: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  local: {
    backgroundColor: 'rgba(20,184,166,0.15)',
    color: '#5eead4',
    border: '1px solid rgba(20,184,166,0.3)',
  },
  conversion: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    color: '#fdba74',
    border: '1px solid rgba(249,115,22,0.3)',
  },
  content: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    color: '#d8b4fe',
    border: '1px solid rgba(168,85,247,0.3)',
  },
  trust: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    color: '#f9a8d4',
    border: '1px solid rgba(236,72,153,0.3)',
  },
  default: {
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
}

export function Badge({ variant = 'default', children, style }: BadgeProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
