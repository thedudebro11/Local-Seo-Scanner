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

  const hasHtmlReport = Boolean(result.artifacts.htmlPath)
  const hasJsonReport = Boolean(result.artifacts.jsonPath)

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

  return (
    <div style={styles.wrapper}>
      <div style={styles.actions}>
        <Button
          variant="primary"
          onClick={handleOpenReport}
          loading={openingReport}
          disabled={!hasHtmlReport}
          title={hasHtmlReport ? 'Open the HTML report in your browser' : 'Report not yet saved (available in Phase 7)'}
        >
          Open HTML Report
        </Button>

        <Button
          variant="secondary"
          onClick={handleOpenFolder}
          loading={openingFolder}
          title="Open the reports folder in Explorer / Finder"
        >
          Open Reports Folder
        </Button>

        {onNewScan && (
          <Button variant="ghost" onClick={onNewScan}>
            ← New Scan
          </Button>
        )}
      </div>

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
}
