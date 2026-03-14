# Current Limitations

## Crawler Limitations

### www vs non-www Domain Mismatch — FIXED

I added `stripWww(hostname)` to `src/engine/utils/domain.ts` and updated `isSameDomain()` to strip the `www.` prefix from both hostnames before comparing. Sites that redirect `example.com` → `www.example.com` now crawl correctly — all internal links are recognized as same-domain.

The old workaround of entering the `www.` URL manually is no longer necessary.

### JavaScript-Rendered Content Requires Load Time

Playwright uses `waitUntil: 'domcontentloaded'` — not `'networkidle'` or `'load'`. Sites that render content entirely via client-side JavaScript after DOMContentLoaded may return nearly empty HTML. The extracted signals for such pages will be sparse.

**Fix approach**: Add `waitUntil: 'networkidle'` as an option, or use `page.waitForTimeout` with a short delay. Trade-off: slower crawl.

### Crawler Does Not Respect robots.txt Disallow Rules

The crawler fetches all reachable same-domain pages regardless of `Disallow:` rules in robots.txt. This is intentional — the tool is run by the site owner, who has a legitimate right to audit their own site. However, it may cause unexpected behavior on sites with aggressive admin/staging paths that could trigger security systems.

### Sitemap URLs Not Seeded into Crawler Queue

The sitemap is fetched and parsed (`sitemapResult.urls` may contain hundreds of URLs) but those URLs are NOT added to the BFS crawl queue. The crawler discovers pages only via following links from already-crawled pages. This means deep pages reachable only via the sitemap (not linked from any crawled page) will not be analyzed.

**Fix approach**: Add sitemap URLs to the initial BFS queue after robots/sitemap steps.

### Single BrowserContext Per Scan

All pages share one `BrowserContext` (same cookies, session). This is correct for most sites but may cause issues on sites that use cookies to show different content per session.

---

## Phone Number Detection Limitations

The phone regex only matches US/CA formats:
- `(555) 555-5555`
- `555-555-5555`
- `555.555.5555`
- `+1 555 555 5555`

International phone numbers (e.g., UK `+44 20 1234 5678`, Australian `(02) 1234 5678`) are not detected. The `local-no-phone-homepage` and `conversion-no-phone-homepage` findings will fire on international sites even if a phone number is present.

---

## Lighthouse Limitations

### Requires Chrome

Lighthouse requires a Chrome or Chromium browser. The runner:
1. Tries to auto-detect system Chrome first
2. Falls back to Playwright's bundled Chromium (`chromium.executablePath()`)

If neither is available (e.g., the Playwright Chromium download was skipped), Lighthouse is silently skipped. The scan still completes but `lighthouse` is absent from `AuditResult` and no Lighthouse findings are generated.

### Only Audits the Homepage

`runLighthouse` is called with `normalizedUrl` (the start URL). Only one Lighthouse audit runs per scan. Service pages and other pages are not performance-audited.

### Lighthouse Runs Sequentially After Playwright

Lighthouse launches its own Chrome instance (separate from the Playwright browser used for crawling). Both the Playwright browser and the Lighthouse Chrome instance are running during the Lighthouse step. On low-memory machines this may cause slowdowns.

---

## Content Analysis Limitations

### Word Count Accuracy

`extractTextStats` removes `script`, `style`, `noscript`, `[hidden]`, and `[aria-hidden="true"]` before counting words. However, navigation menus, footers, cookie banners, and cookie consent text are included. The word count may be inflated compared to "meaningful content" word count.

### Content Depth for SPA Sites

On sites built with React, Vue, or Angular where most content is loaded via JavaScript, the `textContent` and `wordCount` may be artificially low because Playwright's `domcontentloaded` wait may not allow time for all content to render.

---

## Schema Detection Limitations

Schema.org types from `@type` fields are collected exactly as written. Some sites use full URL form (`https://schema.org/LocalBusiness`) which is normalized. But some sites use custom types or misspelled types (e.g., `LocalBuisness`) which will not match the expected list in `localSeoAnalyzer`.

