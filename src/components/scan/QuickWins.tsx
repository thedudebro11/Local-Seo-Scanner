import { Card } from '../ui/Card'

interface Props {
  quickWins: string[]
  moneyLeaks: string[]
}

export function QuickWins({ quickWins, moneyLeaks }: Props): JSX.Element {
  if (quickWins.length === 0 && moneyLeaks.length === 0) return <></>

  return (
    <div style={styles.wrapper}>
      {quickWins.length > 0 && (
        <Card style={styles.card}>
          <div style={styles.header}>
            <span style={styles.icon}>⚡</span>
            <h3 style={styles.title}>Quick Wins</h3>
            <span style={styles.subtitle}>High impact, fastest to fix</span>
          </div>
          <ol style={styles.list}>
            {quickWins.map((win, i) => (
              <li key={i} style={styles.item}>
                <span style={{ ...styles.index, color: 'var(--color-brand)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={styles.text}>{win}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {moneyLeaks.length > 0 && (
        <Card style={styles.card}>
          <div style={styles.header}>
            <span style={styles.icon}>💸</span>
            <h3 style={styles.title}>Money Leaks</h3>
            <span style={styles.subtitle}>Issues costing this business leads right now</span>
          </div>
          <ol style={styles.list}>
            {moneyLeaks.map((leak, i) => (
              <li key={i} style={styles.item}>
                <span style={{ ...styles.index, color: 'var(--color-high)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={styles.text}>{leak}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-4)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    flex: '1 1 100%',
    marginTop: -4,
    paddingLeft: 26,
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  item: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'flex-start',
  },
  index: {
    fontSize: 11,
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    marginTop: 2,
  },
  text: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.55,
  },
}
