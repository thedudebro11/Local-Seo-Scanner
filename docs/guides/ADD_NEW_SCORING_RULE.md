# How to Add or Modify a Scoring Rule

The scoring system has two parts: finding generation (in analyzers) and score calculation (in scorers). Most changes involve either adding a new finding condition to an analyzer, or tweaking a positive signal in a scorer.

---

## Option A: Add a New Finding to an Existing Analyzer

Add a condition inside the relevant analyzer function that pushes a new `Finding` object.

**Example**: Add a finding when the homepage title does not contain the city name.

In `src/engine/analyzers/technicalAnalyzer.ts`, inside `analyzeTechnical`:

```typescript
// After the existing title checks...
if (home && home.title) {
  // Check for location signal in title (rough heuristic)
  const hasLocationInTitle = /,\s*[A-Z]{2}\b/.test(home.title) || /\b(Austin|Dallas|Houston|...)\b/i.test(home.title)
  if (!hasLocationInTitle) {
    findings.push({
      id: 'technical-title-no-location',
      category: 'technical',
      severity: 'low',
      title: 'Homepage title appears to lack a city/state signal',
      summary: `The title "${home.title}" does not appear to include a location keyword.`,
      whyItMatters: 'Including your city and state in the homepage title is a strong local SEO signal.',
      recommendation: 'Add your primary city and state to the homepage title: "Your Business Name | Austin, TX"',
      affectedUrls: [home.url],
    })
  }
}
```

**Rules**:
- Finding `id` must be unique across all analyzers
- `category` must match the analyzer's domain (technical findings in technical analyzer, etc.)
- The finding automatically affects the score via the deduction model — no other changes needed
- The finding is automatically included in prioritization, quickWins, and moneyLeaks logic

---

## Option B: Add a Positive Signal to a Scorer

Add a condition inside the relevant scorer function that pushes a string to `positives`.

**Example**: In `scoreTechnical.ts`, reward sites where all key pages have canonical tags.

In `src/engine/scoring/scoreTechnical.ts`, inside `scoreTechnical`:

```typescript
const allHaveCanonical = keyPages.every(
  (p) => p.canonical && p.canonical.trim().length > 0,
)
if (allHaveCanonical && keyPages.length > 0) {
  positives.push('[+] All key pages have canonical tags')
}
```

Positive signals appear in the score's `rationale` array in the report. They do NOT add points — the model is deduction-only from 100. Positive signals only provide context.

---

## Option C: Change a Penalty Weight

The penalty constants are in `src/engine/scoring/scoreHelpers.ts`:

```typescript
export const PENALTY: Record<Finding['severity'], number> = {
  high:   20,
  medium: 10,
  low:     4,
}
```

Changing these affects ALL scores across ALL categories equally. Consider carefully: if you lower `high` from 20 to 15, every existing high-severity finding produces a better score. This change also shifts the score band boundaries' effective impact.

---

## Option D: Change Score Band Thresholds

Score bands are in `src/engine/scoring/scoreHelpers.ts`:

```typescript
export function scoreBand(value: number): string {
  if (value >= 85) return 'Strong'
  if (value >= 70) return 'Solid'
  if (value >= 55) return 'Needs Work'
  return 'Leaking Opportunity'
}
```

The `scoreColor` function in `src/engine/reports/reportTemplates.ts` uses the same thresholds. If you change `scoreBand`, also update `scoreColor`:

```typescript
export function scoreColor(value: number): string {
  if (value >= 85) return '#16a34a'   // green
  if (value >= 70) return '#2563eb'   // blue
  if (value >= 55) return '#d97706'   // amber
  return '#dc2626'                    // red
}
```

---

## Option E: Change Category Weights

Category weights appear in TWO places that must stay in sync:

**1. `src/engine/scoring/weightedFinalScore.ts`** (used for the overall score):
```typescript
const WEIGHTS = {
  technical:  0.25,
  localSeo:   0.30,
  conversion: 0.25,
  content:    0.10,
  trust:      0.10,
}
```

**2. `src/engine/scoring/prioritizeFindings.ts`** (used for finding sort order):
```typescript
const CATEGORY_WEIGHT: Record<Finding['category'], number> = {
  local:      0.30,
  technical:  0.25,
  conversion: 0.25,
  content:    0.10,
  trust:      0.10,
}
```

Note: `weightedFinalScore.ts` uses `localSeo` (matches `AuditScores` key) while `prioritizeFindings.ts` uses `local` (matches `FindingCategory`). Both must be updated together when changing the local SEO weight.

The weights in `weightedFinalScore.ts` must always sum to exactly 1.0.

---

## After Any Scoring Change

1. Run `npm run typecheck` to catch TypeScript errors
2. Run a test scan against a known site and verify the scores change as expected
3. Update `docs/engine/SCORING.md` with the new values
4. Update `docs/engine/ANALYZERS.md` if a new finding was added