---

## Trust Signal Detection Limitations

The testimonial count is based on CSS class/id pattern matching and schema markup. Sites that display testimonials without conventional class names or schema markup may not be detected. Conversely, sites with many `blockquote` elements (e.g., content sites with extensive quotes) may have inflated testimonial counts.

---

## Classification Limitations

`classifyPage` uses URL path and heading heuristics. Pages with unusual URL structures or no heading text may be classified as `'other'`. Pages classified as `'other'` are not included in "key pages" analysis, so issues on those pages may not surface as findings.

---

## Scale Limitations

### No Incremental Scanning

Each scan is a full re-crawl from scratch. There is no caching, incremental update, or change detection between scans.

### No Rate Limiting or Politeness Delay

The crawler does not add delays between page requests. On small sites this is fine; on sites with aggressive rate limiting or DDoS protection, it may result in some pages returning 429 or 403 responses.

### Memory Usage on Large Sites

With `maxPages` set high (50+), the crawler loads full HTML for each page into memory in `fetchedPages`. For very large pages, this may cause significant memory consumption during the extraction phase.

---

## Bulk Scan Limitations (Phase 13)

### Sequential Execution — No Parallelism

`runBulkScan` processes domains one at a time. A batch of 20 sites runs 20 full Playwright crawls in sequence. Each scan takes 30–120 seconds, so large batches can take many minutes. There is no concurrent crawling across domains.

### Memory Accumulates Across Domains

Each `runAudit()` call creates its own Playwright browser instance (launched and closed per domain). However, all `BulkScanItemResult` objects are held in memory until the batch completes and the result is saved. For large batches, this is a non-trivial memory footprint.

### No Partial Save on Failure

If the process is killed mid-batch, the in-progress `BulkScanResult` is lost. Only successfully completed batches are saved to `reports/bulk/<batchId>.json`.

---

## Market Discovery Limitations (Phase 14)

### DuckDuckGo Lite Rate Limiting

`marketDiscovery.ts` scrapes DuckDuckGo Lite (HTML, no API key). DuckDuckGo may throttle or block repeated requests from the same IP. If discovery returns fewer results than expected, the scraper was likely rate-limited. There is no retry logic or delay backoff.

### Result Count Is Unpredictable

DDG Lite returns a variable number of organic results per query. Typical results: 5–15 domains per search. The discovery result depends entirely on what DDG returns at the time the query runs.

### Directory Blocklist Is Static

The 50+ domain blocklist (Yelp, Angi, HomeAdvisor, etc.) is hardcoded. New aggregator sites not in the list will pass through and appear as discovery candidates. The blocklist is in `marketDiscovery.ts`.

### No Deduplication Across Multiple Runs

Running discovery twice for the same query/market creates two separate `MarketDiscoveryResult` files. The UI does not merge or deduplicate results across runs.

---

## Market Intelligence Dashboard Limitations (Phase 15)

### Does Not Re-Scan

`buildMarketDashboard()` reads from an existing `BulkScanResult`. If the bulk scan results are stale (days/weeks old), the dashboard reflects stale data. There is no "refresh" flow that re-scans already-discovered domains.

### Outreach Score Is Heuristic Only

`computeOutreachScore()` produces a 0–11pt score based on thresholds (score <70, revenue loss >$1k, etc.). It is not trained on actual conversion data. High outreach score does not guarantee a domain is actually a good prospect.

### No Email / Contact Discovery

The dashboard identifies outreach targets by domain and SEO score but does not attempt to find contact emails, phone numbers, or business names for the identified targets beyond what was extracted during the scan.

---

## Monitoring Limitations (Phase 11)

### No Automated Scheduling

The monitoring data model is complete (`TrackedSite`, `SiteScanSummary`, `sites.json`). However, there is no scheduler — periodic re-scans must be triggered manually. The UI for scheduling monitoring runs is not built.

### Monitoring History Only Grows

`saveScanSummary()` appends a new entry per scan with no pruning. For a site monitored daily, the history directory will accumulate one JSON file per scan indefinitely.
