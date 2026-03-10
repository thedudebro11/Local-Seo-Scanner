import React from 'react'

export interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  padding?: 'none' | 'sm' | 'md' | 'lg'
  elevated?: boolean
  onClick?: () => void
}

export function Card({
  children,
  style,
  padding = 'md',
  elevated = false,
  onClick,
}: CardProps): JSX.Element {
  const paddings = {
    none: 0,
    sm:   'var(--space-4)',
    md:   'var(--space-6)',
    lg:   'var(--space-8)',
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: paddings[padding],
        boxShadow: elevated ? 'var(--shadow-md)' : 'none',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
