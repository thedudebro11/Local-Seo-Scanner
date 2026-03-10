You are acting as a senior staff-level full-stack engineer, Electron architect, TypeScript lead, and build reliability engineer.

Your job is to build a FULLY RUNNABLE desktop application from the specification below.

This is NOT a mockup.
This is NOT pseudocode.
This is NOT a partial scaffold.
This is NOT a UI-only prototype.

I want a real implementation that is structured, modular, and actually runs.

==================================================
PROJECT GOAL
==================================================

Build a desktop app with Electron + React + Vite + TypeScript that scans local business websites, analyzes technical SEO / local SEO / conversion signals, scores the site, and generates JSON + HTML reports saved on disk.

This tool is not just a generic SEO scanner.
It is a local business revenue leak detector.

The purpose is to identify:
- what is hurting visibility
- what is hurting conversions
- what is hurting trust
- what is costing the business leads

The app should be usable for real outreach and real client work.

==================================================
NON-NEGOTIABLE STACK
==================================================

Use exactly this stack unless a compatibility issue makes a tiny substitution absolutely necessary:

- Electron
- React
- Vite
- TypeScript
- Zustand
- Playwright
- Lighthouse
- Cheerio
- fs-extra
- zod

Optional but allowed if helpful:
- React Router
- Recharts
- date-fns
- clsx

Do NOT substitute major frameworks.
Do NOT switch to Next.js.
Do NOT switch to Tauri.
Do NOT switch to plain JS.
Do NOT switch to a browser-only web app.

==================================================
EXECUTION REQUIREMENTS
==================================================

Build this as a fully runnable Electron + React + Vite + TypeScript desktop app.

Requirements:
- Use strict TypeScript
- Use Electron security best practices
- Use a preload bridge and typed IPC
- Keep renderer and Node logic properly separated
- Use mutually compatible dependency versions
- Do not substitute the requested stack unless required for compatibility
- Implement features end-to-end, not as placeholders
- Prioritize runnable, integrated code over elegant over-abstraction
- Add practical error handling and graceful failure states
- Keep modules modular and reusable
- Save scans as real JSON + HTML artifacts on disk
- Ensure the app can actually run with npm install and npm run dev

Definition of done for every implemented feature:
- the file exists
- it is imported where needed
- it is actually wired into execution flow
- it compiles
- it has no obvious dead code
- it supports the real app flow

If something cannot be fully completed, clearly label it as incomplete.
Do NOT pretend incomplete features are done.

==================================================
ELECTRON SECURITY REQUIREMENTS
==================================================

Use secure defaults:
- contextIsolation: true
- nodeIntegration: false
- sandbox if practical
- preload script only
- no direct Node access in renderer
- typed IPC request/response contracts
- open external URLs safely
- no unsafe renderer shortcuts

==================================================
CODE QUALITY REQUIREMENTS
==================================================

- Use strict TypeScript
- Avoid `any` unless absolutely unavoidable
- Prefer explicit interfaces and types
- Keep business logic out of React components when possible
- Keep Electron as the shell, not the business logic center
- Organize the audit engine as reusable modules
- Favor correctness and clarity over cleverness
- Do not over-engineer abstractions early
- Do not generate fake code that looks complete but is not wired

==================================================
PRODUCT REQUIREMENTS
==================================================

Core user flow:
1. User launches desktop app
2. User enters website URL
3. User chooses scan mode
4. User chooses business type or auto-detect
5. User runs scan
6. App shows progress
7. App generates findings and scores
8. App saves JSON + HTML report on disk
9. App shows score/results in UI
10. User can open the saved HTML report from the app
11. User can view prior saved scans

Business purpose:
- technical SEO audit
- local SEO audit
- conversion leak detection
- trust signal detection
- client-facing report generation

==================================================
SCORING CATEGORIES
==================================================

The app must score these categories:
- Technical
- Local SEO
- Conversion
- Content
- Trust
- Overall

Default weighting:
- Technical: 25%
- Local SEO: 30%
- Conversion: 25%
- Content: 10%
- Trust: 10%

Use practical local-business-oriented scoring, not enterprise SEO scoring.

==================================================
MVP FEATURE REQUIREMENTS
==================================================

The v1 app must support these capabilities:

Input:
- website URL
- scan mode: quick / full
- business type:
  - auto
  - restaurant
  - salon
  - roofer
  - auto_shop
  - contractor
  - dentist
  - other
- max pages

Technical checks:
- homepage title present
- homepage meta description present
- homepage H1 present
- important pages indexable
- sitemap present
- robots present
- HTTPS
- canonical presence
- broken page detection
- image alt coverage if practical in MVP

Local SEO checks:
- phone found
- address found
- city/state found
- LocalBusiness schema found
- hours found
- map/directions signals found
- service area / local relevance clues

Conversion checks:
- homepage CTA present
- call/quote/book/order action present
- contact page present
- form present
- phone visibility clues
- trust near action areas if practical

Trust checks:
- testimonials/reviews detected
- about page present
- trust/credibility keywords
- HTTPS
- gallery/proof signals if practical

Outputs:
- findings list
- grouped findings by category
- severity levels
- quick wins
- money leaks
- category scores
- overall score
- saved JSON report
- saved HTML report
- saved scan history

==================================================
EXPECTED ARCHITECTURE
==================================================

Use this architecture shape:

React UI
  ↓
Electron preload bridge
  ↓
