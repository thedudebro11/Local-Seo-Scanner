# Report Schema

## report.json

`<userData>/reports/<scanId>/report.json`

The JSON report is a serialized `AuditResult` with `html` and `textContent` stripped from all pages. Written by `buildJsonReport.ts` using `fs-extra`'s `writeJson` with 2-space indentation.

### Top-level Structure

```json
{
  "id": "example.com_1710000000000",
  "request": { ... },
  "scannedAt": "2026-03-10T12:00:00.000Z",
  "domain": "example.com",
  "detectedBusinessType": "contractor",
  "pages": [ ... ],
  "findings": [ ... ],
  "scores": { ... },
  "quickWins": [ ... ],
  "moneyLeaks": [ ... ],
  "lighthouse": [ ... ],
  "artifacts": { ... }
}
```

### request

```json
{
  "url": "https://example.com",
  "scanMode": "full",
  "businessType": "auto",
  "maxPages": 20
}
```

### pages (one entry per CrawledPage, html and textContent stripped)

```json
{
  "url": "https://example.com/",
  "finalUrl": "https://www.example.com/",
  "statusCode": 200,
  "pageType": "home",
  "title": "Example Roofing | Austin TX",
  "metaDescription": "Professional roof repair in Austin TX...",
  "h1s": ["Austin's Most Trusted Roofers"],
  "h2s": ["Our Services", "Why Choose Us"],
  "canonical": "https://www.example.com/",
  "noindex": false,
  "wordCount": 842,
  "imageCount": 12,
  "missingAltCount": 3,
  "phones": ["+15125551234"],
  "emails": ["info@example.com"],
  "hasAddress": true,
  "hasMap": true,
  "hasHours": true,
  "hasForm": true,
  "ctaTexts": ["Get a Free Estimate", "Call Us Today"],
  "schemaTypes": ["LocalBusiness", "RoofingContractor"],
  "hasTrustSignals": true,
  "testimonialCount": 8
}
```

Note: `html` and `textContent` fields are NOT present in the JSON report file.

### findings (sorted by impact score, highest first)

```json
{
  "id": "local-no-localbusiness-schema",
  "category": "local",
  "severity": "high",
  "title": "No LocalBusiness structured data found",
  "summary": "The site has no LocalBusiness (or equivalent) JSON-LD schema markup.",
  "whyItMatters": "LocalBusiness schema is how you formally tell Google...",
  "recommendation": "Add a LocalBusiness JSON-LD block to the homepage...",
  "affectedUrls": ["https://example.com/contact"]
}
```

### scores

```json
{
  "technical": {
    "value": 72,
    "label": "Solid",
    "rationale": [
      "[High] 2 key pages missing a title tag",
      "[+] robots.txt is present",
      "[+] XML sitemap found"
    ]
  },
  "localSeo": {
    "value": 45,
    "label": "Leaking Opportunity",
    "rationale": [ ... ]
  },
  "conversion": { "value": 60, "label": "Needs Work", "rationale": [ ... ] },
  "content":    { "value": 80, "label": "Solid", "rationale": [ ... ] },
  "trust":      { "value": 55, "label": "Needs Work", "rationale": [ ... ] },
  "overall": {
    "value": 62,
    "label": "Needs Work",
    "rationale": [
      "Technical (25%): 72 → Solid",
      "Local SEO (30%): 45 → Leaking Opportunity",
      "Conversion (25%): 60 → Needs Work",
      "Content (10%): 80 → Solid",
      "Trust (10%): 55 → Needs Work"
    ]
  }
}
```

Note the key mismatch: the score key is `localSeo` but finding categories use `local`.

### quickWins

```json
[
  "Add a LocalBusiness JSON-LD block to the homepage...",
  "Place the phone number in the site header...",
  "Add at least two prominent CTAs to the homepage...",
  "Add a contact/inquiry form to the contact page...",
  "Write a 50–160 character meta description for each page..."
]
```

Up to 5 strings. Each is the `recommendation` field from a high or medium finding, sorted by impact score.

### moneyLeaks

```json
[
  "The site has no LocalBusiness JSON-LD schema markup.",
  "The homepage for example.com has no detectable phone number.",
  "No CTA buttons or action links were detected on the homepage.",
  "2 service/location/contact page(s) have a noindex directive.",
  "example.com appears to be serving pages over HTTP instead of HTTPS."
]
```

Up to 5 strings. Each is the `summary` field from a high-severity finding, sorted by impact score.

### lighthouse (optional — absent if Lighthouse was skipped)

```json
[
  {
    "url": "https://example.com/",
    "performanceScore": 62,
    "seoScore": 85,
    "accessibilityScore": 78,
    "firstContentfulPaint": 1840,
    "largestContentfulPaint": 3200,
    "totalBlockingTime": 280,
    "cumulativeLayoutShift": 0.05,
    "speedIndex": 2900
  }
]
```

Always an array of 1 if present (only the homepage is audited).

### artifacts

```json
{
  "jsonPath": "/path/to/userData/reports/example.com_1710000000000/report.json",
  "htmlPath": "/path/to/userData/reports/example.com_1710000000000/report.html"
}
```

---

## index.json

`<userData>/reports/index.json`

A JSON array of `SavedScanMeta` objects, stored in insertion order (oldest first). `listSavedScans()` reverses this to return newest first.

```json
[
  {
    "id": "example.com_1710000000000",
    "domain": "example.com",
    "scannedAt": "2026-03-10T12:00:00.000Z",
    "overallScore": 62,
    "businessType": "contractor",
    "scanMode": "full",
    "jsonPath": "/absolute/path/to/report.json",
    "htmlPath": "/absolute/path/to/report.html"
  },
  {
    "id": "shop.example.com_1710001000000",
    ...
  }
]
```

---

## HTML Report Sections

`<userData>/reports/<scanId>/report.html`

A single self-contained HTML file (all CSS inlined, no external dependencies). Opens in any browser. Print-friendly via `@media print` styles.

Sections in order:

| Section | Content |
|---|---|
| Header | Domain, scan date, scan mode, page count, business type |
| Overall Score | Large score number, band label, finding count |
| Category Score Cards | 5 cards: Local SEO, Technical SEO, Conversion, Content, Trust |
| What's Holding This Business Back | Two columns: visibility issues / lead capture issues |
| Revenue-Impacting Issues | Red section with moneyLeaks list (shown if non-empty) |
| Quick Wins | Green section with quickWins list (shown if non-empty) |
| Page Speed & Core Web Vitals | Lighthouse scores + CWV metrics table (shown if Lighthouse ran) |
| All Issues Found | Findings grouped by category, each with severity badge + detail |
| Score Breakdown Detail | Per-category score with rationale bullets |
| Footer | Generator, date, scan ID |
