# Implementation Status

All phases are complete, including additional phases added after the original plan.

## Phase Summary

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Config, Electron shell, React shell, IPC skeleton, types, utils | Done |
| Phase 2 | Zustand store, ScanForm, progress wiring, stub result flow | Done |
| Phase 3 | Real crawler (Playwright BFS + robots + sitemap + classifyPage) | Done |
| Phase 4 | All extractors (extractAllSignals) | Done |
| Phase 5 | All analyzers + businessTypeDetector → real findings | Done |
| Phase 6 | Scoring + prioritizeFindings → quickWins + moneyLeaks | Done |
| Phase 7 | JSON + HTML report generation + scanRepository + openReport | Done |
| Phase 8 | Lighthouse integration + full UI polish | Done |
| Phase 9 | Visual UX Analysis — Playwright screenshots + above-the-fold DOM checks | Done |
| Phase 9+ | Impact Engine — business impact estimation layer for all findings | Done |
| Phase 10 | Competitor Gap Analysis — crawl up to 3 competitors, identify gaps | Done |
| Post-10a | Score Confidence + Priority Fix Roadmap + Revenue Impact Estimator | Done |
| Post-10b | Pipeline/Job Architecture Refactor — named stages, ScanJobContext | Done |
| Bug fix | Removed computeImpactPenalty — was double-penalizing findings in overall score | Done |

### Phase 9 — Visual UX Analysis

I implemented deterministic above-the-fold analysis using Playwright `page.evaluate()` — no ML or OCR. The engine captures screenshots of the homepage, contact page, and service page, then runs four heuristic checks on the homepage:

- `hasAboveFoldCta` — strong CTA button/link visible in the first viewport
- `hasPhoneVisible` — phone number or `tel:` link visible above the fold
- `hasTrustSignalsVisible` — trust keywords visible near the top
- `hasHeroClarity` — H1/hero headline present and descriptive

Visual findings (category `conversion` or `trust`, severity `medium`) are appended to `allFindings`. Screenshots are saved as `<scanId>/screenshots/*.png`. The HTML report gains a **🖥️ Visual UX Analysis** section with a screenshot row and check results table.

Module location: `src/engine/visual/` — `viewportChecks.ts`, `captureScreenshots.ts`, `visualAnalyzer.ts`

### Phase 9+ — Impact Engine

I added a business impact estimation layer on top of the existing finding system without changing any existing scoring logic.

`src/engine/impactAnalyzer.ts` exports:
- `analyzeIssueImpact(finding, businessType)` — returns `{ impactLevel, impactReason, estimatedBusinessEffect }` using 38 specific finding-ID rules with category × severity fallback
- `enrichFindingsWithImpact(findings, businessType)` — adds impact fields to every finding (non-destructive spread)
- `computeImpactPenalty(findings)` — sums per-level deductions (CRITICAL −12, HIGH −8, MEDIUM −4, LOW −1), capped at −30, applied to `scores.overall` only

Each `Finding` now carries optional fields: `impactLevel`, `impactReason`, `estimatedBusinessEffect`.

The HTML report gains a **🚨 Revenue Impact Summary** section (above Quick Wins) grouping findings by impact level with counts and business-effect descriptions. Individual finding cards also show an impact badge.

### Phase 10 — Competitor Gap Analysis

I implemented a full competitor crawl and gap analysis system in `src/engine/competitor/`.

- `ScanForm.tsx` now includes three optional competitor URL inputs; blank entries are filtered and `https://` is prepended automatically
- The engine crawls each competitor (up to 3 URLs, max 5 pages each) using the existing Playwright BFS crawler
- `competitorAnalyzer.ts` extracts a `CompetitorSite` signal summary from each crawl
- `gapAnalysis.ts` runs 8 gap checks; a gap fires when ≥ 60% of successful competitor crawls have an advantage the client lacks
- Results appear in `AuditResult.competitor` and in the **🏆 Competitor Gap Analysis** HTML report section
- If no URLs are provided the step is skipped entirely

### Post-10a — Score Confidence + Priority Fix Roadmap + Revenue Impact Estimator

Three new optional output layers added after Phase 10:

- **Score Confidence** (`src/engine/scoring/scoreConfidence.ts`): `ScoreConfidence { level, reason }` — explains how reliable the scan data is based on completeness signals (page count, Lighthouse, visual, competitor). Added to `AuditResult.scoreConfidence`.

- **Priority Fix Roadmap** (`src/engine/roadmap/buildFixRoadmap.ts`): Up to 10 `FixRoadmapItem` objects — clusters related findings into strategic plain-English action items ranked by impact score. Added to `AuditResult.roadmap`.