Electron main IPC handlers
  ↓
Audit orchestrator
  ↓
Crawler + extractors + analyzers + Lighthouse + scoring + reports
  ↓
Saved scan artifacts on disk

Keep the audit engine reusable and mostly separate from UI concerns.

==================================================
RECOMMENDED FOLDER STRUCTURE
==================================================

Use this as the base structure unless a very small change is needed:

local-seo-scanner/
├─ electron/
│  ├─ main.ts
│  ├─ preload.ts
│  ├─ ipc/
│  │  ├─ scanHandlers.ts
│  │  ├─ fileHandlers.ts
│  │  └─ appHandlers.ts
│
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  ├─ routes.tsx
│  │  └─ styles/
│  │     ├─ globals.css
│  │     └─ tokens.css
│  │
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  └─ Topbar.tsx
│  │  ├─ scan/
│  │  │  ├─ ScanForm.tsx
│  │  │  ├─ ScanProgress.tsx
│  │  │  ├─ ScoreOverview.tsx
│  │  │  ├─ IssueList.tsx
│  │  │  ├─ QuickWins.tsx
│  │  │  └─ BusinessTypeSelect.tsx
│  │  ├─ reports/
│  │  │  ├─ SavedScansTable.tsx
│  │  │  ├─ ReportActions.tsx
│  │  │  └─ ScoreBreakdownChart.tsx
│  │  └─ ui/
│  │     ├─ Button.tsx
│  │     ├─ Card.tsx
│  │     ├─ Input.tsx
│  │     ├─ Badge.tsx
│  │     ├─ Progress.tsx
│  │     └─ EmptyState.tsx
│  │
│  ├─ features/
│  │  ├─ dashboard/
│  │  │  └─ DashboardPage.tsx
│  │  ├─ scans/
│  │  │  ├─ NewScanPage.tsx
│  │  │  ├─ ScanResultsPage.tsx
│  │  │  ├─ SavedScansPage.tsx
│  │  │  └─ state/useScanStore.ts
│  │  └─ settings/
│  │     └─ SettingsPage.tsx
│  │
│  ├─ engine/
│  │  ├─ orchestrator/
│  │  │  ├─ runAudit.ts
│  │  │  ├─ auditPipeline.ts
│  │  │  └─ progressEmitter.ts
│  │  │
│  │  ├─ crawl/
│  │  │  ├─ discoverUrls.ts
│  │  │  ├─ fetchHtml.ts
│  │  │  ├─ normalizeUrl.ts
│  │  │  ├─ classifyPage.ts
│  │  │  ├─ robots.ts
│  │  │  ├─ sitemap.ts
│  │  │  └─ internalLinkGraph.ts
│  │  │
│  │  ├─ extractors/
│  │  │  ├─ extractMeta.ts
│  │  │  ├─ extractHeadings.ts
│  │  │  ├─ extractSchema.ts
│  │  │  ├─ extractContactSignals.ts
│  │  │  ├─ extractLocalSignals.ts
│  │  │  ├─ extractCTAs.ts
│  │  │  ├─ extractTrustSignals.ts
│  │  │  ├─ extractImages.ts
│  │  │  └─ extractTextStats.ts
│  │  │
│  │  ├─ analyzers/
│  │  │  ├─ technicalAnalyzer.ts
│  │  │  ├─ localSeoAnalyzer.ts
│  │  │  ├─ conversionAnalyzer.ts
│  │  │  ├─ contentAnalyzer.ts
│  │  │  ├─ trustAnalyzer.ts
│  │  │  └─ businessTypeDetector.ts
│  │  │
│  │  ├─ lighthouse/
│  │  │  ├─ runLighthouse.ts
│  │  │  └─ mapLighthouseResults.ts
│  │  │
│  │  ├─ scoring/
│  │  │  ├─ scoreTechnical.ts
│  │  │  ├─ scoreLocalSeo.ts
│  │  │  ├─ scoreConversion.ts
│  │  │  ├─ scoreContent.ts
│  │  │  ├─ scoreTrust.ts
│  │  │  ├─ weightedFinalScore.ts
│  │  │  └─ prioritizeFindings.ts
│  │  │
│  │  ├─ reports/
│  │  │  ├─ buildJsonReport.ts
│  │  │  ├─ buildHtmlReport.ts
│  │  │  ├─ buildClientSummary.ts
│  │  │  └─ reportTemplates.ts
│  │  │
│  │  ├─ storage/
│  │  │  ├─ scanRepository.ts
│  │  │  ├─ pathResolver.ts
│  │  │  └─ openReport.ts
│  │  │
│  │  ├─ types/
│  │  │  ├─ audit.ts
│  │  │  ├─ findings.ts
│  │  │  ├─ scores.ts
│  │  │  └─ ipc.ts
│  │  │
│  │  └─ utils/
│  │     ├─ logger.ts
│  │     ├─ domain.ts
│  │     ├─ text.ts
│  │     ├─ phone.ts
│  │     ├─ address.ts
│  │     ├─ keywords.ts
│  │     └─ safeJson.ts
│
├─ reports/
├─ data/
├─ screenshots/
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ electron-builder.json

==================================================
DATA MODEL REQUIREMENTS
==================================================

Define strong shared types for:
- AuditRequest
- AuditResult
- CrawledPage
- Finding
- CategoryScore
- AuditScores
- SavedScanMeta
- IPC request/response payloads
- scan progress events

