import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export function Input({
  label,
  error,
  hint,
  fullWidth = true,
  style,
  ...rest
}: InputProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: fullWidth ? '100%' : undefined }}>
      {label && (
        <label style={labelStyle}>{label}</label>
      )}
      <input
        style={{
          ...inputBase,
          borderColor: error ? 'var(--color-high)' : 'var(--color-border)',
          ...style,
        }}
        {...rest}
      />
      {error && <span style={errorStyle}>{error}</span>}
      {!error && hint && <span style={hintStyle}>{hint}</span>}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
}

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-high)',
}

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
}
