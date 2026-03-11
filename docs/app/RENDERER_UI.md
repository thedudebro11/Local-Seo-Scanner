# Renderer UI

## Router

`src/app/routes.tsx` uses `createHashRouter` from react-router-dom v6. Hash routing (`#/`) is used instead of HTML5 history routing because Electron loads the renderer from a `file://` URL in production, where HTML5 pushState routing does not work.

All routes are nested under `AppShell`:

| Path | Component | Description |
|---|---|---|
| `/` | `DashboardPage` | Default home screen |
| `/scan/new` | `NewScanPage` | Scan form and progress view |
| `/scan/results/:id` | `ScanResultsPage` | Full results for a completed scan |
| `/scans` | `SavedScansPage` | History of all saved scans |
| `/settings` | `SettingsPage` | App settings |

## Layout System

`AppShell` provides the persistent layout shell. All pages render into its `<Outlet />`. The shell contains:
- `Sidebar` — left navigation with links to all main pages
- `Topbar` — top bar displaying the current page title
- Main content area where `<Outlet />` renders the active page

## Pages

### DashboardPage (`src/features/dashboard/DashboardPage.tsx`)

- Calls `loadSavedScans()` on mount to populate the scan history
- Shows a summary banner if `latestResult` is in the Zustand store
- Displays the list of `savedScans` from the store

### NewScanPage (`src/features/scans/NewScanPage.tsx`)

The primary user-facing page. Manages a two-phase view:

1. **Scan form** — shown when `isScanning === false`
   - Renders `<ScanForm>` with a submit handler that calls `useScanStore.startScan(request)`
2. **Progress view** — shown when `isScanning === true`
   - Renders `<ScanProgress>` which reads `progress` and `stepLabel` from the store

After the scan completes, a `useEffect` watches for `latestResult` becoming non-null and navigates to `/scan/results/:id`.

### ScanResultsPage (`src/features/scans/ScanResultsPage.tsx`)

- Reads the `:id` URL parameter
- Reads `latestResult` from the Zustand store
- If `latestResult.id` does not match the URL `:id`, shows an `EmptyState` (the disk-load pathway for navigating to old results)
- If IDs match, renders the full results using `ScoreOverview`, `IssueList`, `QuickWins`, and `ReportActions`

### SavedScansPage (`src/features/scans/SavedScansPage.tsx`)

Lists all saved scans from `useScanStore.savedScans`. Each entry shows domain, date, overall score, and business type. Clicking a scan can navigate to its results or open the HTML report.

### SettingsPage (`src/features/settings/SettingsPage.tsx`)

App configuration. Shows the reports directory path (via `window.api.getReportsPath()`), app version, and platform.

## Scan-Specific Components

### ScanForm (`src/components/scan/ScanForm.tsx`)

The input form for starting a scan. Contains:
- URL text input
- `<BusinessTypeSelect>` dropdown
- Scan mode selector (quick / full)
- Max pages input
- Submit button

On submit, constructs an `AuditRequest` and calls `useScanStore.startScan`.

### BusinessTypeSelect (`src/components/scan/BusinessTypeSelect.tsx`)

A `<Select>` wrapper offering the business type options: auto, restaurant, salon, roofer, auto_shop, contractor, dentist, other.

### ScanProgress (`src/components/scan/ScanProgress.tsx`)

Shows a `<Progress>` bar (0–100) and the current `stepLabel` string from the store. Displayed while `isScanning === true`.

### ScoreOverview (`src/components/scan/ScoreOverview.tsx`)

Renders the 5 category scores plus the overall score as a grid of score cards. Each card shows the numeric value, category name, and score band label. Color-coded: green (Strong), blue (Solid), amber (Needs Work), red (Leaking Opportunity).

### IssueList (`src/components/scan/IssueList.tsx`)

Renders the `findings` array grouped by category. Each finding shows:
- Severity badge (HIGH / MEDIUM / LOW)
- Title
- Summary
- "Why it matters" detail (expandable or always visible)
- "What to do" recommendation
- Affected URLs if present

### QuickWins (`src/components/scan/QuickWins.tsx`)

Two panels side by side:
- **Quick Wins** — the top 5 `quickWins` strings (recommendations from high/medium findings)
- **Money Leaks** — the top 5 `moneyLeaks` strings (summaries from high-severity findings only)

### ReportActions (`src/components/reports/ReportActions.tsx`)

Two buttons:
- "Open HTML Report" — calls `window.api.openReport(result.artifacts.htmlPath)` to open the HTML file in the system browser
- "Open Folder" — calls `window.api.openFolder(dir)` to open the scan directory in Finder/Explorer

## UI Primitives (`src/components/ui/`)

| Component | Description |
|---|---|
| `Button` | Styled button with variant support |
| `Card` | White rounded-corner container |
| `Input` | Text input with label |
| `Select` | Dropdown with label |
| `Badge` | Inline label pill |
| `Progress` | Horizontal progress bar |
| `EmptyState` | Centered illustration + heading + subtext |
