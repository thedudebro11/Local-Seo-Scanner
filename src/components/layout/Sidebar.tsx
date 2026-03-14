import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',                label: 'Dashboard',       icon: '◈' },
  { to: '/scan/new',        label: 'New Scan',        icon: '⊕' },
  { to: '/scan/bulk',       label: 'Bulk Scan',       icon: '⊟' },
  { to: '/scan/discovery',  label: 'Market Discovery', icon: '⊛' },
  { to: '/market',          label: 'Market Intel',    icon: '⊠' },
  { to: '/scans',           label: 'Saved Scans',     icon: '⊞' },
  { to: '/settings',        label: 'Settings',        icon: '⚙' },
]

export default function Sidebar(): JSX.Element {
  return (
    <nav style={styles.sidebar}>
      {/* Logo / App name */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>◉</span>
        <span style={styles.brandName}>SEO Scanner</span>
      </div>

      {/* Nav links */}
      <ul style={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div style={styles.sidebarFooter}>
        <span style={styles.footerText}>Local SEO Scanner</span>
        <span style={styles.footerVersion}>v1.0.0</span>
      </div>
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    backgroundColor: 'var(--color-bg-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-4) 0',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4) var(--space-6)',
  },
  brandIcon: {
    fontSize: 20,
    color: 'var(--color-brand)',
  },
  brandName: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'var(--color-text-primary)',
    textTransform: 'uppercase',
  },
  navList: {
    listStyle: 'none',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '0 var(--space-2)',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all var(--transition-fast)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  navLinkActive: {
    backgroundColor: 'var(--color-brand-light)',
    color: 'var(--color-brand-hover)',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  sidebarFooter: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  footerText: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  footerVersion: {
    fontSize: 10,
    color: 'var(--color-text-muted)',
  },
}