- **Revenue Impact Estimator** (`src/engine/revenue/estimateRevenueImpact.ts`): `RevenueImpactEstimate` — heuristic lead/revenue loss estimate using per-business-type lead value config. Confidence always capped at 'Medium'. Added to `AuditResult.revenueImpact`.

The HTML report gains three new sections: **Score Confidence block** (below overall score), **💰 Revenue Impact Estimator** section, and **🗺️ Priority Fix Roadmap** section.

Also fixed a scoring bug: `computeImpactPenalty` was removed because it double-penalized findings — category scores already reflect findings via the deduction model, and applying an additional -30 to the overall was causing a ~89 weighted average to appear as ~59.

### Post-10b — Pipeline/Job Architecture Refactor

`runAudit.ts` was refactored from a monolithic 250-line function into a staged pipeline:

- `src/engine/pipeline/runScanJob.ts` — orchestrator with required vs optional stage handling
- `src/engine/pipeline/types.ts` — `ScanJobContext` mutable accumulator + `createScanJobContext()`
- `src/engine/pipeline/stages/` — 12 named stage modules (validate, crawl, extract, analysis, visual, impact, score, competitor, confidence, roadmap, revenue, report)

`runAudit.ts` is now a 24-line thin wrapper calling `runScanJob`. The public API is unchanged.

## Feature-Level Status