At minimum support:
- request URL
- scan mode
- business type
- max pages
- findings
- scores
- quick wins
- money leaks
- scan timestamp
- artifact paths

==================================================
FINDING FORMAT REQUIREMENTS
==================================================

Every finding should include:
- id
- category
- severity
- title
- summary
- whyItMatters
- recommendation
- affectedUrls if relevant

Write findings in owner-friendly language, not just dev language.

Bad:
- Missing H1 tag.

Better:
- Your homepage is missing a clear main heading, which can weaken both Google’s understanding of the page and the clarity of your main offer to visitors.

Bad:
- Mobile performance 41.

Better:
- Your site appears slow on mobile, which can cause potential customers to leave before they reach your booking or contact actions.

==================================================
SCAN FLOW REQUIREMENTS
==================================================

The scan pipeline should approximately work like this:

1. Validate request
2. Normalize URL
3. Fetch homepage
4. Load robots.txt
5. Load sitemap.xml
6. Discover internal URLs up to maxPages
7. Fetch important pages
8. Extract page signals
9. Detect or confirm business type
10. Run analyzers
11. Run Lighthouse on 1 to 3 pages max
12. Score categories
13. Prioritize findings into quickWins and moneyLeaks
14. Build JSON report
15. Build HTML report
16. Save scan metadata
17. Return final result to UI

==================================================
CRAWLER REQUIREMENTS
==================================================

Crawler behavior:
- same domain only
- strip fragments
- strip common tracking params
- skip mailto/tel/javascript
- avoid obvious junk pages if practical
- support max page cap
- classify pages roughly:
  - home
  - contact
  - about
  - service
  - location
  - booking
  - menu
  - gallery
  - blog
  - other

Do not overbuild the crawler.
For MVP, accuracy and stability matter more than crawling every edge case.

==================================================
ERROR HANDLING REQUIREMENTS
==================================================

Add practical error handling for:
- invalid URL input
- fetch failures
- page load timeouts
- Playwright launch issues
- Lighthouse failures
- file write failures
- malformed HTML / missing content
- partial scan failures

If one part fails, the app should degrade gracefully when possible and still return partial useful results.

==================================================
REPORT REQUIREMENTS
==================================================

The app must generate:
1. a raw JSON report
2. a polished HTML report
3. an in-app summary view

The HTML report should include:
- domain scanned
- scan timestamp
- overall score
- category scores
- quick wins
- money leaks
- grouped findings
- brief page inventory summary

The app must save report artifacts to disk and keep a saved scan history.

==================================================
UI REQUIREMENTS
==================================================

The UI should feel modern, clean, and premium.

Pages needed for v1:
- Dashboard
- New Scan
- Scan Results
- Saved Scans

UI requirements:
- clean card-based design
- progress bar during scan
- score cards
- findings grouped by category
- easy “Open HTML Report” action
- easy “Open Reports Folder” action
- reasonable empty states
- clear error states

Use React + Vite + TypeScript from the start.
Do not build the first version with plain HTML renderer UI.

==================================================
IMPLEMENTATION PHASES
==================================================

You must build in phases, not in one giant messy blast.

Phase 1:
- final folder structure
- package.json
- tsconfig files
- vite config
- Electron main/preload shell
- React app shell
- typed IPC skeleton
- base shared types

Phase 2:
- scan form
- Zustand store
- fake progress wiring
- stub result flow
- routes/pages structure

Phase 3:
- real crawler
- URL normalization
- homepage fetch
- robots/sitemap checks
- internal URL discovery
- page classification

Phase 4:
- extractors
- meta/headings/schema/contact/local/CTA/trust/image/text extraction

Phase 5:
- analyzers
- business type detection
- findings generation

Phase 6:
- scoring
- quick wins
- money leaks
- result shaping

Phase 7:
- JSON report generation
- HTML report generation
- saved scan history
- open report actions

Phase 8:
- Lighthouse integration
- stronger performance notes
- polish and hardening

==================================================
IMPORTANT: BEFORE WRITING CODE
==================================================

Before generating implementation code, first output:

1. Final dependency list with exact package names
2. Recommended mutually compatible versions
3. Final folder structure
4. Build phases
5. Main risk points / compatibility concerns
6. Short explanation of any changes you think are necessary before coding

Do NOT start coding until that planning section is complete.

==================================================
IMPORTANT: WHEN CODING
==================================================

When you start coding:
- output complete file contents
- include imports
- include exports
- do not omit required wiring
- do not leave TODOs for core features
- do not skip hard files silently
- do not generate fake placeholder modules for critical functionality
- keep each phase internally consistent

If the output is too long, continue in the next response exactly where you left off.

==================================================
IMPORTANT: DO NOT DO THESE THINGS
==================================================

Do NOT:
- generate pseudocode instead of real code
- leave core app flow unwired
- create mock-only data paths and pretend they are real
- silently replace required features with comments
- skip IPC typing
- skip preload security
- skip saved-scan persistence
- claim the project is complete if it is not
- optimize for elegance at the expense of runnability

==================================================
SUCCESS CRITERIA
==================================================

The project is successful only if:
- npm install works
- npm run dev launches the Electron + React app
- a user can enter a URL and run a scan
- the scan returns real findings
- the app saves JSON + HTML reports
- the app shows results in the UI
- the app can open the generated report
- saved scan history is viewable

