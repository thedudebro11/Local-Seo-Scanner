# Current Limitations

## Crawler Limitations

### www vs non-www Domain Mismatch (Critical)

**The issue**: The same-domain check uses exact hostname equality (`getDomain(a) === getDomain(b)`). If the start URL is `https://example.com/` but all internal links point to `https://www.example.com/page`, those links will be filtered out as "different domain". The result: only the homepage is crawled, even if `maxPages` is set to 20.

**How to reproduce**: Sites that redirect bare domain to www — user enters `example.com`, normalizer makes it `https://example.com/`, page redirects to `www.example.com`, but all links on that page use `https://www.example.com/` as base. `isSameDomain('https://www.example.com/about', 'https://example.com')` returns `false`.

**Impact**: Affects a large proportion of real websites. A single-page scan means findings will reflect only homepage signals and will miss service pages, contact pages, location pages, and most other content.

**Workaround**: User should enter the `www.` version of the URL if the site uses it.

**Fix approach**: Normalize both bare domain and www to the same canonical hostname before comparison, or strip `www.` prefix from both sides in `isSameDomain`.

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
