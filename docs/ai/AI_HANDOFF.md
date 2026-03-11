# AI Agent Handoff Document

This document provides the full context needed for an AI agent (or developer) to safely continue development on the Local SEO Scanner project.

---

## What This App Is

A cross-platform desktop application (Electron) that audits local business websites. The user enters a URL, selects their business type, and the app crawls the site, analyzes it across 5 categories (Technical SEO, Local SEO, Conversion, Content, Trust), generates a score, and produces a prioritized report of issues with fix recommendations.

The target user is a local SEO agency or consultant auditing client sites. Reports are saved locally and can be opened as self-contained HTML files.

---

## Current State

All 8 implementation phases are complete. The app builds, runs, and produces real audit results. Known issues exist (see below). The codebase is clean TypeScript with no `any` types in critical paths.

---

## Architecture in One Paragraph

Three-process Electron app. Renderer (React + Zustand) talks to the main process via a contextBridge preload. All audit logic runs in `src/engine/` which is a self-contained Node.js library — no Electron/React imports except `pathResolver.ts`. Engine is dynamically imported by IPC handlers so it never enters the renderer bundle. Crawler uses Playwright BFS. Extractors use cheerio/slim. Lighthouse runs best-effort after the crawl. Reports are written to `userData/reports/`. Scan index is in `userData/reports/index.json`.

---

## What's Done

Everything in the plan. Full pipeline:
- Playwright BFS crawler with robots.txt + sitemap discovery
- 9 extractors (meta, headings, schema, contact, local signals, CTAs, trust, images, text stats)
- 5 analyzers producing ~40 finding types
- 5 category scorers + weighted overall score
- Lighthouse integration (performance, SEO, accessibility, 9 finding types)
- JSON + HTML report generation (self-contained, print-friendly)
- Scan repository (index.json, load/save/delete)
- React UI with all pages: dashboard, new scan, results, saved scans, settings

---

## Known Issues to Fix

### Critical: www vs non-www Crawl Bug

The most impactful bug. Sites that redirect `example.com` → `www.example.com` will only crawl the homepage because `isSameDomain` does strict hostname equality.

**Location**: `src/engine/utils/domain.ts` → `isSameDomain` function
**Fix**: Strip `www.` from both hostnames before comparing, or treat `example.com` and `www.example.com` as the same domain.

```typescript
// Current (buggy)
export function isSameDomain(a: string, b: string): boolean {
  return getDomain(a) === getDomain(b)
}

// Fix approach
function canonicalHost(url: string): string {
  const h = getDomain(url)
  return h.startsWith('www.') ? h.slice(4) : h
}
export function isSameDomain(a: string, b: string): boolean {
  return canonicalHost(a) === canonicalHost(b)
}
```

### Enhancement: Seed Sitemap URLs into Crawler

`fetchSitemap` returns `sitemapResult.urls` but `discoverUrls` ignores these. Deep pages linked only from the sitemap (not from other pages) are never crawled.

**Location**: `src/engine/orchestrator/runAudit.ts` around line 107
**Fix**: Pass `sitemapResult.urls` as initial queue hints to `discoverUrls`, or add them as the initial queue after the start URL.

### Enhancement: Load Old Scans from Disk in UI

`ScanResultsPage` shows an empty state if the result ID in the URL doesn't match `latestResult.id` in the Zustand store. The IPC channel `file:load-scan` exists and works, but the page doesn't auto-call it.

**Location**: `src/features/scans/ScanResultsPage.tsx`
**Fix**: Add a `useEffect` that calls `window.api.loadScan(params.id)` when `latestResult === null` or `latestResult.id !== params.id`, and sets it in state.

---

## Architecture Rules (Must Follow)

1. No Electron/React imports in `src/engine/` (except `pathResolver.ts`)
2. Use `cheerio/slim` not `cheerio` (undici/Node.js 18 conflict)
3. `playwright`, `lighthouse`, `chrome-launcher` → dynamic `import()` only (ESM-only packages)
4. `URL` is a global — don't import it
5. Renderer uses only `import type` from engine files
6. `FindingCategory` uses `'local'`; `AuditScores` key is `'localSeo'` — both correct, don't "fix" one without the other
7. HTML reports must be self-contained (no external assets)
8. All artifact paths go through `pathResolver.ts`

