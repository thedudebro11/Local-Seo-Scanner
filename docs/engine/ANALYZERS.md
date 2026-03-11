# Analyzers

Analyzers convert `CrawledPage[]` data into `Finding[]` objects. They run synchronously against the already-crawled data — no network calls.

## Shared Types (`analyzers/types.ts`)

### AnalyzerInput

```typescript
interface AnalyzerInput {
  pages: CrawledPage[]
  domain: string
  robotsFound: boolean
  sitemapFound: boolean
  detectedBusinessType: BusinessType
}
```

### Page Selector Helpers

| Function | Returns |
|---|---|
| `homepage(pages)` | First page with `pageType === 'home'`; falls back to `pages[0]` |
| `pagesByType(pages, ...types)` | All pages whose `pageType` is in the given list |
| `importantPages(pages)` | All pages with pageType: home, contact, service, location |

"Money pages" (`importantPages`) are analyzed more strictly than blog or gallery pages.

---

## Analyzer: businessTypeDetector

`detectBusinessType(pages: CrawledPage[], requested: BusinessType): BusinessType`

If `requested !== 'auto'`, returns `requested` immediately.

If `'auto'`, builds a signal corpus from:
1. Homepage title + H1s (doubled weight — added twice)
2. Homepage URL
3. All page titles and H1s
4. All page URLs
5. First 1000 characters of homepage `textContent`

Tests corpus against 6 regex rules in priority order:

| Business type | Key terms |
|---|---|
| `restaurant` | restaurant, menu, dining, cuisine, cafe, bistro, food, pizza, sushi, takeout |
| `salon` | salon, hair salon, nail salon, spa, beauty, barber, stylist, wax, lash, brow |
| `roofer` | roofer, roofing, roof repair, shingles, gutters, siding, metal roof |
| `auto_shop` | auto repair, auto shop, car repair, oil change, tire shop, transmission, brake |
| `contractor` | contractor, construction, remodel, renovation, handyman, plumber, electrician, hvac |
| `dentist` | dental, dentist, tooth, teeth, orthodont, implant, crown, braces, invisalign |

Returns `'other'` if no rule matches.

---

## Analyzer: technicalAnalyzer

All findings have `category: 'technical'`.

| Finding ID | Severity | Condition |
|---|---|---|
| `technical-no-robots` | low | `robotsFound === false` |
| `technical-no-sitemap` | medium | `sitemapFound === false` |
| `technical-broken-pages` | medium or high | Any page has `statusCode >= 400`; high if > 3 broken pages |
| `technical-noindex-money-pages` | high | Any service/location/contact page has `noindex: true` |
| `technical-missing-title` | high | Any key page (home/contact/service/location) has no title |
| `technical-short-title` | low | Any key page title is under 20 characters |
| `technical-long-title` | low | Any key page title is over 70 characters |
| `technical-missing-meta-desc` | medium | Any key page has no meta description |
| `technical-missing-h1` | medium | Any page (all pages) has zero H1s |
| `technical-multiple-h1` | low | Any page has more than one H1 |
| `technical-missing-canonical` | low | Any key page has no canonical link element |
| `technical-poor-image-alt` | low or medium | >30% of images site-wide are missing alt; medium if >60% |

---

## Analyzer: localSeoAnalyzer

All findings have `category: 'local'`.

Note on the key mismatch: `FindingCategory` uses `'local'` but `AuditScores` uses `'localSeo'` as the key. See [DATA_MODELS.md](../reference/DATA_MODELS.md) for details on this inconsistency.

| Finding ID | Severity | Condition |
|---|---|---|
| `local-no-phone-homepage` | high | Homepage has no phones |
| `local-no-phone-contact` | high | Contact page(s) exist but none have phones |
| `local-no-address-homepage` | medium | Homepage `hasAddress === false` |
| `local-no-localbusiness-schema` | high | No page has any of: LocalBusiness, ProfessionalService, HomeAndConstructionBusiness, FoodEstablishment, HealthAndBeautyBusiness, MedicalOrganization, AutoRepair, Restaurant in `schemaTypes` |
| `local-no-map` | medium | No page has `hasMap === true` |
| `local-no-hours` | medium | No page has `hasHours === true` |
| `local-no-location-pages` | medium | Site has 5+ pages but zero pages classified as `'location'` |

---

## Analyzer: conversionAnalyzer

All findings have `category: 'conversion'`.

| Finding ID | Severity | Condition |
|---|---|---|
| `conversion-no-cta-homepage` | high | Homepage `ctaTexts.length === 0` |
| `conversion-no-phone-homepage` | high | Homepage `phones.length === 0` |
| `conversion-no-form` | medium | No page anywhere has `hasForm === true` |
| `conversion-no-form-contact-page` | medium | Contact page(s) exist but none have a form (fires if `conversion-no-form` did not fire) |
| `conversion-low-cta-coverage` | medium | 3+ key pages, but fewer than 50% have any CTAs |
| `conversion-no-booking-cta` | medium | No page has a CTA matching booking/quote patterns (site has 3+ pages) |

Booking/quote patterns checked: book now/online/appointment, schedule appointment, get a free quote/estimate, request a quote/estimate, free estimate/inspection, order now/online, reserve a table/now.

---

## Analyzer: contentAnalyzer

All findings have `category: 'content'`.

| Finding ID | Severity | Condition |
|---|---|---|
| `content-thin-homepage` | medium | Homepage word count is between 1 and 299 |
| `content-no-service-pages` | high | 4+ pages crawled but zero classified as `'service'` |
| `content-too-few-service-pages` | medium | 6+ pages crawled but only 1 service page |
| `content-thin-service-pages` | medium | Any service page has word count between 1 and 199 |
| `content-no-location-pages` | medium | 5+ pages crawled but zero classified as `'location'` |
| `content-widespread-thin-pages` | medium | 40%+ of pages (minimum 3) that are not gallery/blog/other have under 150 words |

---

## Analyzer: trustAnalyzer

All findings have `category: 'trust'`.

| Finding ID | Severity | Condition |
|---|---|---|
| `trust-no-https` | high | Homepage `finalUrl` or `url` starts with `http://` |
| `trust-no-testimonials` | high | `testimonialCount === 0` AND `hasTrustSignals === false` across all pages |
| `trust-weak-trust-signals` | medium | Some testimonialCount > 0 but `hasTrustOnAnyPage === false` (weak path — trust signals found but no keywords) |
| `trust-no-about-page` | medium | No page classified as `'about'` |
| `trust-no-gallery` | medium | No page classified as `'gallery'` (site has 4+ pages) |
| `trust-homepage-no-trust-content` | low | Homepage `hasTrustSignals === false` AND at least one about page exists |

---

## Lighthouse Findings (`lighthouse/lighthouseAnalyzer.ts`)

These are additional `technical` category findings generated from Lighthouse metrics:

| Finding ID | Severity | Condition |
|---|---|---|
| `lh-performance-poor` | high | `performanceScore < 50` |
| `lh-performance-needs-work` | medium | `50 <= performanceScore < 70` |
| `lh-lcp-slow` | high | `largestContentfulPaint > 4000ms` |
| `lh-lcp-needs-work` | medium | `2500ms < largestContentfulPaint <= 4000ms` |
| `lh-tbt-high` | high | `totalBlockingTime > 600ms` |
| `lh-tbt-medium` | medium | `200ms < totalBlockingTime <= 600ms` |
| `lh-cls-high` | high | `cumulativeLayoutShift > 0.25` |
| `lh-cls-medium` | medium | `0.1 < cumulativeLayoutShift <= 0.25` |
| `lh-seo-low` | medium | `seoScore < 80` |