==================================================
REFERENCE IMPLEMENTATION PLAN
==================================================

Use the following plan as the implementation blueprint:




# Local SEO Scanner — Final Boss Implementation Plan

## Goal
Build a desktop app with **Electron + React + Vite** that scans local business websites, scores technical SEO / local SEO / conversion quality, and generates **HTML + JSON reports** you can use for outreach and client work.

---

## Product shape

### Stack
- **Desktop shell:** Electron
- **UI:** React + Vite + TypeScript
- **Audit engine:** Node.js + TypeScript
- **Browser automation:** Playwright
- **Performance audits:** Lighthouse
- **HTML parsing:** Cheerio
- **Validation:** Zod
- **State management:** Zustand
- **File/report handling:** fs-extra
- **Templating for reports:** simple HTML builder first, optional Handlebars later
- **Charts/UI polish:** Recharts

### Output types
1. **Internal raw JSON scan result**
2. **Client-facing HTML report**
3. **Quick summary card inside app**

---

## Architecture overview

```text
React UI
  ↓
Electron preload bridge
  ↓
Electron main IPC handlers
  ↓
Audit orchestrator
  ↓
Crawler + analyzers + Lighthouse + scoring + report builder
  ↓
Saved scan artifacts on disk
```

---

## Recommended folder structure

```text
local-seo-scanner/
├─ electron/
│  ├─ main.ts
│  ├─ preload.ts
│  ├─ ipc/
│  │  ├─ scanHandlers.ts
│  │  ├─ fileHandlers.ts
│  │  └─ appHandlers.ts
│
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  ├─ routes.tsx
│  │  └─ styles/
│  │     ├─ globals.css
│  │     └─ tokens.css
│  │
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  └─ Topbar.tsx
│  │  ├─ scan/
│  │  │  ├─ ScanForm.tsx
│  │  │  ├─ ScanProgress.tsx
│  │  │  ├─ ScoreOverview.tsx
│  │  │  ├─ IssueList.tsx
│  │  │  ├─ QuickWins.tsx
│  │  │  └─ BusinessTypeSelect.tsx
│  │  ├─ reports/
│  │  │  ├─ SavedScansTable.tsx
│  │  │  ├─ ReportActions.tsx
│  │  │  └─ ScoreBreakdownChart.tsx
│  │  └─ ui/
│  │     ├─ Button.tsx
│  │     ├─ Card.tsx
│  │     ├─ Input.tsx
│  │     ├─ Badge.tsx
│  │     ├─ Progress.tsx
│  │     └─ EmptyState.tsx
│  │
│  ├─ features/
│  │  ├─ dashboard/
│  │  │  └─ DashboardPage.tsx
│  │  ├─ scans/
│  │  │  ├─ NewScanPage.tsx
│  │  │  ├─ ScanResultsPage.tsx
│  │  │  ├─ SavedScansPage.tsx
│  │  │  └─ state/useScanStore.ts
│  │  └─ settings/
│  │     └─ SettingsPage.tsx
│  │
│  ├─ engine/
│  │  ├─ orchestrator/
│  │  │  ├─ runAudit.ts
│  │  │  ├─ auditPipeline.ts
│  │  │  └─ progressEmitter.ts
│  │  │
│  │  ├─ crawl/
│  │  │  ├─ discoverUrls.ts
│  │  │  ├─ fetchHtml.ts
│  │  │  ├─ normalizeUrl.ts
│  │  │  ├─ classifyPage.ts
│  │  │  ├─ robots.ts
│  │  │  ├─ sitemap.ts
│  │  │  └─ internalLinkGraph.ts
│  │  │
│  │  ├─ extractors/
│  │  │  ├─ extractMeta.ts
│  │  │  ├─ extractHeadings.ts
│  │  │  ├─ extractSchema.ts
│  │  │  ├─ extractContactSignals.ts
│  │  │  ├─ extractLocalSignals.ts
│  │  │  ├─ extractCTAs.ts
│  │  │  ├─ extractTrustSignals.ts
│  │  │  ├─ extractImages.ts
│  │  │  └─ extractTextStats.ts
│  │  │
│  │  ├─ analyzers/
│  │  │  ├─ technicalAnalyzer.ts
│  │  │  ├─ localSeoAnalyzer.ts
│  │  │  ├─ conversionAnalyzer.ts
│  │  │  ├─ contentAnalyzer.ts
│  │  │  ├─ trustAnalyzer.ts
│  │  │  └─ businessTypeDetector.ts
│  │  │
│  │  ├─ lighthouse/
│  │  │  ├─ runLighthouse.ts
│  │  │  └─ mapLighthouseResults.ts
│  │  │
│  │  ├─ scoring/
│  │  │  ├─ scoreTechnical.ts
│  │  │  ├─ scoreLocalSeo.ts
│  │  │  ├─ scoreConversion.ts
│  │  │  ├─ scoreContent.ts
│  │  │  ├─ scoreTrust.ts
│  │  │  ├─ weightedFinalScore.ts
│  │  │  └─ prioritizeFindings.ts
│  │  │
│  │  ├─ reports/
│  │  │  ├─ buildJsonReport.ts
│  │  │  ├─ buildHtmlReport.ts
│  │  │  ├─ buildClientSummary.ts
│  │  │  └─ reportTemplates.ts
│  │  │
│  │  ├─ storage/
│  │  │  ├─ scanRepository.ts
│  │  │  ├─ pathResolver.ts
│  │  │  └─ openReport.ts
│  │  │
│  │  ├─ types/
│  │  │  ├─ audit.ts
│  │  │  ├─ findings.ts
│  │  │  ├─ scores.ts
│  │  │  └─ ipc.ts
│  │  │
│  │  └─ utils/
│  │     ├─ logger.ts
│  │     ├─ domain.ts
│  │     ├─ text.ts
│  │     ├─ phone.ts
│  │     ├─ address.ts
│  │     ├─ keywords.ts
│  │     └─ safeJson.ts
│
├─ reports/
├─ data/
├─ screenshots/
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ electron-builder.json
```

