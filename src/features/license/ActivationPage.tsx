import { useState, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { useLicenseStore } from './useLicenseStore'

interface Props {
  onActivated: () => void
}

export default function ActivationPage({ onActivated }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const activate = useLicenseStore((s) => s.activate)

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // Strip non-alphanumeric, uppercase, insert dashes every 4 chars
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const formatted = raw.match(/.{1,4}/g)?.join('-') ?? raw
    setKey(formatted)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!key.trim()) {
      setError('Please enter your license key.')
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setError(null)
    const err = await activate(key)
    setLoading(false)
    if (err) {
      setError(err)
    } else {
      onActivated()
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>◎</span>
          <span style={styles.logoText}>Local SEO Scanner</span>
        </div>

        <h1 style={styles.title}>Activate Your License</h1>
        <p style={styles.subtitle}>
          Enter your license key to unlock the full app.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={key}
            onChange={handleKeyChange}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={39}
            autoFocus
            spellCheck={false}
            style={{
              ...styles.input,
              borderColor: error ? 'var(--color-high)' : 'var(--color-border)',
            }}
          />
          {error && <p style={styles.errorText}>{error}</p>}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Activating…' : 'Activate License'}
          </Button>
        </form>

        <p style={styles.footer}>
          Don't have a license?{' '}
          <a
            href="https://lemon.new"
            style={styles.link}
            onClick={(e) => {
              e.preventDefault()
              // Opens in system browser via Electron's setWindowOpenHandler
              window.open('https://lemon.new')
            }}
          >
            Get one here
          </a>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-base)',
    fontFamily: 'var(--font-sans)',
    padding: 'var(--space-6)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-10)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    boxShadow: 'var(--shadow-lg)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-2)',
  },
  logoIcon: {
    fontSize: 28,
    color: 'var(--color-brand)',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 15,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorText: {
    fontSize: 13,
    color: 'var(--color-high)',
    margin: 0,
  },
  footer: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    margin: 0,
  },
  link: {
    color: 'var(--color-brand-hover)',
    textDecoration: 'none',
  },
}
