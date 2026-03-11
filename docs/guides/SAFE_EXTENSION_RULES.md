# Safe Extension Rules

These rules protect the architecture when adding new features. Breaking them can cause build failures, runtime crashes, or subtle data corruption.

---

## Rule 1: Engine files must not import from Electron or React

**Enforced by**: Build will fail (main process and renderer have different module graphs)

`src/engine/` modules must import only from:
- Node.js built-ins (`path`, `fs`, `url`, etc.)
- Pure npm packages (`cheerio/slim`, `fs-extra`, `zod`)
- Other engine files (`../utils/domain`, `../types/audit`, etc.)
- ESM-only packages via dynamic `import()` only

**Only exception**: `src/engine/storage/pathResolver.ts` may import `app` from `electron` (documented violation).

---

## Rule 2: Use cheerio/slim, not cheerio

**Enforced by**: Runtime crash in Electron main process if violated

```typescript
// CORRECT
import * as cheerio from 'cheerio/slim'

// WRONG — will cause undici/Node.js 18 fetch conflict
import * as cheerio from 'cheerio'
```

This applies to all engine files that parse HTML: `discoverUrls.ts`, `sitemap.ts`, `extractors/index.ts`.

---

## Rule 3: ESM-only packages must use dynamic import

**Enforced by**: Runtime crash or build error if violated

`playwright`, `lighthouse`, and `chrome-launcher` are ESM-only. They cannot be statically imported in a CJS module (which is what electron-vite compiles the main process to).

```typescript
// CORRECT — inside an async function
const { chromium } = await import('playwright')
const { launch }   = await import('chrome-launcher') as typeof import('chrome-launcher')
const { default: lighthouse } = await import('lighthouse') as { default: Function }

// WRONG — static import at top of file
import { chromium } from 'playwright'
```

---

## Rule 4: The URL constructor is a global — do not import it

**Enforced by**: Build warning or type error if violated

```typescript
// CORRECT — URL is a global in Node.js 18+ and Chromium
const parsed = new URL(href, base)

// WRONG — do not import URL from 'url'
import { URL } from 'url'
```

`URL` is globally available in both Node.js 18+ (main process) and Chromium (renderer). Importing it from the `url` module adds unnecessary overhead and may cause type conflicts.

---

## Rule 5: Renderer code must not import engine runtime modules

**Enforced by**: Renderer bundle will include Node.js code, causing runtime errors

```typescript
// CORRECT — type-only import (erased at build time)
import type { AuditRequest, AuditResult } from '@engine/types/audit'

// WRONG — runtime import of engine code from renderer
import { runAudit } from '@engine/orchestrator/runAudit'
import { getDomain } from '@engine/utils/domain'
```

Only `src/engine/types/` files may be imported in renderer code, and only as `import type`.

---

## Rule 6: IPC channels must be registered before use

**Enforced by**: Silent failure — the IPC handler returns undefined

All `ipcMain.handle()` calls in `scanHandlers.ts`, `fileHandlers.ts`, and `appHandlers.ts` are registered inside `app.whenReady()`. New channels must be added to the appropriate handler file and called at registration time.

If a new handler needs `mainWindow`, add it to `registerScanHandlers(mainWindow)`. If it does not, add it to `registerFileHandlers()` or `registerAppHandlers()`.

---

## Rule 7: New FindingCategory keys require coordinated updates

**Enforced by**: TypeScript error if you miss one, silent wrong data if you miss the prioritization weight

Adding a new `FindingCategory` requires ALL of:
1. `FindingCategory` union in `audit.ts`
2. New key in `AuditScores` in `audit.ts`
3. New weight in `WEIGHTS` in `weightedFinalScore.ts` (must still sum to 1.0)
4. New weight in `CATEGORY_WEIGHT` in `prioritizeFindings.ts`
5. New scorer file in `src/engine/scoring/`
6. New score wired into `runAudit.ts`

---

## Rule 8: The 'local' vs 'localSeo' key distinction must be preserved

**Enforced by**: Score incorrectly labelled if mixed up

- `FindingCategory` uses `'local'` — all local SEO findings have `category: 'local'`
- `AuditScores` uses `'localSeo'` as the key — `scores.localSeo`
- `CATEGORY_WEIGHT` in `prioritizeFindings.ts` uses `'local': 0.30`
- `WEIGHTS` in `weightedFinalScore.ts` uses `'localSeo': 0.30`

Do not "fix" this by changing one side without the other. The mismatch is known and documented.

---

## Rule 9: Report HTML must be self-contained

**Enforced by**: Report fails to open correctly offline

`buildHtmlReport.ts` generates a file that must open in any browser without network access. Never add:
- `<link rel="stylesheet" href="...">` to external CSS
- `<script src="...">` to external JS
- `<img src="https://...">` to external images
- Google Fonts imports
- CDN references

All styles must be inlined in the `<style>` block. Icons must be Unicode or inline SVG.

---

## Rule 10: Path resolution must go through pathResolver.ts

**Enforced by**: Code review — not a compile-time check

All file paths for scan artifacts (JSON report, HTML report, index.json) must be constructed using functions from `src/engine/storage/pathResolver.ts`. Do not hard-code paths or call `app.getPath()` from other files.

This ensures that if the storage location ever changes (e.g., for portable mode or testing), it only needs to change in one place.
