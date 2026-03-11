# Extractors

Extractors parse a single page's HTML and return structured signal data. All extractors receive a pre-loaded `CheerioAPI` instance (`$`) from the barrel module.

## cheerio/slim Note

All extractors import from `cheerio/slim`, not `cheerio`:

```typescript
import * as cheerio from 'cheerio/slim'
```

The slim build excludes `htmlparser2` and its `undici` dependency. `undici` conflicts with Node.js 18's built-in `fetch` in the Electron main process, causing runtime errors. The slim build is functionally identical for the parsing operations used here.

## Barrel Module (`extractors/index.ts`)

`extractAllSignals(html: string, pageUrl: string): ExtractedSignals`

Loads cheerio once per page (`cheerio.load(html)`) and passes the same `$` instance to all extractors. This avoids parsing the HTML nine times.

If `html` is empty or falsy, returns `emptySignals()` with all fields at zero/empty values.

## ExtractedSignals Interface

```typescript
interface ExtractedSignals {
  // Meta
  title: string
  metaDescription: string
  canonical: string
  noindex: boolean
  // Headings
  h1s: string[]
  h2s: string[]
  // Schema
  schemaTypes: string[]
  // Contact
  phones: string[]
  emails: string[]
  hasAddress: boolean
  // Local
  hasMap: boolean
  hasHours: boolean
  // CTAs
  ctaTexts: string[]
  hasForm: boolean
  // Trust
  hasTrustSignals: boolean
  testimonialCount: number
  // Images
  imageCount: number
  missingAltCount: number
  // Text
  textContent: string
  wordCount: number
}
```

This maps 1:1 onto the signal fields of `CrawledPage`.

---

## Extractor 1: extractMeta

**File**: `extractors/extractMeta.ts`

**Extracts**: `MetaSignals { title, metaDescription, canonical, noindex }`

| Signal | Source |
|---|---|
| `title` | `$('title').first().text().trim()` |
| `metaDescription` | `meta[name="description"]` content, falls back to `meta[property="og:description"]` |
| `canonical` | `link[rel="canonical"]` href |
| `noindex` | Checks both `meta[name="robots"]` and `meta[name="googlebot"]` for the string `noindex` |

---

## Extractor 2: extractHeadings

**File**: `extractors/extractHeadings.ts`

**Extracts**: `HeadingsSignals { h1s: string[], h2s: string[] }`

Collects all `<h1>` and `<h2>` text content as trimmed strings, skipping empty elements. Used by page classifier and content/technical analyzers.

---

## Extractor 3: extractSchema

**File**: `extractors/extractSchema.ts`

**Extracts**: `SchemaSignals { schemaTypes: string[] }`

Two sources:

1. **JSON-LD blocks** (`<script type="application/ld+json">`): Parses JSON, recursively walks the object graph collecting all `@type` values. Handles both string `@type` and array `@type`. Handles nested objects (`@graph`, `mainEntity`, etc.).

2. **Microdata** (`[itemtype]` attributes): Extracts the last path segment of the itemtype URL (e.g., `https://schema.org/LocalBusiness` → `LocalBusiness`).

Types are deduplicated. Full schema URLs in `@type` values are normalized to just the type name.

**Important**: The local SEO analyzer checks for these specific schema types: `LocalBusiness`, `ProfessionalService`, `HomeAndConstructionBusiness`, `FoodEstablishment`, `HealthAndBeautyBusiness`, `MedicalOrganization`, `AutoRepair`, `Restaurant`.

---

## Extractor 4: extractContactSignals

**File**: `extractors/extractContactSignals.ts`

**Extracts**: `ContactSignals { phones: string[], emails: string[], hasAddress: boolean }`

**Phone detection** (two methods):
1. `<a href="tel:...">` links — most reliable
2. Text pattern: US/CA phone format regex: `(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}` — scanned against the first matching container of: main, article, section, .contact, #contact, footer, body

**Email detection** (two methods):
1. `<a href="mailto:...">` links
2. Email regex: `[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}` — same text container search. False positives with `.png` or `.jpg` extensions are filtered.

