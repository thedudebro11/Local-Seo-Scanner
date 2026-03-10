import React from 'react'
import clsx from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    transition: 'background-color var(--transition-fast), opacity var(--transition-fast)',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
  }

  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '5px 12px', height: 28 },
    md: { fontSize: 13, padding: '7px 16px', height: 34 },
    lg: { fontSize: 14, padding: '9px 20px', height: 40 },
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-brand)',
      color: '#fff',
    },
    secondary: {
      backgroundColor: 'var(--color-bg-raised)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    danger: {
      backgroundColor: 'var(--color-high)',
      color: '#fff',
    },
  }

  return (
    <button
      disabled={isDisabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...rest}
    >
      {loading && <span style={spinnerStyle}>⟳</span>}
      {children}
    </button>
  )
}

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  animation: 'spin 0.8s linear infinite',
}
