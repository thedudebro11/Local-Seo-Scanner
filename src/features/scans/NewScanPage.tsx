import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanForm } from '../../components/scan/ScanForm'
import { ScanProgress } from '../../components/scan/ScanProgress'
import { useScanStore } from './state/useScanStore'
import { getDomain } from '@engine/utils/domain'
import type { AuditRequest } from '@engine/types/audit'

export default function NewScanPage(): JSX.Element {
  const navigate = useNavigate()
  const { isScanning, progress, stepLabel, error, currentRequest, clearError, startScan } =
    useScanStore()

  const latestResult = useScanStore((s) => s.latestResult)

  // Navigate to results once the scan completes
  useEffect(() => {
    if (latestResult && !isScanning) {
      navigate(`/scan/results/${latestResult.id}`)
    }
  }, [latestResult, isScanning, navigate])

  async function handleSubmit(request: AuditRequest): Promise<void> {
    clearError()
    await startScan(request)
    // Navigation happens in the useEffect above
  }

  const domain = currentRequest ? getDomain(currentRequest.url) : undefined

  return (
    <div style={styles.page}>
      {/* Page title */}
      <div style={styles.header}>
        <h2 style={styles.title}>New Scan</h2>
        <p style={styles.subtitle}>
          Enter a local business URL to detect what's hurting their visibility,
          conversions, and trust.
        </p>
      </div>

      {/* Error banner */}
      {error && !isScanning && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>✕</span>
          <span style={styles.errorText}>{error}</span>
          <button style={styles.errorDismiss} onClick={clearError}>Dismiss</button>
        </div>
      )}

      {/* Show progress during scan, form otherwise */}
      {isScanning ? (
        <ScanProgress
          progress={progress}
          stepLabel={stepLabel}
          domain={domain}
        />
      ) : (
        <ScanForm
          onSubmit={handleSubmit}
          isLoading={isScanning}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
    maxWidth: 680,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-md)',
    color: '#fca5a5',
    fontSize: 13,
  },
  errorIcon: {
    flexShrink: 0,
    fontWeight: 700,
  },
  errorText: {
    flex: 1,
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: 12,
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
  },
}