---

## How to Add Features

### New Finding Type

1. Open the relevant analyzer in `src/engine/analyzers/`
2. Add a new `if` block that pushes a `Finding` to the `findings` array
3. The finding automatically gets scored, prioritized, and included in reports
4. Finding ID must be unique (pattern: `category-short-description`)

### New Page Signal

1. Create extractor file in `src/engine/extractors/`
2. Export interface + function accepting `CheerioAPI`
3. Add to barrel `src/engine/extractors/index.ts`: import, re-export type, add to `ExtractedSignals`, call in `extractAllSignals`, add to `emptySignals`
4. Add field to `CrawledPage` in `src/engine/types/audit.ts`
5. Wire field in `runAudit.ts` CrawledPage construction
6. Use in analyzer if desired

### New IPC Channel

1. Add channel name to `IpcChannel` in `src/engine/types/ipc.ts`
2. Add method to `ElectronAPI` in `src/engine/types/ipc.ts` and `electron/preload.ts`
3. Add `ipcMain.handle()` in appropriate handler file
4. Register in `electron/main.ts` if needed

### New Route / Page

1. Add component in `src/features/`
2. Add route to `src/app/routes.tsx`
3. Add navigation link in `src/components/layout/Sidebar.tsx`

---

## Common Pitfalls

1. **"My extractor breaks the build"** — Check if you accidentally used `import * as cheerio from 'cheerio'` instead of `'cheerio/slim'`. Also check you're not calling `cheerio.load()` inside an individual extractor (only the barrel does that).

2. **"Lighthouse is always skipped"** — This is expected if no Chrome is installed and Playwright's Chromium path isn't resolving. The scan still completes without Lighthouse data. Check the main process logs.

3. **"Score is always 0"** — `buildPlaceholderScores()` initializes scores at 0 before the scan runs. If the scoring step throws an exception (check for TypeScript errors in scorer files), the placeholder values are never replaced.

4. **"Only 1 page is crawled"** — The www vs non-www bug. User should enter the www URL. Or apply the `isSameDomain` fix.

5. **"The renderer can't see my new engine function"** — Engine functions must be called from the main process via IPC handlers, never imported directly in renderer code.

6. **"TypeScript errors about 'local' vs 'localSeo'"** — The `FindingCategory` type includes `'local'` (for findings) but `AuditScores` has a `localSeo` key (for scores). When writing analyzers, use `category: 'local'`. When accessing scores, use `scores.localSeo`. Both are correct.

7. **"The HTML report shows escaped HTML"** — Make sure any new template helper uses `escHtml()` from `reportTemplates.ts` on all user-sourced strings. Forgetting this will show `&amp;` instead of `&` or worse, XSS in the report.

---

## Development Commands

```bash
npm run dev        # Start Electron dev app with HMR
npm run build      # Compile all 3 targets
npm run typecheck  # Type-check without emitting
npm run dist       # Build + package with electron-builder
```

## Testing

There are no automated tests in the current codebase. Manual testing is the only option. To test the engine in isolation:

```javascript
// In a Node.js script (not renderer)
const { runAudit } = await import('./src/engine/orchestrator/runAudit.js')
const result = await runAudit(
  { url: 'https://example.com', scanMode: 'quick', businessType: 'auto', maxPages: 5 },
  (step, percent) => console.log(`${percent}% - ${step}`)
)
console.log(JSON.stringify(result.scores, null, 2))
```

---

## File Structure Quick Reference

```
electron/           ← Electron-specific shell code
src/app/            ← React router and entry
src/components/     ← React UI components
src/features/       ← React pages and Zustand store
src/engine/         ← Pure Node.js audit engine
  types/            ← Shared TS interfaces (no runtime code)
  utils/            ← domain.ts, logger.ts
  crawl/            ← Playwright crawler
  extractors/       ← cheerio/slim extractors
  analyzers/        ← Finding generators
  scoring/          ← Score calculators
  reports/          ← Report writers
  lighthouse/       ← Performance auditor
  storage/          ← File I/O
  orchestrator/     ← runAudit.ts entry point
docs/               ← All documentation
```
