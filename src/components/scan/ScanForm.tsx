import { useState } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { BusinessTypeSelect } from './BusinessTypeSelect'
import type { AuditRequest, BusinessType, ScanMode } from '@engine/types/audit'

interface Props {
  onSubmit: (request: AuditRequest) => void
  isLoading?: boolean
}

function validateUrl(raw: string): string | null {
  if (!raw.trim()) return 'Please enter a website URL'
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    new URL(url)
    return null
  } catch {
    return 'Please enter a valid website URL (e.g. rooferaustin.com)'
  }
}

const MAX_PAGES_BY_MODE: Record<ScanMode, number> = {
  quick: 10,
  full:  50,
}

export function ScanForm({ onSubmit, isLoading = false }: Props): JSX.Element {
  const [url, setUrl]                     = useState('')
  const [scanMode, setScanMode]           = useState<ScanMode>('quick')
  const [businessType, setBusinessType]   = useState<BusinessType>('auto')
  const [maxPages, setMaxPages]           = useState<number>(MAX_PAGES_BY_MODE.quick)
  const [urlError, setUrlError]           = useState<string | null>(null)

  // When scan mode changes, reset max pages to the mode default
  function handleModeChange(mode: ScanMode): void {
    setScanMode(mode)
    setMaxPages(MAX_PAGES_BY_MODE[mode])
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const err = validateUrl(url)
    if (err) {
      setUrlError(err)
      return
    }
    setUrlError(null)

    // Add scheme if missing before sending
    let finalUrl = url.trim()
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`

    onSubmit({ url: finalUrl, scanMode, businessType, maxPages })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* URL ─────────────────────────────────────────── */}
        <div style={styles.section}>
          <Input
            label="Website URL"
            type="text"
            placeholder="e.g. rooferaustin.com or https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (urlError) setUrlError(null)
            }}
            error={urlError ?? undefined}
            disabled={isLoading}
            autoFocus
          />
        </div>

        {/* Scan mode + Business type ──────────────────── */}
        <div style={styles.row}>
          {/* Scan mode */}
          <div style={styles.fieldGroup}>
            <span style={styles.fieldLabel}>Scan Mode</span>
            <div style={styles.radioGroup}>
              {(['quick', 'full'] as ScanMode[]).map((mode) => (
                <label key={mode} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="scanMode"
                    value={mode}
                    checked={scanMode === mode}
                    onChange={() => handleModeChange(mode)}
                    disabled={isLoading}
                    style={styles.radioInput}
                  />
                  <div style={styles.radioCard}>
                    <span style={styles.radioTitle}>
                      {mode === 'quick' ? 'Quick' : 'Full'}
                    </span>
                    <span style={styles.radioHint}>
                      {mode === 'quick' ? '~1–2 min · up to 10 pages' : '~5–10 min · up to 50 pages'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Business type */}
          <div style={{ flex: 1 }}>
            <BusinessTypeSelect
              value={businessType}
              onChange={setBusinessType}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Max pages ──────────────────────────────────── */}
        <div style={{ maxWidth: 200 }}>
          <Input
            label="Max Pages"
            type="number"
            min={1}
            max={100}
            value={maxPages}
            onChange={(e) => setMaxPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
            hint="How many pages to crawl (affects scan depth)"
            disabled={isLoading}
          />
        </div>

        {/* Submit ─────────────────────────────────────── */}
        <div style={styles.submitRow}>
          <Button
            type="submit"
            size="lg"
            loading={isLoading}
            disabled={isLoading}
            fullWidth={false}
          >
            {isLoading ? 'Scanning…' : 'Start Scan'}
          </Button>
          <span style={styles.submitHint}>
            {scanMode === 'quick'
              ? 'Quick scan: homepage + key pages, ~1–2 minutes'
              : 'Full scan: deep crawl + Lighthouse audit, ~5–10 minutes'}
          </span>
        </div>
      </form>
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-6)',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    minWidth: 200,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  radioGroup: {
    display: 'flex',
    gap: 'var(--space-3)',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    cursor: 'pointer',
    flex: 1,
  },
  radioInput: {
    marginTop: 3,
    accentColor: 'var(--color-brand)',
    flexShrink: 0,
  },
  radioCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  radioTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  radioHint: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
  submitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    paddingTop: 'var(--space-2)',
    borderTop: '1px solid var(--color-border)',
  },
  submitHint: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
  },
}
