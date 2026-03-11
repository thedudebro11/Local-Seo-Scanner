# Scoring

## Deduction Model

All five category scorers use the same deduction-based model implemented in `scoreHelpers.ts`:

- **Start at 100**
- **Subtract penalty points for each finding** based on severity
- **Clamp to 0** (cannot go negative)

### PENALTY Constants

```typescript
export const PENALTY: Record<Finding['severity'], number> = {
  high:   20,
  medium: 10,
  low:     4,
}
```

A single high-severity finding deducts 20 points. Five high-severity findings would bring a score to 0.

### Score Bands

```typescript
export function scoreBand(value: number): string {
  if (value >= 85) return 'Strong'
  if (value >= 70) return 'Solid'
  if (value >= 55) return 'Needs Work'
  return 'Leaking Opportunity'
}
```

| Range | Label |
|---|---|
| 85–100 | Strong |
| 70–84 | Solid |
| 55–69 | Needs Work |
| 0–54 | Leaking Opportunity |

### Score Colors (HTML report)

| Range | Color |
|---|---|
| 85–100 | `#16a34a` (green) |
| 70–84 | `#2563eb` (blue) |
| 55–69 | `#d97706` (amber) |
| 0–54 | `#dc2626` (red) |

## makeScore Helper

```typescript
export function makeScore(findings: Finding[], positives: string[] = []): ScoreOutput {
  const value     = computeScore(findings)  // 100 - sum of penalties
  const negatives = buildNegativeRationale(findings)  // "[High] No phone on homepage" etc.
  const rationale = negatives.length === 0 && positives.length === 0
    ? ['No issues detected in this category.']
    : [...negatives, ...positives]
  return { value, label: scoreBand(value), rationale }
}
```

Each scorer adds positive rationale bullets (prefixed `[+]`) for signals that are present and good.

## Category Scorers

### scoreTechnical

Receives: `{ findings, pages, robotsFound, sitemapFound }`

**Positive signals** (added to rationale):
- robots.txt is present
- XML sitemap found
- All key pages have title tags
- All key pages have meta descriptions
- Strong image alt coverage (>90% of images have alt text)
- No broken pages found

### scoreLocalSeo

Receives: `{ findings, pages }`

**Positive signals**:
- Phone number present on homepage
- Business address found on homepage
- LocalBusiness structured data is present
- Map or directions embed found
- Business hours found on site
- N location/service-area page(s) found

### scoreConversion

Receives: `{ findings, pages }`

**Positive signals**:
- Homepage has N call-to-action(s)
- Phone number present on homepage
- Contact/lead form found on N page(s)
- Booking or quote CTA detected
- N% of key pages have CTAs (if ≥ 75%)

### scoreContent

Receives: `{ findings, pages }`

**Positive signals**:
- Homepage has strong content depth (≥ 500 words)
- N dedicated service pages found
- N location/service-area page(s) found
- Blog or resource content found (N page(s))
- Average page content is solid (≥ 300 words/page)

### scoreTrust

Receives: `{ findings, pages, domain }`

**Positive signals**:
- Site is served over HTTPS
- N testimonials or reviews found (N ≥ 3 = "testimonials", N > 0 = "testimonial(s)")
- Trust signals found (licensing, guarantees, certifications) if no testimonials
- About or team page present
- Gallery or portfolio page present
- Homepage displays trust signals

## Weighted Final Score

`computeWeightedScore(scores: Omit<AuditScores, 'overall'>): CategoryScore`

```typescript
const WEIGHTS = {
  technical:  0.25,  // 25%
  localSeo:   0.30,  // 30%  ← heaviest: most important for local businesses
  conversion: 0.25,  // 25%
  content:    0.10,  // 10%
  trust:      0.10,  // 10%
}
```

Overall = `round(tech * 0.25 + local * 0.30 + conv * 0.25 + content * 0.10 + trust * 0.10)`

The overall `rationale` shows each category's contribution:
```
Technical (25%): 72 → Solid
Local SEO (30%): 45 → Leaking Opportunity
...
```

## Finding Prioritization

`prioritizeFindings(findings: Finding[]): Finding[]`

Sorts findings by business impact score (highest first):

```typescript
impactScore = CATEGORY_WEIGHT[finding.category] * SEVERITY_WEIGHT[finding.severity]
```

Category weights in prioritization:
```typescript
const CATEGORY_WEIGHT = {
  local:      0.30,
  technical:  0.25,
  conversion: 0.25,
  content:    0.10,
  trust:      0.10,
}
```

Severity weights: `{ high: 20, medium: 10, low: 4 }`

**Impact score examples**:
- High local finding: 0.30 × 20 = 6.0 (highest priority)
- High technical finding: 0.25 × 20 = 5.0
- High conversion finding: 0.25 × 20 = 5.0
- Medium local finding: 0.30 × 10 = 3.0
- High content finding: 0.10 × 20 = 2.0
- Low local finding: 0.30 × 4 = 1.2

Returns a new array — the original is not mutated.

## Quick Wins

`buildQuickWins(findings: Finding[]): string[]`

- Filters to high and medium severity findings
- Runs through `prioritizeFindings` (highest impact first)
- Takes the top 5
- Returns each finding's `recommendation` string

These are the fastest, highest-impact actions the owner can take.

## Money Leaks

`buildMoneyLeaks(findings: Finding[]): string[]`

- Filters to high severity findings only
- Runs through `prioritizeFindings`
- Takes the top 5
- Returns each finding's `summary` string (the short business-impact statement)

These are the issues most directly costing the business revenue.