---

## Core data model

### `src/engine/types/audit.ts`
Define the main shapes first.

```ts
export type ScanMode = 'quick' | 'full';
export type BusinessType =
  | 'auto'
  | 'restaurant'
  | 'salon'
  | 'roofer'
  | 'auto_shop'
  | 'contractor'
  | 'dentist'
  | 'other';

export interface AuditRequest {
  url: string;
  scanMode: ScanMode;
  businessType: BusinessType;
  maxPages: number;
}

export interface CrawledPage {
  url: string;
  statusCode: number;
  finalUrl: string;
  title?: string;
  metaDescription?: string;
  h1s: string[];
  h2s: string[];
  canonical?: string;
  noindex: boolean;
  html?: string;
  textContent?: string;
  pageType?: string;
}

export interface Finding {
  id: string;
  category: 'technical' | 'local' | 'conversion' | 'content' | 'trust';
  severity: 'high' | 'medium' | 'low';
  title: string;
  summary: string;
  whyItMatters: string;
  recommendation: string;
  affectedUrls?: string[];
}

export interface CategoryScore {
  value: number;
  label: string;
  rationale: string[];
}

export interface AuditScores {
  technical: CategoryScore;
  localSeo: CategoryScore;
  conversion: CategoryScore;
  content: CategoryScore;
  trust: CategoryScore;
  overall: CategoryScore;
}

export interface AuditResult {
  request: AuditRequest;
  scannedAt: string;
  domain: string;
  detectedBusinessType: BusinessType;
  pages: CrawledPage[];
  findings: Finding[];
  scores: AuditScores;
  quickWins: string[];
  moneyLeaks: string[];
  lighthouse?: Record<string, unknown>;
  artifacts: {
    jsonPath?: string;
    htmlPath?: string;
  };
}
```

Build this first because every other file depends on it.

---

## Electron layer

### `electron/main.ts`
Purpose:
- boot Electron
- create the browser window
- register IPC handlers
- open external report files safely

Responsibilities:
- create `BrowserWindow`
- set `contextIsolation: true`
- set `nodeIntegration: false`
- point to Vite dev server in dev, bundled files in prod
- register `scanHandlers`, `fileHandlers`, `appHandlers`

### `electron/preload.ts`
Purpose:
- expose a minimal safe API to React

Expose methods like:
- `startScan(request)`
- `onScanProgress(callback)`
- `getSavedScans()`
- `openReport(path)`
- `openFolder(path)`

### `electron/ipc/scanHandlers.ts`
Purpose:
- receive UI scan requests
- call `runAudit()`
- stream progress events back to renderer

IPC channels:
- `scan:start`
- `scan:progress`
- `scan:complete`
- `scan:error`

### `electron/ipc/fileHandlers.ts`
Purpose:
- list saved reports
- open HTML report in browser
- reveal reports folder

### `electron/ipc/appHandlers.ts`
Purpose:
- app version
- platform info
- configuration paths

---

## React UI layer

### `src/app/main.tsx`
Purpose:
- mount the app
- import global styles

### `src/app/App.tsx`
Purpose:
- root layout and route rendering

### `src/app/routes.tsx`
Routes:
- `/` dashboard
- `/scan/new`
- `/scan/results/:id`
- `/scans`
- `/settings`

### `src/features/scans/state/useScanStore.ts`
Use Zustand for:
- current scan request
- progress percent
- current step label
- latest scan result
- saved scan list
- active error state

Suggested store shape:
```ts
interface ScanStore {
  currentRequest: AuditRequest | null;
  progress: number;
  stepLabel: string;
  latestResult: AuditResult | null;
  savedScans: Array<{ id: string; domain: string; scannedAt: string; overall: number }>;
  isScanning: boolean;
  error: string | null;
  startScan: (request: AuditRequest) => Promise<void>;
  setProgress: (value: number, label: string) => void;
  loadSavedScans: () => Promise<void>;
}
```

### `src/features/scans/NewScanPage.tsx`
Purpose:
- render input form
- validate URL
- submit scan

### `src/components/scan/ScanForm.tsx`
Fields:
- website URL
- scan mode
- business type
- max pages

### `src/components/scan/ScanProgress.tsx`
Show:
- progress bar
- current stage label
- small scan checklist

### `src/features/scans/ScanResultsPage.tsx`
Purpose:
- show score summary
- show findings grouped by category
- show quick wins and money leaks
- show export/open actions

### `src/components/scan/ScoreOverview.tsx`
Cards for:
- overall
- technical
- local SEO
- conversion
- content
- trust

### `src/components/scan/IssueList.tsx`
Group findings by severity and category.

### `src/components/scan/QuickWins.tsx`
Show owner-friendly suggestions.

