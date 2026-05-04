import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import ActivationPage from '../features/license/ActivationPage'
import { useLicenseStore } from '../features/license/useLicenseStore'

type Gate = 'checking' | 'locked' | 'unlocked'

export default function App(): JSX.Element {
  const [gate, setGate] = useState<Gate>('checking')
  const [updateReady, setUpdateReady] = useState<{ version: string } | null>(null)
  const [installing, setInstalling] = useState(false)
  const check = useLicenseStore((s) => s.check)

  useEffect(() => {
    check().then((valid) => setGate(valid ? 'unlocked' : 'locked'))
  }, [check])

  useEffect(() => {
    const off = window.api.onUpdateDownloaded((info) => setUpdateReady(info))
    return off
  }, [])

  const handleInstall = async (): Promise<void> => {
    setInstalling(true)
    await window.api.installUpdate()
  }

  return (
    <>
      {updateReady && (
        <div style={updateBanner.bar}>
          <span style={updateBanner.msg}>
            Update {updateReady.version} is ready — restart to install.
          </span>
          <button style={updateBanner.btn} onClick={handleInstall} disabled={installing}>
            {installing ? 'Restarting…' : 'Restart & Update'}
          </button>
          <button style={updateBanner.dismiss} onClick={() => setUpdateReady(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      {gate === 'checking' && <CheckingScreen />}
      {gate === 'locked' && <ActivationPage onActivated={() => setGate('unlocked')} />}
      {gate === 'unlocked' && <RouterProvider router={router} />}
    </>
  )
}

function CheckingScreen(): JSX.Element {
  return (
    <div style={checkingStyles.page}>
      <span style={checkingStyles.icon}>◎</span>
      <p style={checkingStyles.text}>Loading…</p>
    </div>
  )
}

const updateBanner: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px',
    backgroundColor: 'var(--color-brand)',
    color: '#fff', fontSize: 13,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  msg: { flex: 1, fontWeight: 500 },
  btn: {
    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
    backgroundColor: '#fff', color: 'var(--color-brand)',
    fontWeight: 700, fontSize: 12,
  },
  dismiss: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', fontSize: 14, padding: '2px 4px',
  },
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
