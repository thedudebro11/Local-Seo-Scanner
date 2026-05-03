import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import ActivationPage from '../features/license/ActivationPage'
import { useLicenseStore } from '../features/license/useLicenseStore'

type Gate = 'checking' | 'locked' | 'unlocked'

export default function App(): JSX.Element {
  const [gate, setGate] = useState<Gate>('checking')
  const check = useLicenseStore((s) => s.check)

  useEffect(() => {
    check().then((valid) => setGate(valid ? 'unlocked' : 'locked'))
  }, [check])

  if (gate === 'checking') return <CheckingScreen />
  if (gate === 'locked') return <ActivationPage onActivated={() => setGate('unlocked')} />
  return <RouterProvider router={router} />
}

function CheckingScreen(): JSX.Element {
  return (
    <div style={checkingStyles.page}>
      <span style={checkingStyles.icon}>◎</span>
      <p style={checkingStyles.text}>Loading…</p>
    </div>
  )
}

const checkingStyles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-base)',
    fontFamily: 'var(--font-sans)',
    gap: 12,
  },
  icon: {
    fontSize: 32,
    color: 'var(--color-brand)',
    opacity: 0.6,
  },
  text: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    margin: 0,
  },
}
