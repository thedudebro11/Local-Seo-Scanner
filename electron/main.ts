import { app, BrowserWindow, Notification, shell, ipcMain } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { registerScanHandlers } from './ipc/scanHandlers'
import { registerBulkScanHandlers } from './ipc/bulkScanHandlers'
import { registerDiscoveryHandlers } from './ipc/discoveryHandlers'
import { registerMarketHandlers } from './ipc/marketHandlers'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerAppHandlers } from './ipc/appHandlers'
import { registerLicenseHandlers } from './ipc/licenseHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerMonitoringHandlers } from './ipc/monitoringHandlers'
import { initReportsDir } from '../src/engine/storage/pathResolver'
import { initMonitoringDir } from '../src/engine/monitoring/monitoringPaths'
import { initLicenseDir } from '../src/engine/license/licensePaths'
import { initSettingsDir } from '../src/engine/settings/settingsPaths'
import { startMonitoringScheduler } from '../src/engine/monitoring/monitoringScheduler'

const isDev = process.env.NODE_ENV === 'development'

// ── Global error guards ────────────────────────────────────────────────────────
// Unhandled errors in the main process would otherwise silently crash the app.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection:', reason)
})

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Local SEO Scanner',
    titleBarStyle: 'default',
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  // Open external links in the system browser, not the Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // Initialize engine storage paths before any IPC handler can trigger a scan
  const userData = app.getPath('userData')
  initReportsDir(userData)
  initMonitoringDir(userData)
  initLicenseDir(userData)
  initSettingsDir(userData)

  mainWindow = createWindow()

  // Register all IPC handlers
  registerScanHandlers(mainWindow)
  registerBulkScanHandlers(mainWindow)
  registerDiscoveryHandlers()
  registerMarketHandlers()
  registerFileHandlers()
  registerAppHandlers()
  registerLicenseHandlers()
  registerSettingsHandlers()
  registerMonitoringHandlers()

  // Start the auto-scheduler for monitoring tracked sites
  startMonitoringScheduler((title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  app.on('activate', () => {
    // On macOS, re-create the window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      registerScanHandlers(mainWindow)
      registerBulkScanHandlers(mainWindow)
    }
  })

  // ── Auto-update ──────────────────────────────────────────────────────────────
  if (!isDev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update:available', { version: info.version })
    })

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update:downloaded', { version: info.version })
    })

    autoUpdater.on('error', (err) => {
      console.error('[autoUpdater] error:', err.message)
    })

    // Delay first check so it doesn't compete with app startup
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000)
  }

  // Allow renderer to trigger install-and-relaunch
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Prevent navigation to external URLs in the renderer
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    const isDev = process.env.NODE_ENV === 'development'
    const isLocal =
      parsedUrl.origin === 'http://localhost:5173' ||
      parsedUrl.protocol === 'file:'
    if (!isLocal && !isDev) {
      event.preventDefault()
    }
  })
})
