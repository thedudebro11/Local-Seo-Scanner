# How to Add a New HTML Report Section

The HTML report is generated entirely by `src/engine/reports/buildHtmlReport.ts`. All visual helpers are in `src/engine/reports/reportTemplates.ts`. This guide adds a new "Social Media Presence" section to the HTML report.

## Step 1: Add Data to AuditResult (If Needed)

If your new section requires data that is not already in `AuditResult`, add it first. For example, to add social media presence data:

In `src/engine/types/audit.ts`:
```typescript
export interface AuditResult {
  // ...existing fields...
  socialPresence?: {
    hasFacebook: boolean
    hasInstagram: boolean
    socialUrls: string[]
  }
}
```

Then populate it in a new pipeline stage (or extend an existing optional stage) in `src/engine/pipeline/stages/`.

For this guide, we assume the data already exists in the crawled pages (e.g., `page.hasFacebook` added by a new extractor).

## Step 2: Add a Template Helper (If Needed)

If your section needs a new reusable HTML builder, add it to `src/engine/reports/reportTemplates.ts`.

For example, add a helper that renders a yes/no status list:

```typescript
export function renderStatusList(items: Array<{ label: string; present: boolean }>): string {
  const rows = items.map(({ label, present }) => {
    const icon  = present ? '✓' : '✗'
    const color = present ? '#16a34a' : '#dc2626'
    return `<li style="color:${color}">${icon} ${escHtml(label)}</li>`
  }).join('')
  return `<ul style="list-style:none;padding:0">${rows}</ul>`
}
```

All helpers must:
- Accept only plain JavaScript types (strings, numbers, arrays, objects)
- Return a raw HTML string
- Use `escHtml()` for any user-sourced string content
- Have no side effects

## Step 3: Add the Section to buildHtmlReport.ts

Open `src/engine/reports/buildHtmlReport.ts` and find the `generateHtml` function.

Sections are concatenated in the main template literal. Find the appropriate insertion point:

```
Header
Overall score block
Score Confidence block
Category score cards
What's Holding This Business Back   ← insert before or after here
Revenue-Impacting Issues
🚨 Revenue Impact Summary
✅ Quick Wins
⚡ Page Speed & Core Web Vitals
🖥️ Visual UX Analysis
🏆 Competitor Gap Analysis
💰 Revenue Impact Estimator
🗺️ Priority Fix Roadmap
All Issues Found                    ← or here
Score Breakdown Detail
Footer
```

Add your section as a conditional block (use an IIFE or ternary if the logic is complex):

```typescript
// Social media presence section
${(() => {
  const pagesWithFacebook  = r.pages.filter(p => p.hasFacebook).length
  const pagesWithInstagram = r.pages.filter(p => p.hasInstagram).length
  const hasSocial = pagesWithFacebook > 0 || pagesWithInstagram > 0

  if (!hasSocial && r.pages.length === 0) return ''

  return `
  <div class="section">
    <h2>Social Media Links</h2>
    ${renderStatusList([
      { label: 'Facebook profile link found', present: pagesWithFacebook > 0 },
      { label: 'Instagram profile link found', present: pagesWithInstagram > 0 },
    ])}
  </div>`
})()}
```

## Step 4: Add CSS (If Needed)

All CSS is inlined in the `<style>` block at the top of `generateHtml`. If your section needs new CSS classes, add them there:

```css
/* Social section */
.social-status-icon { font-size: 16px; margin-right: 6px; }
```

Keep CSS additions minimal — the existing utility classes (`section`, `score-card`, etc.) cover most layout needs.

## Step 5: Handle the Print Case

The existing `@media print` block handles basic print styles. If your section should be hidden in print, add:

```css
@media print {
  .social-section { display: none; }
}
```

## Step 6: Test

```bash
npm run build   # Confirm TypeScript compiles
npm run dev     # Run a scan and open the HTML report
```

Open the generated `report.html` file (via the "Open Report" button) to verify the section appears correctly. Also open it in a browser's print preview to check print layout.

## Important Notes

- All user-supplied strings MUST pass through `escHtml()` before being inserted into the HTML template. Domain names, page titles, URLs, and any text that came from a crawled page could contain HTML-special characters.
- The report must be fully self-contained — do not add `<link>` tags, `<script src>` tags, or references to external files. If you need icons, use Unicode characters or inline SVG.
- Use the existing color scheme from `scoreColor()` and `severityColor()` for consistency.
