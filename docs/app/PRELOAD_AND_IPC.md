# Preload Script and IPC

## Security Model

Electron's security model separates the renderer (untrusted web content) from the main process (trusted OS-level code) via a process boundary. The preload script is the bridge:

- The preload runs in a privileged Node.js context but shares the renderer's JavaScript world via `contextBridge.exposeInMainWorld`
- `contextIsolation: true` means the preload's own scope is NOT accessible to renderer code — only what is explicitly exposed via `contextBridge` is available
- The renderer can only call functions the preload explicitly whitelists
- All calls are asynchronous (Promise-based invoke or event-based listener)

## contextBridge Exposure

`electron/preload.ts` exposes a single object `window.api` with 9 methods:

```typescript
contextBridge.exposeInMainWorld('api', api)
```

The `ElectronAPI` interface in `src/engine/types/ipc.ts` mirrors this object and augments the global `Window` type so renderer TypeScript code gets proper types on `window.api`.

## Exposed API Methods

### Scan

#### `window.api.startScan(request: AuditRequest): Promise<AuditResult>`

Invokes the `scan:start` IPC channel. Starts the full audit and returns the complete `AuditResult` when done. This is a long-running operation (typically 30 seconds to several minutes depending on site size and Lighthouse).

**Channel**: `scan:start` (ipcRenderer.invoke → ipcMain.handle)
**Direction**: Renderer → Main (invoke/handle, bidirectional with response)
**Request type**: `AuditRequest { url, scanMode, businessType, maxPages }`
**Response type**: `AuditResult`

#### `window.api.onScanProgress(callback: (event: ScanProgressEvent) => void): () => void`

Subscribes to `scan:progress` events pushed from the main process. Returns an unsubscribe function. The unsubscribe function must be called in `useEffect` cleanup to prevent memory leaks.

**Channel**: `scan:progress` (ipcRenderer.on ← webContents.send)
**Direction**: Main → Renderer (one-way push)
**Event type**: `ScanProgressEvent { step: string, percent: number, message?: string }`

Usage in `useScanStore`:
```typescript
const unsubscribe = window.api.onScanProgress((event) => {
  set({ progress: event.percent, stepLabel: event.step })
})
// ... scan runs ...
unsubscribe() // called in finally block
```

### File / Report

#### `window.api.getSavedScans(): Promise<SavedScanMeta[]>`

Returns all saved scan metadata from `index.json`, newest first.

**Channel**: `file:list-scans`
**Handler**: `listSavedScans()` from `scanRepository`

#### `window.api.openReport(path: string): Promise<void>`

Opens a saved HTML report file in the system's default browser using `shell.openPath()`.

**Channel**: `file:open-report`
**Handler**: `shell.openPath(reportPath)`

#### `window.api.openFolder(path: string): Promise<void>`

Reveals the reports folder in Finder (macOS) or Explorer (Windows) using `shell.showItemInFolder()`.

**Channel**: `file:open-folder`
**Handler**: `shell.showItemInFolder(folderPath)`

#### `window.api.loadScan(scanId: string): Promise<AuditResult | null>`

Loads a full `AuditResult` from disk by scan ID. Returns `null` if the scan file does not exist.

**Channel**: `file:load-scan`
**Handler**: `loadScanById(scanId)` from `scanRepository`

### App

#### `window.api.getVersion(): Promise<string>`

Returns the app version from `app.getVersion()` (reads from `package.json`).

**Channel**: `app:version`

#### `window.api.getPlatform(): Promise<string>`

Returns `process.platform` (e.g., `'win32'`, `'darwin'`, `'linux'`).

**Channel**: `app:platform`

#### `window.api.getReportsPath(): Promise<string>`

Returns the absolute path to the reports directory (`<userData>/reports`).

**Channel**: `app:reports-path`
**Handler**: `getReportsDir()` from `pathResolver`

## All IPC Channels Summary

| Channel | Type | Direction | Handler file |
|---|---|---|---|
| `scan:start` | invoke/handle | Renderer→Main | `scanHandlers.ts` |
| `scan:progress` | send/on | Main→Renderer | `scanHandlers.ts` (sends), preload (receives) |
| `file:list-scans` | invoke/handle | Renderer→Main | `fileHandlers.ts` |
| `file:open-report` | invoke/handle | Renderer→Main | `fileHandlers.ts` |
| `file:open-folder` | invoke/handle | Renderer→Main | `fileHandlers.ts` |
| `file:load-scan` | invoke/handle | Renderer→Main | `fileHandlers.ts` |
| `app:version` | invoke/handle | Renderer→Main | `appHandlers.ts` |
| `app:platform` | invoke/handle | Renderer→Main | `appHandlers.ts` |
| `app:reports-path` | invoke/handle | Renderer→Main | `appHandlers.ts` |

## Dynamic Imports in IPC Handlers

IPC handlers use dynamic `import()` to load engine modules lazily:

```typescript
ipcMain.handle('scan:start', async (_, request) => {
  const { runAudit } = await import('../../src/engine/orchestrator/runAudit')
  return runAudit(request, emitProgress)
})
```

This pattern ensures:
1. Engine code is never bundled into the preload or renderer
2. The engine is loaded only when actually needed (first scan)
3. Playwright and other heavy dependencies are not loaded at app startup