### `src/features/scans/SavedScansPage.tsx`
Purpose:
- list old reports
- sort/filter by score/date/domain

---

## Engine layer: implementation order

This is the exact build order that will keep you from getting stuck.

### Phase 1 — types, paths, and utilities
Build these first.

#### `src/engine/utils/domain.ts`
Responsibilities:
- normalize URL input
- strip trailing slash
- get hostname
- validate protocol

Functions:
- `normalizeInputUrl(url: string): string`
- `getDomain(url: string): string`
- `isSameDomain(a: string, b: string): boolean`

#### `src/engine/storage/pathResolver.ts`
Responsibilities:
- define where reports and raw results go
- generate stable scan IDs

Functions:
- `getReportsDir()`
- `getScanArtifactsDir(scanId: string)`
- `buildJsonPath(scanId: string)`
- `buildHtmlPath(scanId: string)`

#### `src/engine/utils/logger.ts`
Responsibilities:
- structured console logging
- optionally write debug log file later

#### `src/engine/utils/phone.ts`
Responsibilities:
- detect and normalize US phone numbers in text/html

#### `src/engine/utils/address.ts`
Responsibilities:
- naive first-pass address detection
- city/state/zip matching

Build these early because many analyzers will reuse them.

---

### Phase 2 — crawl and fetch

#### `src/engine/crawl/fetchHtml.ts`
Purpose:
- load a page with Playwright
- return HTML, final URL, status code

Responsibilities:
- timeout handling
- user agent setting
- page content extraction
- basic screenshot hook later

Return shape:
```ts
interface FetchHtmlResult {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  html: string;
}
```

#### `src/engine/crawl/normalizeUrl.ts`
Purpose:
- remove fragments
- strip tracking params
- canonicalize internal URLs

#### `src/engine/crawl/discoverUrls.ts`
Purpose:
- start from homepage
- find internal links
- BFS crawl up to max pages
- skip junk URLs

Rules:
- same domain only
- skip `mailto:` `tel:` `javascript:`
- skip media/pdf for now
- skip obvious auth/cart/checkout pages

Output:
- array of normalized URLs

#### `src/engine/crawl/classifyPage.ts`
Purpose:
- assign page type labels

Page types:
- home
- contact
- about
- service
- location
- booking
- menu
- blog
- gallery
- other

Heuristics:
- path keywords
- heading keywords
- CTA patterns

#### `src/engine/crawl/robots.ts`
Purpose:
- fetch and parse robots.txt
- report existence and disallow rules

#### `src/engine/crawl/sitemap.ts`
Purpose:
- check `/sitemap.xml`
- check robots.txt for sitemap lines

By the end of Phase 2, you should be able to:
- input a domain
- fetch the homepage
- discover 10 to 25 internal URLs
- classify them roughly

---

### Phase 3 — extraction

#### `src/engine/extractors/extractMeta.ts`
Extract:
- title
- meta description
- canonical
- robots meta

#### `src/engine/extractors/extractHeadings.ts`
Extract:
- h1 list
- h2 list

#### `src/engine/extractors/extractSchema.ts`
Extract:
- JSON-LD blocks
- microdata clues
- presence of `LocalBusiness`, `Organization`, `FAQPage`, `Review`

#### `src/engine/extractors/extractContactSignals.ts`
Extract:
- phone numbers
- emails
- `tel:` links
- `mailto:` links
- address-like strings

#### `src/engine/extractors/extractLocalSignals.ts`
Extract:
- city mentions
- state mentions
- ZIP codes
- service area phrases
- maps embeds / directions links
- hours-like text

#### `src/engine/extractors/extractCTAs.ts`
Extract:
- button/link text matching booking/call/quote/order
- count and placement hints

#### `src/engine/extractors/extractTrustSignals.ts`
Extract:
- testimonials text blocks
- review widget markers
- licensing/insured/bonded keywords
- years in business wording
- guarantee/warranty wording

#### `src/engine/extractors/extractImages.ts`
Extract:
- image count
- missing alt count

#### `src/engine/extractors/extractTextStats.ts`
Extract:
- visible text length
- word count
- keyword frequency helpers later

By end of Phase 3, each crawled page should become a richer object with all the signal data you need.

---

### Phase 4 — analyzers

These files convert extracted signals into findings.

#### `src/engine/analyzers/technicalAnalyzer.ts`
Creates findings for:
- missing title
- title too short/long
- missing meta description
- missing or multiple H1
- missing canonical
- noindex on important pages
- broken pages
- missing sitemap / robots
- poor image alt coverage

#### `src/engine/analyzers/localSeoAnalyzer.ts`
Creates findings for:
- missing NAP on important pages
- weak city/service relevance
- missing LocalBusiness schema
- weak maps/directions signals
- missing hours
- no location pages where needed

#### `src/engine/analyzers/conversionAnalyzer.ts`
Creates findings for:
- no strong homepage CTA
- weak phone visibility
- no quote/booking/contact action
- trust not visible above the fold clues
- too few CTA opportunities

#### `src/engine/analyzers/contentAnalyzer.ts`
Creates findings for:
- thin service pages
- too few service pages
- too few location pages
- weak FAQ/supporting content
- poor internal linking between money pages

#### `src/engine/analyzers/trustAnalyzer.ts`
Creates findings for:
- missing testimonials
- weak company legitimacy signals
- no gallery or proof assets
- no about/team page
- no HTTPS

