# IPC Contracts

This document specifies every IPC channel in the application: its direction, request type, response type, and handler location.

## How IPC Works in This App

- **invoke/handle**: Renderer calls `ipcRenderer.invoke(channel, ...args)` → main handles with `ipcMain.handle(channel, handler)` → returns a Promise
- **send/on**: Main calls `webContents.send(channel, data)` → renderer listens with `ipcRenderer.on(channel, listener)` → one-way event, no response

---

## scan:start

**Type**: invoke/handle (bidirectional with response)
**Direction**: Renderer → Main → Renderer (response)
**Handler**: `electron/ipc/scanHandlers.ts`

**Request**: `AuditRequest`
```typescript
{
  url: string
  scanMode: 'quick' | 'full'
  businessType: BusinessType
  maxPages: number
}
```

**Response**: `Promise<AuditResult>`

**Behavior**:
1. Dynamically imports `runAudit` from `src/engine/orchestrator/runAudit`
2. Creates `emitProgress` closure that calls `mainWindow.webContents.send('scan:progress', event)` if window is not destroyed
3. Calls `runAudit(request, emitProgress)`
4. Returns the full `AuditResult` on success
5. On error: throws `new Error('Scan failed: <original message>')`

**Notes**: Long-running. Typically 30 seconds to several minutes. Progress events arrive on `scan:progress` while this is pending.

---

## scan:progress

**Type**: send/on (one-way push)
**Direction**: Main → Renderer
**Sender**: `electron/ipc/scanHandlers.ts` (inside `emitProgress` closure)
**Receiver**: `electron/preload.ts` (via `ipcRenderer.on`), exposed to renderer as `window.api.onScanProgress`

**Payload**: `ScanProgressEvent`
```typescript
{
  step: string      // Human-readable step label
  percent: number   // 0–100
  message?: string  // Optional detail (currently unused)
}
```

**Progress values emitted during a scan**:
```
2%   — Validating URL…
5%   — Launching browser…
8%   — Loading robots.txt…
12%  — Loading sitemap…
16%  — Fetching homepage…
16–65% — Crawling pages… (N fetched, M queued)
66%  — Extracting signals…
72%  — Detecting business type…
76%  — Analyzing technical SEO…
80%  — Analyzing local SEO…
84%  — Analyzing conversions…
88%  — Analyzing content & trust…
90%  — Running performance audit…
92%  — Scoring results…
97%  — Building reports…
100% — Complete.
```

---

## file:list-scans

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/fileHandlers.ts`

**Request**: none (no arguments)

**Response**: `Promise<SavedScanMeta[]>`

**Behavior**: Dynamically imports `listSavedScans` from `scanRepository`, returns all saved scan metadata newest-first.

---

## file:open-report

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/fileHandlers.ts`

**Request**: `string` (absolute path to the HTML report file)

**Response**: `Promise<void>`

**Behavior**: Calls `shell.openPath(reportPath)` — opens the HTML file in the system's default browser.

---

## file:open-folder

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/fileHandlers.ts`

**Request**: `string` (absolute path to the folder)

**Response**: `Promise<void>`

**Behavior**: Calls `shell.showItemInFolder(folderPath)` — reveals the folder in Finder (macOS) or Explorer (Windows).

---

## file:load-scan

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/fileHandlers.ts`

**Request**: `string` (scan ID, e.g. `'example.com_1710000000000'`)

**Response**: `Promise<AuditResult | null>`

**Behavior**: Dynamically imports `loadScanById` from `scanRepository`, reads `report.json` for the given scan ID. Returns `null` if the file does not exist or cannot be read.

---

## app:version

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/appHandlers.ts`

**Request**: none

**Response**: `Promise<string>` — app version from `app.getVersion()` (reads `package.json` `version` field)

---

## app:platform

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/appHandlers.ts`

**Request**: none

**Response**: `Promise<string>` — `process.platform` value (`'win32'`, `'darwin'`, `'linux'`)

---

## app:reports-path

**Type**: invoke/handle
**Direction**: Renderer → Main
**Handler**: `electron/ipc/appHandlers.ts`

**Request**: none

**Response**: `Promise<string>` — Absolute path to the reports directory (e.g. `C:\Users\oscar\AppData\Roaming\local-seo-scanner\reports`)

**Behavior**: Dynamically imports `getReportsDir` from `pathResolver`.

---

## Channel Naming Convention

| Prefix | Domain |
|---|---|
| `scan:` | Audit scan operations |
| `file:` | File system and report operations |
| `app:` | Application metadata |