| Feature | Status | File(s) | Notes |
|---|---|---|---|
| Electron BrowserWindow | Done | `electron/main.ts` | |
| contextBridge / preload | Done | `electron/preload.ts` | |
| IPC scan handler | Done | `electron/ipc/scanHandlers.ts` | |
| IPC file handlers | Done | `electron/ipc/fileHandlers.ts` | |
| IPC app handlers | Done | `electron/ipc/appHandlers.ts` | |
| React router (5 routes) | Done | `src/app/routes.tsx` | |
| AppShell layout | Done | `src/components/layout/` | |
| Dashboard page | Done | `src/features/dashboard/DashboardPage.tsx` | |
| New scan page | Done | `src/features/scans/NewScanPage.tsx` | |
| Scan results page | Done | `src/features/scans/ScanResultsPage.tsx` | |
| Saved scans page | Done | `src/features/scans/SavedScansPage.tsx` | |
| Settings page | Done | `src/features/settings/SettingsPage.tsx` | |
| Zustand store | Done | `src/features/scans/state/useScanStore.ts` | |
| ScanForm component | Done | `src/components/scan/ScanForm.tsx` | |
| ScanProgress component | Done | `src/components/scan/ScanProgress.tsx` | |
| ScoreOverview component | Done | `src/components/scan/ScoreOverview.tsx` | |
| IssueList component | Done | `src/components/scan/IssueList.tsx` | |
| QuickWins component | Done | `src/components/scan/QuickWins.tsx` | |
| ReportActions component | Done | `src/components/reports/ReportActions.tsx` | |
| UI primitives | Done | `src/components/ui/` | Button, Card, Input, Select, Badge, Progress, EmptyState |
| URL normalization | Done | `src/engine/utils/domain.ts` | |
| Logger | Done | `src/engine/utils/logger.ts` | |
| robots.txt fetcher | Done | `src/engine/crawl/robots.ts` | |
| Sitemap fetcher/parser | Done | `src/engine/crawl/sitemap.ts` | |
| HTML fetcher (Playwright) | Done | `src/engine/crawl/fetchHtml.ts` | |
| BFS crawler | Done | `src/engine/crawl/discoverUrls.ts` | Known limitation: www vs non-www |
| URL normalizer (crawler) | Done | `src/engine/crawl/normalizeUrl.ts` | |
| Page classifier | Done | `src/engine/crawl/classifyPage.ts` | |
| Extractor barrel | Done | `src/engine/extractors/index.ts` | |
| extractMeta | Done | `src/engine/extractors/extractMeta.ts` | |
| extractHeadings | Done | `src/engine/extractors/extractHeadings.ts` | |
| extractSchema | Done | `src/engine/extractors/extractSchema.ts` | JSON-LD + microdata |
| extractContactSignals | Done | `src/engine/extractors/extractContactSignals.ts` | US/CA phone format |
| extractLocalSignals | Done | `src/engine/extractors/extractLocalSignals.ts` | |
| extractCTAs | Done | `src/engine/extractors/extractCTAs.ts` | |
| extractTrustSignals | Done | `src/engine/extractors/extractTrustSignals.ts` | |
| extractImages | Done | `src/engine/extractors/extractImages.ts` | |
| extractTextStats | Done | `src/engine/extractors/extractTextStats.ts` | |
| Business type detector | Done | `src/engine/analyzers/businessTypeDetector.ts` | 6 business types |
| Technical analyzer | Done | `src/engine/analyzers/technicalAnalyzer.ts` | 11 finding types |
| Local SEO analyzer | Done | `src/engine/analyzers/localSeoAnalyzer.ts` | 7 finding types |
| Conversion analyzer | Done | `src/engine/analyzers/conversionAnalyzer.ts` | 5 finding types |
| Content analyzer | Done | `src/engine/analyzers/contentAnalyzer.ts` | 6 finding types |
| Trust analyzer | Done | `src/engine/analyzers/trustAnalyzer.ts` | 5 finding types |
| Score helpers | Done | `src/engine/scoring/scoreHelpers.ts` | |
| Technical scorer | Done | `src/engine/scoring/scoreTechnical.ts` | |
| Local SEO scorer | Done | `src/engine/scoring/scoreLocalSeo.ts` | |
| Conversion scorer | Done | `src/engine/scoring/scoreConversion.ts` | |
| Content scorer | Done | `src/engine/scoring/scoreContent.ts` | |
| Trust scorer | Done | `src/engine/scoring/scoreTrust.ts` | |
| Weighted final score | Done | `src/engine/scoring/weightedFinalScore.ts` | |
| Finding prioritization | Done | `src/engine/scoring/prioritizeFindings.ts` | quickWins, moneyLeaks |
| Score confidence | Done | `src/engine/scoring/scoreConfidence.ts` | High/Medium/Low + reason |
| Fix roadmap builder | Done | `src/engine/roadmap/buildFixRoadmap.ts` | 14 clusters, up to 10 items |
| Revenue impact estimator | Done | `src/engine/revenue/estimateRevenueImpact.ts` | Per-business-type lead value table |
| JSON report builder | Done | `src/engine/reports/buildJsonReport.ts` | |
| HTML report builder | Done | `src/engine/reports/buildHtmlReport.ts` | Self-contained, print-friendly, 16 sections |
| Report templates | Done | `src/engine/reports/reportTemplates.ts` | |
| Client summary builder | Done | `src/engine/reports/buildClientSummary.ts` | |
| Lighthouse runner | Done | `src/engine/lighthouse/runLighthouse.ts` | Best-effort, skips if no Chrome |
| Lighthouse analyzer | Done | `src/engine/lighthouse/lighthouseAnalyzer.ts` | 9 finding types |
| Visual analyzer | Done | `src/engine/visual/` | viewportChecks, captureScreenshots, visualAnalyzer |
| Impact analyzer | Done | `src/engine/impactAnalyzer.ts` | 38 ID rules + category×severity fallback |
| Competitor crawler | Done | `src/engine/competitor/competitorCrawler.ts` | max 5 pages per competitor |
| Competitor analyzer | Done | `src/engine/competitor/competitorAnalyzer.ts` | CompetitorSite signal extraction |
| Gap analysis | Done | `src/engine/competitor/gapAnalysis.ts` | 8 gap checks, 60% threshold |
| Competitor orchestrator | Done | `src/engine/competitor/index.ts` | Promise.allSettled parallel crawls |
| ScanForm competitor inputs | Done | `src/components/scan/ScanForm.tsx` | 3 optional URL fields |
| Path resolver | Done | `src/engine/storage/pathResolver.ts` | Uses Electron userData |
| Scan repository | Done | `src/engine/storage/scanRepository.ts` | list, load, save, delete |
| Pipeline orchestrator | Done | `src/engine/pipeline/runScanJob.ts` | 12 named stages, ScanJobContext |
| Pipeline stage modules | Done | `src/engine/pipeline/stages/` | validate, crawl, extract, analysis, visual, impact, score, competitor, confidence, roadmap, revenue, report |
| Audit entry point | Done | `src/engine/orchestrator/runAudit.ts` | Thin wrapper around runScanJob |

## Not Implemented

| Feature | Notes |
|---|---|
| Competitor auto-discovery | `noopDiscovery` stub always returns `[]`; pluggable for future |
| Google Search Console integration | Out of scope |
| Google My Business integration | Out of scope |
| Sitemap URL injection into crawler | Sitemap is found but not used to seed the BFS queue |
| Disk-load for old scan results in UI | `file:load-scan` IPC exists but ScanResultsPage does not auto-call it |
| robots.txt Disallow enforcement | Crawler ignores Disallow rules by design (owner-run tool) |
| International phone formats | Only US/CA format supported |
| Non-English page content | No language detection or localized pattern matching |
| PDF/document scanning | Crawler skips PDF and document links |
| Multi-location business support | Single URL entry point only |
