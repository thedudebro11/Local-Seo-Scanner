import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { registerScanHandlers } from './ipc/scanHandlers'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerAppHandlers } from './ipc/appHandlers'
import { initReportsDir } from '../src/engine/storage/pathResolver'

const isDev = process.env.NODE_ENV === 'development'

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
  // Initialize engine storage path before any IPC handler can trigger a scan
  initReportsDir(app.getPath('userData'))

  mainWindow = createWindow()

  // Register all IPC handlers
  registerScanHandlers(mainWindow)
  registerFileHandlers()
  registerAppHandlers()

  app.on('activate', () => {
    // On macOS, re-create the window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      registerScanHandlers(mainWindow)
    }
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
