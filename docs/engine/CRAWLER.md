# Crawler

The crawler consists of five modules in `src/engine/crawl/`.

## URL Normalization (`normalizeUrl.ts` + `domain.ts`)

Before any page is fetched, URLs go through two layers of normalization.

### User-input normalization (`domain.ts` — `normalizeInputUrl`)

Runs once on the user-submitted URL before any crawling begins:

1. Prepends `https://` if no protocol is present
2. Lowercases the hostname
3. Strips trailing slashes from the pathname (normalizes `/` to `/`)
4. Validates using `new URL()` — throws if invalid

### Crawler URL normalization (`normalizeUrl.ts` — `normalizeCrawlerUrl`)

Runs on every href found in crawled HTML:

1. Calls `resolveUrl(href, base)` from `domain.ts` to convert relative hrefs to absolute URLs
2. Calls `stripTrackingParams` to remove utm_*, fbclid, gclid, msclkid, ref, source, _ga
3. Returns `null` if the href is a fragment (#), mailto:, tel:, javascript:, or any non-http/https scheme

### Skip rules (`shouldSkipUrl`)

A URL is skipped (not added to the crawl queue) if:

**File extensions** (regex): `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.ico`, `.mp4`, `.mp3`, `.mov`, `.zip`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.exe`, `.dmg`, `.css`, `.js`, `.json`, `.xml`, `.woff`, `.woff2`, `.ttf`, `.eot`

**Path segments** (substring match): `/wp-admin`, `/wp-json`, `/wp-login`, `/cart`, `/checkout`, `/account`, `/login`, `/logout`, `/register`, `/signin`, `/signup`, `/admin`, `/feed`, `/rss`, `?replytocom`, `/tag/`, `/author/`, `/page/`

## robots.txt (`robots.ts`)

`fetchRobots(siteUrl: string): Promise<RobotsResult>`

- Fetches `<origin>/robots.txt` using global `fetch` (Node.js 18+ built-in) with a 10-second timeout
- Returns `{ found: false, ... }` on any failure (non-OK response, network error, timeout)
- Parser handles `User-agent: *` and `User-agent: Googlebot` sections
- Tracks `Disallow:` paths (deduplicated) for all matching scopes
- Sets `allowsGooglebot: false` only if there is a `Disallow: /` for `*` or `Googlebot`
- Extracts `Sitemap:` declarations (must start with `http`)
- Ignores all other user-agent sections

**Result used for**: robots.txt presence check (technical finding), sitemap URL hints, `robotsFound` flag passed to analyzers and scorers.

The crawler does NOT enforce `Disallow:` rules — it crawls all reachable same-domain pages regardless of robots.txt directives (the tool is run by the site owner, not an external crawler).

## Sitemap (`sitemap.ts`)

`fetchSitemap(siteUrl: string, robotsSitemapUrls?: string[]): Promise<SitemapResult>`

**Discovery order**:
1. Try each URL from robots.txt `Sitemap:` declarations first
2. Fall back to common paths: `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap.php`, `/wp-sitemap.xml`, `/sitemap-index.xml`

For each candidate:
- Fetches with 10-second timeout
- Returns `{ found: false }` on non-OK response
- Validates response starts with `<` (XML content)
- Parses with `cheerio/slim` in `xmlMode: true`

**Parsing handles two formats**:
- `<urlset>` (regular sitemap): extracts `<url><loc>` values
- `<sitemapindex>` (index file): extracts `<sitemap><loc>` values — returns these as the URL list but does NOT recursively fetch child sitemaps

**Result used for**: sitemap presence check (technical finding), `sitemapFound` flag.

Note: The sitemap URLs are parsed but not directly fed into the crawler queue. The crawl uses BFS from the start URL and discovers URLs organically via links.

## HTML Fetcher (`fetchHtml.ts`)

`fetchHtml(url: string, context: BrowserContext): Promise<FetchHtmlResult>`

Uses a provided Playwright `BrowserContext`. Creates a new `Page`, navigates, extracts content, and closes the page:

- Timeout: 30 seconds (`PAGE_TIMEOUT_MS = 30_000`)
- Wait condition: `'domcontentloaded'` (does not wait for full page load/network idle)
- Returns `{ requestedUrl, finalUrl, statusCode, html }`
- `finalUrl` = `page.url()` after navigation (reflects any redirects)
- `statusCode` = `response.status()` or 0 if no response
- On any error (timeout, network failure): returns `{ statusCode: 0, html: '' }`

## BFS Crawler (`discoverUrls.ts`)

`discoverUrls(startUrl, browser, maxPages, domain, onProgress?): Promise<DiscoverUrlsResult>`

Creates a single `BrowserContext` per crawl run (shared across all pages for session/cookie sharing and header injection):

```typescript
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 ... LocalSEOScanner/1.0',
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: { Accept: 'text/html,...' },
})
```

**BFS algorithm**:
- `visited` = Set of already-seen URLs
- `queue` = string[] starting with `[startUrl]`
- Loop: while queue is non-empty AND `fetchedPages.length < maxPages`
  1. Dequeue front URL
  2. Skip if in `visited`; add to `visited`
  3. `fetchHtml(url, context)` → `FetchHtmlResult`
  4. Skip failed fetches (statusCode 0 + empty html)
  5. Skip non-HTML responses (content does not start with `<`)
  6. Push to `fetchedPages`
  7. Call `onProgress(fetched, queued)` for progress reporting
  8. If budget remains: extract internal links, add unseen ones to queue

**Link extraction**: Uses `cheerio/slim` to parse HTML and find all `<a[href]>` elements. Each href goes through `normalizeCrawlerUrl` then `isSameDomain` then `shouldSkipUrl`.

**Same-domain check**: Compares hostnames using `new URL(a).hostname === new URL(b).hostname`. This is exact hostname equality — `www.example.com` is treated as a DIFFERENT domain from `example.com`. See [CURRENT_LIMITATIONS.md](../status/CURRENT_LIMITATIONS.md) for implications.

**Returns**:
```typescript
interface DiscoverUrlsResult {
  fetchedPages: FetchHtmlResult[]
  internalLinkGraph: Record<string, string[]>  // finalUrl → [linked URLs]
}
```

The context is always closed in a `finally` block. The browser itself is closed by `runAudit`'s `finally` block.

## Page Classifier (`classifyPage.ts`)

`classifyPage(url, title, h1s, h2s): PageType`

Classification order (first match wins):

1. Root path (`/` or empty) → `'home'`
2. URL path rules (regex against `pathname.toLowerCase()`):
   - contact/contact-us/reach-us/get-in-touch/find-us → `'contact'`
   - book/booking/appointments/schedule/reserve/reservations → `'booking'`
   - menu/food/drinks/cuisine/order-online → `'menu'`
   - gallery/photos/portfolio/our-work/projects → `'gallery'`
   - about/about-us/our-story/our-team/who-we-are/company → `'about'`
   - locations/areas/cities/serve/coverage/service-area → `'location'`
   - services/what-we-do/our-services/solutions/offerings → `'service'`
   - blog/news/articles/posts/updates/resources → `'blog'`
3. Heading text rules (regex against combined `h1s + h2s + title` string)
4. Falls back to `'other'`

The PageType determines which pages are treated as "money pages" by the analyzers.

## Crawl Limits

| Setting | Value |
|---|---|
| Page timeout | 30 seconds per page |
| robots.txt fetch timeout | 10 seconds |
| Sitemap fetch timeout | 10 seconds |
| Max pages | Set by user in `AuditRequest.maxPages` |
| Max phones per page | 10 (cap in extractContactSignals) |
| Max emails per page | 10 (cap in extractContactSignals) |
| Max city mentions | 10 (cap in extractLocalSignals) |
| Max CTA texts | 20 (cap in extractCTAs) |
| Max testimonial count | 50 (cap in extractTrustSignals) |
