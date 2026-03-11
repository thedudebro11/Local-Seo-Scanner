# Competitor Gap Analysis

## Status: NOT IMPLEMENTED

Competitor gap analysis is **not implemented** in this codebase. No feature, module, function, or data structure exists for comparing the audited site against competitor sites.

This document describes what IS implemented (which is sometimes mistakenly described as competitor analysis), where competitor analysis would go if added, and what the existing `buildClientSummary` function actually does.

---

## What IS Implemented: Owner-Focused Audit

The engine audits a single target URL and generates findings about that site alone. It does not fetch, crawl, or compare any other website.

The output is an owner-focused report that answers:
- What is wrong with this site?
- Which issues are hurting Google visibility?
- Which issues are hurting lead capture?
- What should the owner fix first?

This is a self-contained audit, not a competitive analysis.

---

## What buildClientSummary Actually Does

`src/engine/reports/buildClientSummary.ts` builds three sections for the HTML report:

```typescript
interface ClientSummary {
  whatIsHurtingVisibility: string[]   // Issues from technical, local, content categories
  whatMayBeHurtingLeads: string[]     // Issues from conversion, trust categories
  fastestWins: string[]               // Top 5 quickWins recommendations
}
```

This function:
1. Filters the audit's own findings by category and severity
2. Formats them as plain-language statements: `"${f.title} — ${f.summary}"`
3. Is used in the "What's Holding This Business Back" section of the HTML report

There is no comparison to competitor data. The "visibility" and "leads" sections describe issues found on the audited site alone.

---

## Where Competitor Analysis Would Go

If competitor gap analysis were added in the future, the appropriate locations would be:

1. **New orchestrator step** in `runAudit.ts` — after the main site is fully crawled and analyzed, accept competitor URLs from `AuditRequest`, crawl each competitor (same pipeline), and compare signal sets

2. **New analyzer** — `src/engine/analyzers/competitorAnalyzer.ts` — takes the audited site's `CrawledPage[]` and each competitor's `CrawledPage[]`, returns findings for gaps (e.g., "Competitor A has LocalBusiness schema, you do not")

3. **New AuditRequest field** — `competitorUrls?: string[]` in `src/engine/types/audit.ts`

4. **New AuditResult field** — `competitorGaps?: CompetitorGap[]` or similar

5. **UI additions** — New section in `ScanForm` to accept competitor URLs, new section in `ScanResultsPage` to display gap findings

6. **Report section** — New section in `buildHtmlReport.ts` using a template from `reportTemplates.ts`

None of these exist in the current codebase.

---

## Summary

| Claim | Truth |
|---|---|
| "The app does competitor analysis" | FALSE |
| "buildClientSummary compares to competitors" | FALSE — it summarizes the site's own issues |
| "The report shows gaps vs competitors" | FALSE — it shows gaps in the site's own implementation |
| "Competitor analysis is possible in the future" | TRUE — the architecture supports it with the additions listed above |
