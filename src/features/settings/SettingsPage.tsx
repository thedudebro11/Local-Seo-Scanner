import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useLicenseStore } from '../license/useLicenseStore'
import { useSettingsStore } from './useSettingsStore'
import { CURRENCY_CONFIG } from '@engine/settings/settingsTypes'
import type { Currency } from '@engine/settings/settingsTypes'
import { format } from 'date-fns'

export default function SettingsPage(): JSX.Element {
  const { license, offlineGrace, deactivate } = useLicenseStore()
  const { settings, loaded, load, save } = useSettingsStore()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [agencyNameDraft, setAgencyNameDraft] = useState('')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [githubTokenDraft, setGithubTokenDraft] = useState('')
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (loaded) {
      setAgencyNameDraft(settings.agencyName)
      setApiKeyDraft(settings.googlePlacesApiKey ?? '')
      setGithubTokenDraft(settings.githubToken ?? '')
    }
  }, [loaded, settings.agencyName, settings.googlePlacesApiKey, settings.githubToken])

  const flashSaved = (): void => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const handleSaveAgencyName = async (): Promise<void> => {
    await save({ agencyName: agencyNameDraft.trim() })
    flashSaved()
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUri = ev.target?.result as string
      await save({ agencyLogoBase64: dataUri })
      flashSaved()
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = async (): Promise<void> => {
    await save({ agencyLogoBase64: '' })
  }

  const handleSaveApiKey = async (): Promise<void> => {
    await save({ googlePlacesApiKey: apiKeyDraft.trim() })
    flashSaved()
  }

  const handleSaveGithubToken = async (): Promise<void> => {
    await save({ githubToken: githubTokenDraft.trim() })
    flashSaved()
  }

  const handleCurrencyChange = async (currency: Currency): Promise<void> => {
    await save({ currency })
    flashSaved()
  }

  const handleDeactivate = async (): Promise<void> => {
    setDeactivating(true)
    await deactivate()
    setDeactivating(false)
    window.location.reload()
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Settings</h2>
        {savedFlash && <span style={styles.savedPill}>✓ Saved</span>}
      </div>

      {/* ── White-label ─────────────────────────────────────────────────── */}
      <Card style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>White-label Reports</h3>
            <p style={styles.sectionSub}>
              Your agency name and logo will appear on every HTML report you send to clients.
            </p>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Agency name</label>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Apex Digital Marketing"
              value={agencyNameDraft}
              onChange={(e) => setAgencyNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAgencyName() }}
            />
            <Button size="sm" variant="secondary" onClick={handleSaveAgencyName}>
              Save
            </Button>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Agency logo</label>
          {settings.agencyLogoBase64 ? (
            <div style={styles.logoPreviewRow}>
              <img
                src={settings.agencyLogoBase64}
                alt="Agency logo"
                style={styles.logoPreview}
              />
              <Button size="sm" variant="ghost" onClick={handleRemoveLogo}>
                Remove
              </Button>
            </div>
          ) : (
            <div style={styles.inputRow}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <Button size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                Upload logo
              </Button>
              <span style={styles.hint}>PNG, JPG, SVG — shown at 32px height in the report header</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Currency ─────────────────────────────────────────────────────── */}
      <Card style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Revenue Estimate Currency</h3>
            <p style={styles.sectionSub}>
              Applies to estimated revenue loss figures in all new scan reports.
            </p>
          </div>
        </div>

        <div style={styles.currencyGrid}>
          {(Object.entries(CURRENCY_CONFIG) as [Currency, typeof CURRENCY_CONFIG[Currency]][]).map(([code, cfg]) => (
            <button
              key={code}
              style={{
                ...styles.currencyOption,
                ...(settings.currency === code ? styles.currencyOptionActive : {}),
              }}
              onClick={() => handleCurrencyChange(code)}
            >
              <span style={styles.currencySymbol}>{cfg.symbol}</span>
              <span style={styles.currencyLabel}>{cfg.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Google Business Profile ──────────────────────────────────────── */}
      <Card style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Google Business Profile Integration</h3>
            <p style={styles.sectionSub}>
              Optional. Adds GBP existence checks, review counts, and NAP consistency to every scan report.
              Get a free key at <strong>console.cloud.google.com</strong> → enable Places API.
            </p>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Google Places API key</label>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type={showApiKey ? 'text' : 'password'}
              placeholder="AIza…"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey() }}
            />
            <Button size="sm" variant="ghost" onClick={() => setShowApiKey((v) => !v)}>
              {showApiKey ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSaveApiKey}>
              Save
            </Button>
          </div>
          {settings.googlePlacesApiKey
            ? <span style={{ ...styles.hint, color: 'var(--color-low)' }}>✓ API key configured</span>
            : <span style={styles.hint}>Leave blank to skip GBP API checks (on-site signals still checked)</span>
          }
        </div>
      </Card>

      {/* ── Share Reports ────────────────────────────────────────────────── */}
      <Card style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Share Reports</h3>
            <p style={styles.sectionSub}>
              Optional. Uploads reports as private GitHub Gists — gives you a link to send clients directly.
              Create a token at <strong>github.com/settings/tokens</strong> with the <code>gist</code> scope.
            </p>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>GitHub Personal Access Token</label>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type={showGithubToken ? 'text' : 'password'}
              placeholder="ghp_…"
              value={githubTokenDraft}
              onChange={(e) => setGithubTokenDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGithubToken() }}
            />
            <Button size="sm" variant="ghost" onClick={() => setShowGithubToken((v) => !v)}>
              {showGithubToken ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSaveGithubToken}>
              Save
            </Button>
          </div>
          {settings.githubToken
            ? <span style={{ ...styles.hint, color: 'var(--color-low)' }}>✓ Token configured — "Share Link" enabled on reports</span>
            : <span style={styles.hint}>Leave blank to disable report sharing</span>
          }
        </div>
      </Card>

      {/* ── License ──────────────────────────────────────────────────────── */}
      <Card style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>License</h3>
            <p style={styles.sectionSub}>Your activation details for this machine.</p>
          </div>
          <span style={styles.activeBadge}>● Active</span>
        </div>

        {offlineGrace && (
          <div style={styles.graceNotice}>
            <span>⚠</span>
            Running in offline mode — license will be re-validated when internet is restored.
          </div>
        )}

        <div style={styles.detailGrid}>
          {license?.variantName && <DetailRow label="Plan" value={license.variantName} />}
          {license?.email && <DetailRow label="Email" value={license.email} />}
          {license?.activatedAt && (
            <DetailRow label="Activated" value={format(new Date(license.activatedAt), 'MMM d, yyyy')} />
          )}
          {license?.lastValidatedAt && (
            <DetailRow
              label="Last validated"
              value={format(new Date(license.lastValidatedAt), 'MMM d, yyyy — h:mm a')}
            />
          )}
          {license?.instanceName && <DetailRow label="Machine" value={license.instanceName} />}
        </div>

        <div style={{ paddingTop: 'var(--space-2)' }}>
          {!confirmDeactivate ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(true)}>
              Deactivate on this machine
            </Button>
          ) : (
            <div style={styles.confirmRow}>
              <span style={styles.confirmText}>
                This removes your license from this machine. You'll need your key to reactivate.
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="danger" size="sm" loading={deactivating} onClick={handleDeactivate}>
                  Yes, deactivate
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDeactivate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 660 },
  headerRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  heading: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 },
  savedPill: {
    fontSize: 12, fontWeight: 600, color: 'var(--color-low)',
    backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 10px',
    borderRadius: 20, border: '1px solid rgba(34,197,94,0.25)',
  },
  section: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 },
  sectionSub: { fontSize: 13, color: 'var(--color-text-secondary)', margin: '2px 0 0' },
  activeBadge: {
    fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' as const,
    backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--color-brand-hover)',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' },
  inputRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  input: {
    flex: 1, padding: '7px 12px', fontSize: 13,
    backgroundColor: 'var(--color-bg-raised)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none',
    fontFamily: 'var(--font-sans)',
  },
  hint: { fontSize: 12, color: 'var(--color-text-muted)' },
  logoPreviewRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)' },
  logoPreview: {
    height: 40, width: 'auto', maxWidth: 160, objectFit: 'contain',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
    backgroundColor: '#fff', padding: 4,
  },
  currencyGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 'var(--space-2)' },
  currencyOption: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, padding: '10px 16px', cursor: 'pointer', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-secondary)', minWidth: 90, transition: 'all var(--transition-fast)',
  },
  currencyOptionActive: {
    borderColor: 'var(--color-brand)', backgroundColor: 'var(--color-brand-light)',
    color: 'var(--color-text-primary)',
  },
  currencySymbol: { fontSize: 20, fontWeight: 700 },
  currencyLabel: { fontSize: 11, textAlign: 'center' as const, lineHeight: 1.3 },
  graceNotice: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    fontSize: 13, color: 'var(--color-medium)',
    backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 'var(--radius-md)', padding: '8px 12px',
  },
  detailGrid: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    padding: '12px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
  },
  confirmRow: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  confirmText: { fontSize: 13, color: 'var(--color-text-secondary)' },
}
