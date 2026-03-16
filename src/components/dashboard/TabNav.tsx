/**
 * Reusable horizontal tab navigation — Phase 16.
 *
 * Renders a row of tab buttons with an active underline indicator.
 * Tabs can optionally show a numeric count badge.
 */

export interface Tab {
  id: string
  label: string
  /** Optional count shown as a small badge. */
  count?: number
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function TabNav({ tabs, active, onChange }: Props): JSX.Element {
  return (
    <div style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(isActive ? styles.activeTab : {}) }}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span style={{ ...styles.count, ...(isActive ? styles.activeCount : {}) }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid var(--color-border)',
    overflowX: 'auto',
    flexShrink: 0,
  },
  tab: {
    padding: '10px 18px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    marginBottom: -1,
    lineHeight: 1.4,
    transition: 'color 0.12s',
  },
  activeTab: {
    color: 'var(--color-brand)',
    borderBottomColor: 'var(--color-brand)',
    fontWeight: 600,
  },
  count: {
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 99,
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  activeCount: {
    backgroundColor: 'var(--color-bg-raised)',
    color: 'var(--color-brand)',
  },
}