#### `src/engine/analyzers/businessTypeDetector.ts`
Purpose:
- auto-detect niche from headings/content/URLs
- fallback if user selected `auto`

This file matters because later scoring and recommendations can shift by niche.

---

### Phase 5 — Lighthouse integration

#### `src/engine/lighthouse/runLighthouse.ts`
Purpose:
- run Lighthouse on homepage and maybe top service page

Collect:
- performance score
- SEO score
- accessibility score
- first contentful paint
- largest contentful paint
- total blocking time

#### `src/engine/lighthouse/mapLighthouseResults.ts`
Purpose:
- convert raw Lighthouse JSON into your internal simplified shape
- generate owner-friendly notes

Important: do not overbuild here. Run Lighthouse on 1 to 3 pages max in MVP.

---

### Phase 6 — scoring

#### `src/engine/scoring/scoreTechnical.ts`
Input:
- technical findings
- key crawl facts
- Lighthouse SEO/performance slice

Output:
- numeric score 0–100
- rationale bullets

#### `src/engine/scoring/scoreLocalSeo.ts`
Weight heavily for local businesses.

#### `src/engine/scoring/scoreConversion.ts`
Weight heavily for owner pain.

#### `src/engine/scoring/scoreContent.ts`
Keep simpler at first.

#### `src/engine/scoring/scoreTrust.ts`
Basic trust weighting.

#### `src/engine/scoring/weightedFinalScore.ts`
Suggested default weights:
- technical 25
- local SEO 30
- conversion 25
- content 10
- trust 10

Return overall score and label bands:
- 85–100 strong
- 70–84 solid
- 55–69 needs work
- below 55 leaking opportunity

#### `src/engine/scoring/prioritizeFindings.ts`
Purpose:
- sort findings by business impact, not just severity
- build `quickWins` and `moneyLeaks`

This file is critical because it turns raw SEO into sales language.

---

### Phase 7 — report generation

#### `src/engine/reports/buildJsonReport.ts`
Purpose:
- serialize full result to disk

#### `src/engine/reports/reportTemplates.ts`
Purpose:
- centralize HTML sections and helper formatters

#### `src/engine/reports/buildClientSummary.ts`
Purpose:
- create short owner-friendly summary strings

Example sections:
- what is hurting visibility
- what may be hurting leads
- fastest wins
- biggest opportunities

#### `src/engine/reports/buildHtmlReport.ts`
Purpose:
- generate polished HTML report with:
  - score cards
  - category breakdown
  - findings grouped by category
  - quick wins
  - money leaks
  - page inventory summary

This should look premium enough to show businesses immediately.

---

### Phase 8 — persistence and report access

#### `src/engine/storage/scanRepository.ts`
Purpose:
- save scan metadata index
- list historical scans
- load prior result by ID

Metadata example:
```ts
interface SavedScanMeta {
  id: string;
  domain: string;
  scannedAt: string;
  overallScore: number;
  businessType: string;
  jsonPath: string;
  htmlPath: string;
}
```

#### `src/engine/storage/openReport.ts`
Purpose:
- open generated HTML report
- reveal folder when needed

---

### Phase 9 — orchestrator

#### `src/engine/orchestrator/progressEmitter.ts`
Purpose:
- publish progress milestones to Electron UI

Milestones:
- validating URL
- loading homepage
- discovering pages
- extracting signals
- analyzing technical SEO
- analyzing local SEO
- running Lighthouse
- scoring
- generating reports
- complete

#### `src/engine/orchestrator/auditPipeline.ts`
Purpose:
- pure pipeline steps
- easier to test than one giant function

#### `src/engine/orchestrator/runAudit.ts`
Purpose:
- single entry point for complete scans

Pseudo-flow:
```ts
validate request
normalize URL
fetch homepage
load robots + sitemap
discover internal URLs
fetch/capture pages
run extractors
detect business type
run analyzers
run Lighthouse
compute scores
prioritize findings
build reports
save artifacts
return AuditResult
```

This is the engine heart.

---

## Exact build sequence by day / milestone

