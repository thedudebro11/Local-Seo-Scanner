# How to Add a New Analyzer

This guide walks through adding a new category analyzer to the engine. The example adds a hypothetical `accessibilityAnalyzer` with a new category.

## Step 1: Decide the Category

Analyzers produce `Finding` objects with a `category` field. The valid categories are defined in `FindingCategory` in `src/engine/types/audit.ts`:

```typescript
type FindingCategory = 'technical' | 'local' | 'conversion' | 'content' | 'trust'
```

If your analyzer fits an existing category (most new analyzers should), use that. If you need a new category, you must also:
- Add it to `FindingCategory` in `audit.ts`
- Add a key to `AuditScores` in `audit.ts` (e.g., `accessibility: CategoryScore`)
- Add a weight to `WEIGHTS` in `weightedFinalScore.ts` (adjust others to keep sum = 1.0)
- Add an entry to `CATEGORY_WEIGHT` in `prioritizeFindings.ts`
- Add a corresponding scorer (see Step 4)

For this guide, we assume you are adding findings to an existing category.

## Step 2: Create the Analyzer File

Create `src/engine/analyzers/accessibilityAnalyzer.ts`:

```typescript
import type { AnalyzerOutput, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage } from './types'

export function analyzeAccessibility(input: AnalyzerInput): AnalyzerOutput {
  const { pages } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)

  // Example finding: check if any page has high missing alt ratio
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0)
  const missingAlt  = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0)

  if (totalImages > 0 && missingAlt / totalImages > 0.5) {
    findings.push({
      id: 'accessibility-poor-alt-coverage',
      category: 'technical',   // assign to existing category
      severity: 'medium',
      title: 'More than half of images lack alt text',
      summary: `${missingAlt} of ${totalImages} images are missing alt attributes.`,
      whyItMatters: 'Alt text is required for screen reader users and is an ADA compliance issue.',
      recommendation: 'Add descriptive alt text to all images. Empty alt="" is acceptable for decorative images.',
    })
  }

  notes.push(`Images checked: ${totalImages}, missing alt: ${missingAlt}`)

  return { findings, notes }
}
```

**Rules**:
- Import only from `'../types/audit'`, `'./types'`, or other engine files
- Do NOT import from Electron, React, or any browser API
- Do NOT make network requests — work only with `input.pages`
- Return `{ findings, notes }` always (empty arrays, not null)

## Step 3: Wire Into runAudit.ts

Open `src/engine/orchestrator/runAudit.ts` and make these additions:

**Add the import** (near the other analyzer imports, around line 20):
```typescript
import { analyzeAccessibility } from '../analyzers/accessibilityAnalyzer'
```

**Add to the analyzer run block** (around line 175):
```typescript
const [technical, localSeo, conversion, content, trust, accessibility] = [
  analyzeTechnical(analyzerInput),
  analyzeLocalSeo(analyzerInput),
  analyzeConversion(analyzerInput),
  analyzeContent(analyzerInput),
  analyzeTrust(analyzerInput),
  analyzeAccessibility(analyzerInput),  // ← add
]
```

**Add findings to allFindings** (around line 188):
```typescript
allFindings = [
  ...technical.findings,
  ...localSeo.findings,
  ...conversion.findings,
  ...content.findings,
  ...trust.findings,
  ...accessibility.findings,  // ← add
]
```

If the new analyzer contributes to an existing category's score, you don't need to change the scoring step — the existing scorer already filters by category. If you created a new category, see Step 4.

## Step 4: Update Scoring (New Category Only)

If you added a new `FindingCategory` and new `AuditScores` key, create a new scorer file `src/engine/scoring/scoreAccessibility.ts`:

```typescript
import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'

export interface AccessibilityScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
}

export function scoreAccessibility(input: AccessibilityScorerInput): ScoreOutput {
  const { findings, pages } = input
  const positives: string[] = []

  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0)
  const missingAlt  = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0)
  if (totalImages > 0 && missingAlt / totalImages <= 0.05) {
    positives.push('[+] Excellent image alt coverage (>95%)')
  }

  return makeScore(findings, positives)
}
```

Then wire it into `runAudit.ts`:
```typescript
import { scoreAccessibility } from '../scoring/scoreAccessibility'
// ...
const accessibilityScore = scoreAccessibility({ findings: accessibility.findings, pages: crawledPages })
const categoryScores = {
  technical: techScore,
  localSeo: localScore,
  conversion: convScore,
  content: contentScore,
  trust: trustScore,
  accessibility: accessibilityScore,  // ← add
}
```

Also update `weightedFinalScore.ts` to include the new weight (adjusting others so the total remains 1.0).

## Step 5: Verify

```bash
npm run typecheck   # Catch any TypeScript errors
npm run build       # Verify the build compiles
npm run dev         # Test in the live app
```

## Step 6: Add Documentation

- Add the new finding IDs and conditions to `docs/engine/ANALYZERS.md`
- Update `docs/status/IMPLEMENTATION_STATUS.md`
- Update `docs/ai/AI_MEMORY.md` if this is a significant change
