# Directory Structure

```
Local Seo Engine/
├── README.md                          Project overview and quick start
├── package.json                       Dependencies and npm scripts
├── electron.vite.config.ts            Build config: 3 targets, path aliases
├── tsconfig.json                      TypeScript project config
│
├── electron/                          Electron main process code
│   ├── main.ts                        App entry: BrowserWindow, IPC registration, lifecycle
│   ├── preload.ts                     contextBridge — exposes window.api to renderer
│   └── ipc/
│       ├── scanHandlers.ts            Handles scan:start, dynamically imports runAudit
│       ├── fileHandlers.ts            Handles file:list-scans, file:open-report, etc.
│       └── appHandlers.ts            Handles app:version, app:platform, app:reports-path
│
├── src/
│   ├── index.html                     Renderer entry HTML
│   │
│   ├── app/
│   │   ├── main.tsx                   React root — renders RouterProvider
│   │   └── routes.tsx                 Hash router: /, /scan/new, /scan/results/:id, /scans, /settings
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           Root layout — wraps all routes
│   │   │   ├── Sidebar.tsx            Navigation sidebar
│   │   │   └── Topbar.tsx            Top bar with page title
│   │   ├── scan/
│   │   │   ├── ScanForm.tsx           URL input, business type, scan mode, 3 optional competitor URL inputs, submit button
│   │   │   ├── BusinessTypeSelect.tsx Dropdown for business type selection
│   │   │   ├── ScanProgress.tsx      Progress bar and step label during scanning
│   │   │   ├── ScoreOverview.tsx     Category score cards (5 categories + overall)
│   │   │   ├── IssueList.tsx         Grouped findings list with severity badges
│   │   │   └── QuickWins.tsx         Quick wins and money leaks panels
│   │   ├── reports/
│   │   │   └── ReportActions.tsx     "Open HTML Report" and "Open Folder" buttons
│   │   └── ui/
│   │       ├── Button.tsx            Reusable button component
│   │       ├── Card.tsx              Card container
│   │       ├── Input.tsx             Text input
│   │       ├── Select.tsx            Dropdown select
│   │       ├── Badge.tsx             Severity/status badge
│   │       ├── Progress.tsx          Progress bar
│   │       └── EmptyState.tsx        Empty state illustration + message
│   │
│   ├── features/
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx     Shows latest result banner + scan history list
│   │   ├── scans/
│   │   │   ├── NewScanPage.tsx       Hosts ScanForm → ScanProgress → navigates on complete
│   │   │   ├── ScanResultsPage.tsx   Reads latestResult from store, renders score/findings
│   │   │   ├── SavedScansPage.tsx    Lists saved scans from index.json
│   │   │   └── state/
│   │   │       └── useScanStore.ts   Zustand store: isScanning, progress, latestResult, savedScans
│   │   └── settings/
│   │       └── SettingsPage.tsx      App settings page
│   │
│   └── engine/                       Pure Node.js audit engine (no Electron/React imports)
│       ├── types/
│       │   ├── audit.ts              All core interfaces: AuditRequest, AuditResult, Finding, etc.
│       │   └── ipc.ts                IPC channel names, ScanProgressEvent, SavedScanMeta, ElectronAPI
│       │
│       ├── utils/
│       │   ├── domain.ts             normalizeInputUrl, getDomain, isSameDomain, isHttps, resolveUrl, stripTrackingParams
│       │   └── logger.ts             createLogger(prefix) factory — timestamped console output
│       │
│       ├── crawl/
│       │   ├── discoverUrls.ts       BFS crawler using Playwright BrowserContext
│       │   ├── fetchHtml.ts          Single-page Playwright fetcher (30s timeout, domcontentloaded)
│       │   ├── classifyPage.ts       URL path + heading heuristics → PageType
│       │   ├── normalizeUrl.ts       Crawler URL normalization, skip rules (extensions, paths)
│       │   ├── robots.ts             Fetches and parses robots.txt
│       │   └── sitemap.ts            Discovers and parses XML sitemaps
│       │
│       ├── extractors/
│       │   ├── index.ts              Barrel: loads cheerio once, runs all extractors, returns ExtractedSignals
│       │   ├── extractMeta.ts        title, metaDescription, canonical, noindex
│       │   ├── extractHeadings.ts    h1s, h2s arrays
│       │   ├── extractSchema.ts      JSON-LD + microdata @type values
│       │   ├── extractContactSignals.ts phones, emails, hasAddress
│       │   ├── extractLocalSignals.ts  hasMap, hasHours, cityMentions, stateMentions, hasServiceAreaText
│       │   ├── extractCTAs.ts        ctaTexts, hasForm
│       │   ├── extractTrustSignals.ts  hasTrustSignals, testimonialCount
│       │   ├── extractImages.ts      imageCount, missingAltCount
│       │   └── extractTextStats.ts   textContent, wordCount
│       │
│       ├── analyzers/
│       │   ├── types.ts              AnalyzerInput, homepage(), pagesByType(), importantPages()
│       │   ├── businessTypeDetector.ts Detects business niche from page signals
│       │   ├── technicalAnalyzer.ts  robots, sitemap, broken pages, noindex, titles, meta, H1s, alt
│       │   ├── localSeoAnalyzer.ts   NAP, LocalBusiness schema, map, hours, location pages
│       │   ├── conversionAnalyzer.ts CTAs, phone, forms, booking actions
│       │   ├── contentAnalyzer.ts    Thin pages, service pages, location pages, content gaps
│       │   └── trustAnalyzer.ts      HTTPS, testimonials, about page, gallery, trust language
│       │
│       ├── impactAnalyzer.ts     Business impact estimation — 38-rule engine, enrichFindingsWithImpact
│       │
│       ├── scoring/
│       │   ├── scoreHelpers.ts       PENALTY constants, computeScore, scoreBand, makeScore
│       │   ├── scoreTechnical.ts     Technical scorer with positive signals
│       │   ├── scoreLocalSeo.ts      Local SEO scorer with positive signals
│       │   ├── scoreConversion.ts    Conversion scorer with positive signals
│       │   ├── scoreContent.ts       Content scorer with positive signals
│       │   ├── scoreTrust.ts         Trust scorer with positive signals
│       │   ├── weightedFinalScore.ts Combines 5 category scores with fixed weights
│       │   ├── prioritizeFindings.ts Sorts by impact, buildQuickWins, buildMoneyLeaks
│       │   └── scoreConfidence.ts    Scan completeness confidence level (High/Medium/Low)
│       │
│       ├── roadmap/
│       │   └── buildFixRoadmap.ts    Priority fix roadmap — clusters findings into strategic action items
│       │
│       ├── revenue/
│       │   └── estimateRevenueImpact.ts  Heuristic lead/revenue loss estimate by business type
│       │
│       ├── reports/
│       │   ├── buildJsonReport.ts    Writes AuditResult JSON (strips html/textContent)
│       │   ├── buildHtmlReport.ts    Generates self-contained HTML report (16 sections)
│       │   ├── reportTemplates.ts    HTML helpers: scoreColor, renderFinding, renderImpactSummarySection, renderCompetitorSection, renderVisualSection, escHtml
│       │   └── buildClientSummary.ts Translates findings into plain-language summary sections (owner-focused, not competitor analysis)
│       │
│       ├── visual/
│       │   ├── viewportChecks.ts     4 self-contained page.evaluate() DOM checks
│       │   ├── captureScreenshots.ts takeScreenshot() — saves PNG to screenshotDir
│       │   └── visualAnalyzer.ts     Orchestrator — opens pages, runs checks, returns VisualAnalysisResult + findings
│       │
│       ├── competitor/
│       │   ├── index.ts              runCompetitorAnalysis() — Promise.allSettled parallel crawls
│       │   ├── competitorCrawler.ts  crawlCompetitor() — BFS max 5 pages, never throws
│       │   ├── competitorAnalyzer.ts analyzeCompetitor() — pure fn, CrawledPage[] → CompetitorSite
│       │   ├── gapAnalysis.ts        analyzeGaps() — 8 checks, 60% threshold
│       │   ├── competitorDiscovery.ts noopDiscovery stub — pluggable for future auto-discovery
│       │   └── competitorTypes.ts    Re-exports CompetitorSite, CompetitorGap, CompetitorAnalysisResult
│       │
│       ├── lighthouse/
│       │   ├── runLighthouse.ts      Launches Chrome, runs Lighthouse, returns LighthouseMetrics
│       │   └── lighthouseAnalyzer.ts Converts LighthouseMetrics into Finding objects
│       │
│       ├── storage/
│       │   ├── pathResolver.ts       initReportsDir, getReportsDir, getScreenshotsDir, buildJsonPath, buildHtmlPath, generateScanId (no Electron import — uses initReportsDir setter)
│       │   └── scanRepository.ts     listSavedScans, loadScanById, saveScan, deleteScan
│       │
│       ├── pipeline/
│       │   ├── runScanJob.ts         Pipeline orchestrator — 12 named stages, browser lifecycle, optional stage handling
│       │   ├── types.ts              ScanJobContext, ScanStageResult<T>, createScanJobContext()
│       │   └── stages/
│       │       ├── validateStage.ts  Normalise URL, generate scanId (2%)
│       │       ├── crawlStage.ts     Browser launch, robots, sitemap, BFS crawl (5–65%)
│       │       ├── extractStage.ts   extractAllSignals, classifyPage, detectBusinessType (66–72%)
│       │       ├── analysisStage.ts  5 analyzers → categoryFindings + allFindings (76–88%)
│       │       ├── visualStage.ts    Screenshots + above-the-fold checks (89%, optional)
│       │       ├── impactStage.ts    Lighthouse + enrichFindingsWithImpact + prioritize (90%, optional)
│       │       ├── scoreStage.ts     5 scorers + weighted overall (92%, required)
│       │       ├── competitorStage.ts Competitor crawl + gap analysis (94%, optional)
│       │       ├── confidenceStage.ts Score confidence level (95%, optional)
│       │       ├── roadmapStage.ts   Priority fix roadmap (96%, optional)
│       │       ├── revenueStage.ts   Revenue impact estimate (96%, optional)
│       │       └── reportStage.ts    JSON + HTML reports + saveScan + buildAuditResult (97%, required)
│       │
│       └── orchestrator/
│           └── runAudit.ts           Engine public API — thin wrapper around runScanJob
│
├── docs/                             All project documentation (this directory)
│   ├── architecture/
│   ├── app/
│   ├── engine/
│   ├── reference/
│   ├── status/
│   ├── guides/
│   └── ai/
│
└── out/                              Build output (git-ignored)
    ├── main/index.js
    ├── preload/index.js
    └── renderer/
```