**Address detection** (any of these):
- `[itemprop="address"]` or `[itemprop="streetAddress"]` or `[typeof="PostalAddress"]` present
- Street address regex: `\d{1,5}\s+[A-Z][a-zA-Z\s]{2,40}\s+(St|Street|Ave|Avenue|Blvd|...)` matching in body text
- `<address>` element present

Phones and emails are capped at 10 each to prevent runaway matches on pages with many phone numbers.

---

## Extractor 5: extractLocalSignals

**File**: `extractors/extractLocalSignals.ts`

**Extracts**: `LocalSignals { hasMap, hasHours, cityMentions, stateMentions, hasServiceAreaText }`

Note: `cityMentions`, `stateMentions`, and `hasServiceAreaText` are in the `LocalSignals` type but are NOT in the `ExtractedSignals` barrel output or `CrawledPage`. They are extracted but currently unused by analyzers.

**Map detection**:
- `<iframe[src]>` with src matching `maps.google.|google.com/maps`
- `<a[href]>` links matching the same patterns, or link text containing "directions"

**Hours detection** (any true):
- Days pattern: `monday|tuesday|...|sun` followed by separator
- Hours keywords (`hours|open|closed|...`) AND time pattern (`9am`, `9:00 PM`, etc.)

**State mentions**: Extracted from body text — both abbreviations (`, TX`) and full names (Texas, California, etc.)

**City mentions**: From `<title>` and `<meta name="description">` content — pattern `City, ST` where ST is a two-letter code

**Service area text**: Checks for phrases like "serving", "we serve", "service area", "proudly serving", "available in"

---

## Extractor 6: extractCTAs

**File**: `extractors/extractCTAs.ts`

**Extracts**: `CTASignals { ctaTexts: string[], hasForm: boolean }`

**CTA detection**: Scans all `<a[href]>`, `<button>`, `[role="button"]`, `<input[type="submit"]>`, `<input[type="button"]>`. Gets text from `value`, `aria-label`, or text content (skips if > 80 characters). Matches against 14 action patterns including:
- Call us/now/today
- Book now/online/appointment
- Schedule appointment/call/consultation
- Get a free quote/estimate/consultation
- Request a quote/estimate/callback
- Contact us
- Order now/online
- Reserve a table
- Free estimate/inspection
- Directions

CTA texts are capped at 20. Only texts matching one of the 14 patterns are collected.

**Form detection**: A page `hasForm` if any `<form>` element contains either 2+ non-hidden/non-search inputs, or 1+ textareas. Pure search forms (single search input) are excluded.

---

## Extractor 7: extractTrustSignals

**File**: `extractors/extractTrustSignals.ts`

**Extracts**: `TrustSignals { hasTrustSignals: boolean, testimonialCount: number }`

**Testimonial count**: Sum of matches from these selectors: `[class*="testimonial"]`, `[class*="review"]`, `[class*="rating"]`, `[class*="feedback"]`, `[id*="testimonial"]`, `[id*="review"]`, `[itemtype*="Review"]`, `blockquote`. Plus star rating widgets: `[class*="star"]`, `[class*="stars"]`, `[aria-label*="star"]`, `[aria-label*="rating"]`. Capped at 50.

**Trust keywords**: Checks body text for: licensed, insured, bonded, certified, accredited, BBB, A+ rated, years of experience, since 19xx, family-owned, satisfaction guarantee, money-back, warranty, guarantee, 5-star, award-winning, top-rated, highly recommended.

**hasTrustSignals**: True if testimonialCount > 0, OR star ratings found, OR any trust keyword matched.

---

## Extractor 8: extractImages

**File**: `extractors/extractImages.ts`

**Extracts**: `ImageSignals { imageCount: number, missingAltCount: number }`

Counts all `<img>` elements. An image is considered "missing alt" if the `alt` attribute is absent OR is an empty string after trimming.

---

## Extractor 9: extractTextStats

**File**: `extractors/extractTextStats.ts`

**Extracts**: `TextStats { textContent: string, wordCount: number }`

Clones the cheerio root to avoid mutating the shared `$`. Removes `<script>`, `<style>`, `<noscript>`, `[hidden]`, `[aria-hidden="true"]` elements. Extracts `<body>` text, collapses whitespace, splits on whitespace to count words.

**Important**: The clone operation means this extractor is the most memory-intensive for large pages, but it does not affect other extractors because they use the original `$`.
