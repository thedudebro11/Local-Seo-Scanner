# State Management

The app uses a single Zustand store for all scan-related state.

## Store Location

`src/features/scans/state/useScanStore.ts`

## State Shape

```typescript
interface ScanState {
  // Scan status
  isScanning: boolean          // True while a scan is in progress
  progress: number             // 0–100, updated by scan:progress events
  stepLabel: string            // Human-readable step description
  currentRequest: AuditRequest | null  // The request that started the current scan

  // Results
  latestResult: AuditResult | null   // Set when the most recent scan completes
  savedScans: SavedScanMeta[]        // Loaded from index.json by loadSavedScans()

  // Error
  error: string | null         // Set if startScan throws; cleared by clearError()
}
```

## Actions

### `startScan(request: AuditRequest): Promise<string | null>`

The primary action. Returns the scan ID on success, `null` on failure.

**Sequence**:
1. Sets `isScanning: true`, clears `error` and `latestResult`, saves `currentRequest`
2. Calls `window.api.onScanProgress(callback)` to subscribe to live progress events
   - The callback updates `progress` and `stepLabel` on each `scan:progress` IPC event
3. Calls `window.api.startScan(request)` — a long-running IPC invoke
4. On success: sets `latestResult`, `isScanning: false`, `progress: 100`, `stepLabel: 'Complete.'`
5. On error: sets `isScanning: false`, `error: message`
6. In `finally`: always calls `unsubscribe()` to remove the progress listener

**Why the unsubscribe matters**: `window.api.onScanProgress` adds a listener to `ipcRenderer`. If the listener is not removed after the scan, it will accumulate with each subsequent scan and all old listeners will fire on future progress events.

### `loadSavedScans(): Promise<void>`

Calls `window.api.getSavedScans()` and sets `savedScans`. Called on mount in `DashboardPage` and `SavedScansPage`.

### `clearError(): void`

Resets `error` to `null`. Used by error dismiss UI.

### `clearResult(): void`

Resets `latestResult`, `progress`, `stepLabel`, and `currentRequest` to their initial values. Used when navigating away from results.

## Progress Subscription Pattern

The progress subscription is managed inside `startScan` rather than in a React effect, so it works correctly regardless of which component triggers the scan:

```typescript
const unsubscribe = window.api.onScanProgress((event) => {
  set({ progress: event.percent, stepLabel: event.step })
})
try {
  const result = await window.api.startScan(request)
  // ...
} finally {
  unsubscribe()   // always clean up, even on error
}
```

## latestResult Flow

```
startScan() completes
  → latestResult = AuditResult (in store)
    → NewScanPage useEffect sees latestResult !== null
      → navigate('/scan/results/' + latestResult.id)
        → ScanResultsPage reads latestResult from store
          → renders ScoreOverview, IssueList, QuickWins
```

`ScanResultsPage` validates that `latestResult.id === params.id`. If they do not match (e.g., the user directly navigated to an old result URL), it shows an `EmptyState` because the full `AuditResult` for old scans is not loaded from disk automatically (disk loading was planned for Phase 7 and is implemented via `file:load-scan` but the page does not yet auto-load it).

## Store Initialization

Zustand's `create` initializes the store with all values at their defaults. No persistence (localStorage or Electron store) is used — state resets on app reload. The saved scan list is always loaded fresh from disk via `loadSavedScans()`.