## Milestone 1 — project bootstrap
Files to create first:
- `package.json`
- `vite.config.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `src/app/main.tsx`
- `src/app/App.tsx`
- `src/engine/types/audit.ts`
- `src/engine/utils/domain.ts`

Goal:
- Electron window opens
- React UI loads
- preload bridge works

## Milestone 2 — scan form and IPC shell
Create:
- `src/features/scans/NewScanPage.tsx`
- `src/components/scan/ScanForm.tsx`
- `src/features/scans/state/useScanStore.ts`
- `electron/ipc/scanHandlers.ts`
- stub `src/engine/orchestrator/runAudit.ts`

Goal:
- enter URL
- click scan
- see fake progress and fake result

## Milestone 3 — real crawl MVP
Create:
- `fetchHtml.ts`
- `normalizeUrl.ts`
- `discoverUrls.ts`
- `classifyPage.ts`
- `robots.ts`
- `sitemap.ts`

Goal:
- scan homepage
- find internal URLs
- show page inventory in UI

## Milestone 4 — extraction MVP
Create:
- `extractMeta.ts`
- `extractHeadings.ts`
- `extractContactSignals.ts`
- `extractLocalSignals.ts`
- `extractCTAs.ts`

Goal:
- inspect pages and display extracted data in console/JSON

## Milestone 5 — analyzer MVP
Create:
- `technicalAnalyzer.ts`
- `localSeoAnalyzer.ts`
- `conversionAnalyzer.ts`
- `businessTypeDetector.ts`

Goal:
- produce first real findings list

## Milestone 6 — scoring MVP
Create:
- `scoreTechnical.ts`
- `scoreLocalSeo.ts`
- `scoreConversion.ts`
- `weightedFinalScore.ts`
- `prioritizeFindings.ts`

Goal:
- produce scores and top quick wins

## Milestone 7 — report generation MVP
Create:
- `buildJsonReport.ts`
- `buildHtmlReport.ts`
- `scanRepository.ts`
- `openReport.ts`

Goal:
- save reports to disk
- open report from app

## Milestone 8 — Lighthouse integration
Create:
- `runLighthouse.ts`
- `mapLighthouseResults.ts`
- update scoring/analyzers to use perf signals

Goal:
- stronger audits with speed/performance pain

## Milestone 9 — polished UI
Create/refine:
- `ScanResultsPage.tsx`
- `ScoreOverview.tsx`
- `IssueList.tsx`
- `QuickWins.tsx`
- `SavedScansPage.tsx`
- chart components

Goal:
- looks premium enough for real client work

## Milestone 10 — v1 hardening
Add:
- stronger error handling
- timeouts
- duplicate scan protection
- URL validation edge cases
- better file cleanup
- batch mode later

---

## What each major module should return

### Crawl result
```ts
interface CrawlResult {
  pages: CrawledPage[];
  robotsFound: boolean;
  sitemapFound: boolean;
  internalLinkGraph: Record<string, string[]>;
}
```

### Analyzer result
```ts
interface AnalyzerOutput {
  findings: Finding[];
  notes: string[];
}
```

### Score result
```ts
interface ScoreOutput {
  value: number;
  label: string;
  rationale: string[];
}
```

---

## MVP checks you should support first

### Technical
- homepage title present
- homepage meta description present
- homepage H1 present
- important pages indexable
- sitemap present
- robots present
- HTTPS

### Local SEO
- phone found
- address found
- city/state found
- LocalBusiness schema found
- hours found
- map/directions signal found

### Conversion
- homepage CTA present
- call/quote/book action present
- contact page present
- form present

### Trust
- testimonials/reviews detected
- about page present
- trust keywords detected

That is enough for a powerful v1.

---

## UI pages you actually need for v1

### Dashboard
Show:
- recent scans
- average score
- low-score opportunities

### New Scan
Show:
- scan form
- business type select
- run button

### Results
Show:
- score cards
- top issues
- quick wins
- money leaks
- buttons: open HTML, open folder

### Saved Scans
Show:
- table of prior scans

Do not build settings until it becomes necessary.

---

## Final Boss implementation standards

### Rule 1
Every analyzer should generate **owner language**, not just dev language.

### Rule 2
Every finding should include:
- what is wrong
- why it matters
- how to fix it

### Rule 3
Your first version should prefer **accuracy over cleverness**.

### Rule 4
Do not overcrawl. For local business sites, 25–75 pages is enough for v1.

### Rule 5
Keep the engine pure where possible. Electron should be a shell, not the business logic layer.

---

## The first files I would personally write in order

1. `src/engine/types/audit.ts`
2. `src/engine/utils/domain.ts`
3. `electron/main.ts`
4. `electron/preload.ts`
5. `src/app/main.tsx`
6. `src/features/scans/NewScanPage.tsx`
7. `src/components/scan/ScanForm.tsx`
8. `electron/ipc/scanHandlers.ts`
9. `src/engine/orchestrator/runAudit.ts` (stub)
10. `src/engine/crawl/fetchHtml.ts`
11. `src/engine/crawl/discoverUrls.ts`
12. `src/engine/extractors/extractMeta.ts`
13. `src/engine/extractors/extractContactSignals.ts`
14. `src/engine/analyzers/technicalAnalyzer.ts`
15. `src/engine/analyzers/localSeoAnalyzer.ts`
16. `src/engine/scoring/weightedFinalScore.ts`
17. `src/engine/reports/buildHtmlReport.ts`
18. `src/features/scans/ScanResultsPage.tsx`

That sequence gets you to a usable product fastest.

---

## Recommended v1 definition of done

You are done with v1 when the app can:
1. accept a website URL
2. crawl the site up to a limit
3. detect core technical/local/conversion signals
4. generate at least 10 meaningful findings
5. score the site
6. save a JSON report
7. generate a nice HTML report
8. let you open that report from the UI

That is enough to start using it for real outreach.

---

## Recommended v2 upgrades

After v1 works, add:
- screenshots of homepage/contact page
- competitor side-by-side scan mode
- niche-specific weighting presets
- batch scan import from CSV
- richer charts
- PDF export
- AI rewrite of client summary
- notes / CRM-lite status per business

---

## Bottom line

Build this as a **React + Vite frontend inside Electron**, with a **separate Node audit engine** that stays modular and reusable.

Do not think of it as “an SEO tool.”
Think of it as a **local business revenue leak detector**.

That framing should shape every module, every score, and every report you generate.



==================================================
YOUR TASK
==================================================

Now begin with the planning section only.

First output:
1. dependency list with versions
2. final folder structure
3. phase-by-phase execution plan
4. likely risk points and how you will avoid them
5. any compatibility notes

After that, proceed into implementation phase 1 with real code after done with phase 1 stop and wait to be told to continue to next phase.