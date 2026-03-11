# Electron Shell

## main.ts

`electron/main.ts` is the Electron main process entry point. It handles:

1. Creating the `BrowserWindow`
2. Registering IPC handlers
3. App lifecycle events

### BrowserWindow Configuration

```typescript
new BrowserWindow({
  width: 1280,
  height: 820,
  minWidth: 960,
  minHeight: 640,
  show: false,                          // Hidden until ready-to-show
  backgroundColor: '#0f172a',           // Dark navy (prevents white flash on load)
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,             // Renderer cannot access Node.js
    nodeIntegration: false,             // No require() in renderer
    sandbox: false,                     // Needed for preload to use require()
  },
  title: 'Local SEO Scanner',
  titleBarStyle: 'default',
})
```

**Key security settings**:
- `contextIsolation: true` — the renderer and preload run in separate JavaScript contexts. The renderer cannot access preload variables directly.
- `nodeIntegration: false` — the renderer cannot call `require()` or access Node.js APIs.
- `sandbox: false` — required so the preload script can use `require('electron')` internally. The contextBridge still enforces isolation.

### Show Strategy

`show: false` combined with `win.once('ready-to-show', () => win.show())` prevents the window from flashing white before the React app loads. The window appears only once the renderer's first paint is ready.

### External Links

```typescript
win.webContents.setWindowOpenHandler(({ url }) => {
  shell.openExternal(url)
  return { action: 'deny' }
})
```

Any link that would open a new window (target="_blank") is redirected to the system browser instead. The Electron window never navigates to external sites.

### Navigation Lock

```typescript
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    const isLocal = parsedUrl.origin === 'http://localhost:5173' || parsedUrl.protocol === 'file:'
    if (!isLocal && !isDev) {
      event.preventDefault()
    }
  })
})
```

Prevents the renderer from navigating to any external URL. In dev mode, navigation to `localhost:5173` (Vite dev server) is allowed.

### Dev vs Production Loading

```typescript
if (isDev && process.env['ELECTRON_RENDERER_URL']) {
  win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  win.webContents.openDevTools()
} else {
  win.loadFile(join(__dirname, '../renderer/index.html'))
}
```

In development, electron-vite sets `ELECTRON_RENDERER_URL` to the Vite dev server URL and DevTools open automatically. In production, the compiled renderer bundle is loaded as a file.

## IPC Registration Order

```typescript
app.whenReady().then(() => {
  mainWindow = createWindow()

  registerScanHandlers(mainWindow)   // scan:start handler needs mainWindow reference
  registerFileHandlers()             // file:* handlers do not need mainWindow
  registerAppHandlers()              // app:* handlers do not need mainWindow
})
```

`registerScanHandlers` receives `mainWindow` so it can call `mainWindow.webContents.send('scan:progress', ...)` to push progress events back to the renderer.

On macOS, the `activate` event re-creates the window if the dock icon is clicked and no windows are open. `registerScanHandlers` is re-called with the new window reference.

## App Lifecycle Events

| Event | Handler |
|---|---|
| `app.whenReady()` | Creates window, registers all IPC handlers |
| `window-all-closed` | Quits app on Windows/Linux; macOS keeps process alive |
| `activate` (macOS) | Re-creates window if none open |
| `web-contents-created` | Locks navigation to local origins only |

## Build Output

- Source: `electron/main.ts`
- Output: `out/main/index.js`
- Format: CommonJS (Electron main process requires CJS)
- All npm dependencies externalized via `externalizeDepsPlugin()`
