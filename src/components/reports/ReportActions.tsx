import { useState } from 'react'
import { Button } from '../ui/Button'
import type { AuditResult } from '@engine/types/audit'

interface Props {
  result: AuditResult
  onNewScan?: () => void
}

export function ReportActions({ result, onNewScan }: Props): JSX.Element {
  const [openingReport, setOpeningReport] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [pdfExported, setPdfExported] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)

  const hasHtmlReport = Boolean(result.artifacts.htmlPath)
  const hasJsonReport = Boolean(result.artifacts.jsonPath)
  const hasBlueprint = Boolean(result.artifacts.blueprintPath)

  async function handleOpenReport(): Promise<void> {
    if (!result.artifacts.htmlPath) return
    setOpeningReport(true)
    try {
      await window.api.openReport(result.artifacts.htmlPath)
    } finally {
      setOpeningReport(false)
    }
  }

  async function handleOpenFolder(): Promise<void> {
    setOpeningFolder(true)
    try {
      const folder = result.artifacts.jsonPath
        ? result.artifacts.jsonPath.split(/[/\\]/).slice(0, -1).join('/')
        : await window.api.getReportsPath()
      await window.api.openFolder(folder)
    } finally {
      setOpeningFolder(false)
    }
  }

  async function handleExportPdf(): Promise<void> {
    if (!result.artifacts.htmlPath) return
    setExportingPdf(true)
    try {
      const pdfPath = await window.api.exportPdf(result.artifacts.htmlPath)
      setPdfExported(true)
      setTimeout(() => setPdfExported(false), 4000)
      await window.api.openReport(pdfPath)
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleShareReport(): Promise<void> {
    if (!result.artifacts.htmlPath) return
    setSharing(true)
    setShareError(null)
    try {
      const url = await window.api.shareReport(result.artifacts.htmlPath)
      setShareUrl(url)
      await window.api.openReport(url)  // open in default browser
    } catch (err) {
      setShareError((err as Error).message)
    } finally {
      setSharing(false)
    }
  }

  async function handleCopyShareUrl(): Promise<void> {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  async function handleEmailReport(): Promise<void> {
    if (!result.artifacts.htmlPath) return
    setEmailing(true)
    try {
      await window.api.emailReport({
        htmlPath: result.artifacts.htmlPath,
        domain: result.domain,
      })
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 4000)
    } finally {
      setEmailing(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.actions}>
        <Button
          variant="primary"
          onClick={handleOpenReport}
          loading={openingReport}
          disabled={!hasHtmlReport}
          title={hasHtmlReport ? 'Open the HTML report in your browser' : 'No report saved yet'}
        >
          Open HTML Report
        </Button>

        <Button
          variant="secondary"
          onClick={handleExportPdf}
          loading={exportingPdf}
          disabled={!hasHtmlReport}
          title="Generate a PDF version of this report"
        >
          {pdfExported ? '✓ PDF Opened' : 'Export PDF'}
        </Button>

        <Button
          variant="secondary"
          onClick={handleShareReport}
          loading={sharing}
          disabled={!hasHtmlReport}
          title="Upload report to a private GitHub Gist and get a shareable link (configure token in Settings)"
        >
          {sharing ? 'Uploading…' : shareUrl ? '✓ Link Copied' : 'Share Link'}
        </Button>

        <Button
          variant="secondary"
          onClick={handleEmailReport}
          loading={emailing}
          disabled={!hasHtmlReport}
          title="Open mail client with subject pre-filled and report highlighted in Finder / Explorer"
        >
          {emailSent ? '✓ Mail client opened' : 'Email Report'}
        </Button>

        <Button
          variant="secondary"
          onClick={handleOpenFolder}
          loading={openingFolder}
          title="Open the reports folder in Explorer / Finder"
        >
          Open Reports Folder
        </Button>

        <Button
          variant="secondary"
          onClick={() => result.artifacts.blueprintPath && window.api.openReport(result.artifacts.blueprintPath)}
          disabled={!hasBlueprint}
          title={hasBlueprint ? 'Open the site rebuild blueprint in your editor' : 'Blueprint not generated yet'}
          style={hasBlueprint ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' } : {}}
        >
          Open Site Blueprint
        </Button>

        {onNewScan && (
          <Button variant="ghost" onClick={onNewScan}>
            ← New Scan
          </Button>
        )}
      </div>

      {/* Share URL display */}
      {shareUrl && (
        <div style={styles.shareRow}>
          <span style={styles.shareLabel}>Shareable link</span>
          <span style={styles.shareUrl}>{shareUrl}</span>
          <button style={styles.copyBtn} onClick={handleCopyShareUrl} title="Copy to clipboard">
            Copy
          </button>
        </div>
      )}
      {shareError && (
        <div style={styles.shareError}>{shareError}</div>
      )}

      {/* Artifact info */}
      <div style={styles.meta}>
        {hasHtmlReport && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>HTML Report</span>
            <span style={styles.metaPath}>{result.artifacts.htmlPath}</span>
          </div>
        )}
        {hasJsonReport && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>JSON Data</span>
            <span style={styles.metaPath}>{result.artifacts.jsonPath}</span>
          </div>
        )}
        {hasBlueprint && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Site Blueprint</span>
            <span style={styles.metaPath}>{result.artifacts.blueprintPath}</span>
          </div>
        )}
        {!hasHtmlReport && (
          <p style={styles.noteSaved}>
            Report saving is implemented in Phase 7. Run a full scan after that phase to generate on-disk artifacts.
          </p>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-5)',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  metaPath: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  noteSaved: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  shareRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    padding: '8px 12px',
    backgroundColor: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 'var(--radius-md)',
  },
  shareLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-brand)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  shareUrl: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-secondary)',
    flex: 1,
    wordBreak: 'break-all' as const,
  },
  copyBtn: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-brand)',
    background: 'none',
    border: '1px solid var(--color-brand)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  shareError: {
    fontSize: 12,
    color: 'var(--color-high)',
    padding: '6px 0',
  },
}
