import { createHashRouter } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import DashboardPage from '../features/dashboard/DashboardPage'
import NewScanPage from '../features/scans/NewScanPage'
import ScanResultsPage from '../features/scans/ScanResultsPage'
import SavedScansPage from '../features/scans/SavedScansPage'
import SettingsPage from '../features/settings/SettingsPage'
import BulkScanPage from '../features/bulk/BulkScanPage'
import MarketDiscoveryPage from '../features/discovery/MarketDiscoveryPage'
import MarketDashboardPage from '../features/market/MarketDashboardPage'

/**
 * Hash-based router — safe for Electron's file:// protocol.
 * Routes are nested under AppShell which provides the persistent layout.
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'scan/new', element: <NewScanPage /> },
      { path: 'scan/results/:id', element: <ScanResultsPage /> },
      { path: 'scan/bulk', element: <BulkScanPage /> },
      { path: 'scan/discovery', element: <MarketDiscoveryPage /> },
      { path: 'market', element: <MarketDashboardPage /> },
      { path: 'scans', element: <SavedScansPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
