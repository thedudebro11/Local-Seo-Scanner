import React from 'react'

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  style?: React.CSSProperties
}

export function EmptyState({
  icon = '◌',
  title,
  description,
  action,
  style,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12)',
        gap: 'var(--space-4)',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        ...style,
      }}
    >
      <span style={{ fontSize: 36, color: 'var(--color-text-muted)', lineHeight: 1 }}>
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 360 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
