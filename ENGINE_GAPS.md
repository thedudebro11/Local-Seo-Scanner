# ENGINE_GAPS.md
## Local SEO Engine — Gap Analysis
**Scan:** www.alaskanac.com | **Date:** 2026-05-05
**Purpose:** Documents every detection gap, false positive, and missed signal found when
cross-referencing report.json against blueprint.md and the actual crawl data.
Each gap includes: what the engine said, what's actually true, why it matters, and
a concrete engine improvement suggestion.

--- ENGINE_GAPS.md — 10 specific failure patterns found in this scan, each with:
  - Exact quote of what the engine reported vs. what's actually true
  - Why it matters for the developer who reads the output                     
  - Concrete detection logic (pseudocode in several cases) you can hand to an
  engineer to fix                                                             
                                                                              
  REVIEW_PROMPT.md — A production-ready Claude prompt you can use on any
  engine output. It runs 12 specific cross-checks and outputs five structured 
  sections: blueprint corrections, missing items, client input questions
  (formatted ready-to-send to the client), data reconciliation decisions, and 
  priority additions.                                       

  The most impactful fixes for your engine based on this scan, ranked:        
  
  1. P0 — Schema scope (Check 1): "No LocalBusiness schema found" site-wide   
  vs. "homepage is missing it" — completely different fix, easy logic change
  2. P0 — Redirect detection (Check 3): url !== finalUrl in your page objects 
  already tells you a redirect exists — just surface it                       
  3. P0 — Review count reconciliation (Check 2): GBP API count vs. displayed
  count — add one explanatory note, saves the developer from a Search Console 
  warning                                                   
  4. P1 — Include ALL crawled URLs in blueprint, not just                     
  home/service/location types — orphaned pages become 404s without this   

## HOW TO USE THIS FILE

This file serves two purposes:
1. **For developers of the Local SEO Engine** — each gap is a product backlog item with
   a clear description of the missed detection and how to fix it.
2. **For Claude sessions running the REVIEW_PROMPT** — a reference of known engine blind
   spots to check for in any scan output.

---

## GAP 1 — Schema Detection: Homepage vs. Sub-pages

**What the engine reported:**
> "No LocalBusiness structured data found" (severity: high)

**What is actually true:**
`/tucson-az/` and `/phoenix-az/` both have `HVACBusiness` schema with `PostalAddress`
and `ContactPoint` present. The homepage (`/`) has `Organization` + `WebSite` but no
`HVACBusiness` or `LocalBusiness`. The engine flagged the finding site-wide when the
actual gap is homepage-specific.

**Why it matters for the developer:**
A developer reading "no LocalBusiness schema found" will add it to every page from scratch.
A developer reading "homepage is missing HVACBusiness schema; location pages already have it"
will copy the correct existing schema from `/tucson-az/` and adapt it for the homepage.
Saves work and avoids accidentally overwriting working schema.

**Why it matters for the client pitch:**
The client may know they have schema on their location pages and push back on the finding.
Overstated findings reduce credibility.

**Engine improvement:**
When `schemaTypes` contains `HVACBusiness` or `LocalBusiness` on ANY crawled page, the
finding should be scoped: "Homepage is missing LocalBusiness schema — location pages have it."
Detection logic:
```
const homepageHasSchema = pages.find(p => p.pageType === 'home')
  ?.schemaTypes.some(t => ['HVACBusiness','LocalBusiness','MedicalBusiness'].includes(t));

const anyPageHasSchema = pages.some(p =>
  p.schemaTypes.some(t => ['HVACBusiness','LocalBusiness','MedicalBusiness'].includes(t)));

if (!homepageHasSchema && anyPageHasSchema) {
  // Finding: "Homepage missing LocalBusiness schema — present on other pages"
  // Severity: medium (not high — schema exists, just misplaced)
} else if (!anyPageHasSchema) {
  // Finding: "No LocalBusiness schema found anywhere on site"
  // Severity: high
}
```

---

## GAP 2 — Client-Side Rendered Content (JavaScript Blindness)

**What the engine reported:**
> `hasTrustSignalsVisible: false` — "No trust signal keywords near top of page"

**What is actually true:**
The homepage renders trust badges above the fold client-side: Trane, Google Guaranteed,
NATE, ACCA, NARI, Energy Star, "Keeping you chill since 1972" are all visible in the
screenshot. The engine's DOM scraper missed these because they are injected by JavaScript
after initial HTML parse.

The blueprint correctly flagged this with a note: "The engine missed these because they
render client-side." But the engine's raw findings still show `hasTrustSignalsVisible: false`
and the blueprint's Trust score of 80/100 is pulled down by a false finding.

**Why it matters:**
False negatives on trust signal detection lead to over-stating the problem to the client.
In this case, the client's real trust gap is the *missing About and Gallery pages* —
not the trust bar, which already exists and works.

**Engine improvement:**
Two approaches:
1. **Playwright wait strategy:** After page load, wait for `networkidle` AND an additional
   1000–1500ms before scraping trust signal keywords. Many widgets and lazy-loaded sections
   render within 800ms of DOMContentLoaded.
2. **Screenshot-based detection:** The engine already takes screenshots (which DO capture
   rendered content). Pass the homepage screenshot through a vision model with a targeted
   prompt: "List all trust signals, certifications, star ratings, and review counts visible
   in this screenshot." Cross-reference against the DOM-scraped findings and use the higher
   of the two results.

---

## GAP 3 — Review Count Reconciliation

**What the engine reported:**
GBP API: `reviewCount: 3639`, `rating: 4.7`
Blueprint copy: "4,400+ Google Reviews"

**What is actually true:**
These are both correct but from different sources. The site likely aggregates NearbyNow
reviews (5,400+) with Google reviews, or the displayed count includes a widget with a
stale/different dataset. The GBP API is authoritative for schema. The site-displayed count
is what marketing copy should use (it's what users see).

**Why it matters:**
A developer will put `"reviewCount": 4400` in their JSON-LD schema because that's what
the blueprint says. This will eventually trigger a Google rich result mismatch warning in
Search Console. The correct schema value is `3639` (from GBP API). Marketing copy should
use `4,400+` (from site display).

This is a dual-value situation the engine surfaces but never explains. Without explanation
it looks like an error rather than a strategy.

**Engine improvement:**
When `gbpCheck.reviewCount` differs from site-displayed review counts by > 15%, add a
reconciliation note to the blueprint:
```
Review Count Note:
  GBP API (use in schema):     3,639
  Site displayed (use in copy): 4,400+
  Likely source of difference: NearbyNow widget aggregation or stale display count
  Rule: JSON-LD must use GBP API count. Marketing copy may use higher displayed count.
```

---

## GAP 4 — Redirect Chain Detection

**What the engine reported:**
Blueprint listed `/new-air-conditioning-system/` as an existing page to "recreate with
improved content."

**What is actually true:**
The crawl data shows:
```json
{
  "url": "https://alaskanac.com/new-air-conditioning-system/",
  "finalUrl": "https://www.alaskanac.com/ac-installation/",
  "statusCode": 200
}
```
`/new-air-conditioning-system/` already 301-redirects to `/ac-installation/`. The canonical
URL is `/ac-installation/`. The blueprint named the source URL as the page to build.

**Why it matters:**
If a developer creates `/new-air-conditioning-system/` in the new build, they override the
existing 301 and the redirect stops working. Any backlinks pointing to `/new-air-conditioning-system/`
lose their redirect target.

**Engine improvement:**
When `url !== finalUrl` in a page object, the page has a redirect. The blueprint should:
1. List the CANONICAL (finalUrl) as the page route, not the source URL
2. Include the source URL in the redirect table
3. Note: "This URL is already a 301 redirect — use the canonical URL in your build"

Detection logic:
```javascript
pages.forEach(page => {
  if (page.url !== page.finalUrl) {
    redirectsFound.push({ from: page.url, to: page.finalUrl });
    // Use page.finalUrl as the canonical in page inventory
    // Add page.url → page.finalUrl to redirect table
  }
});
```

---

## GAP 5 — Undocumented Pages Found in Crawl

**What the engine reported:**
Blueprint page inventory listed: `/ac-maintenance/`, `/new-air-conditioning-system/`,
`/alaskafy-your-system/`, `/heating-and-furnaces/`, `/indoor-air-quality/`

**What is actually true:**
The 10-page crawl found two additional pages not in the blueprint inventory:
- `/air-conditioning-service/` — 386 words, `pageType: "other"`, no schema
- `/heating-service/` — 400 words, `pageType: "other"`, no schema

These are orphaned or legacy pages with real URLs, real content, and potentially real
backlinks. They are not in the new site plan and need explicit redirect decisions.

**Why it matters:**
Pages that exist but have no redirect plan become 404s after a rebuild. If they have any
backlink equity, that equity evaporates.

**Engine improvement:**
Every crawled page (regardless of `pageType`) must appear in the blueprint's page inventory,
even if just to say "this page exists — redirect to X or keep." The current blueprint only
surfaces pages classified as `home`, `service`, or `location`. Pages typed as `"other"`
are silently dropped from the blueprint.

Change: Include ALL crawled URLs in a "Full URL Inventory" table in the blueprint, with a
column: `Recommended Action: Keep / Redirect to [URL] / Delete`.

---

## GAP 6 — Multiple Phone Numbers Not Flagged as NAP Inconsistency

**What the engine reported:**
`napConsistency.phoneMatch: true`

**What is actually true:**
The crawl found these phones across pages:
- Homepage: `844-364-5800` (tracking)
- Tucson page: `520-265-1500`, `(520) 815-5555` — two different local numbers
- Phoenix page: `602-783-8111`, `(602) 529-5555` — two different local numbers

The NAP consistency check only verified that the GBP phone `(520) 815-5555` appears somewhere
on the site — it passed. But the site is displaying a second local number `(520) 265-1500`
alongside it, which is an inconsistency risk (Google crawls the full page, not just the
schema NAP).

**Why it matters:**
Local SEO audit principle: multiple phone numbers on the same page — especially when one
does not match the GBP listing — is a NAP signal dilution risk. The engine should flag
"multiple phone numbers found; verify which matches GBP."

**Engine improvement:**
For each crawled page, count unique phone numbers. If count > 1:
- Flag which phones are present
- Cross-reference each against `gbpCheck.phone`
- Finding: "Page displays [N] phone numbers — only [(520) 815-5555] matches GBP listing.
  Remove or disambiguate non-GBP numbers."

---

## GAP 7 — Hours Inconsistency Across Location Pages

**What the engine reported:**
`/tucson-az/` → `hasHours: false`
`/phoenix-az/` → `hasHours: true`

The engine flagged hours as a finding but didn't surface the inconsistency between locations.

**What is actually true:**
The business has two location pages. One shows hours, one doesn't. This is a directly
comparable inconsistency: Phoenix is doing something Tucson isn't. The blueprint mentions
hours as "INSERT FROM GBP" for both without noting that Phoenix already has them.

**Why it matters:**
The developer needs to know to extract hours from the Phoenix page, use them as a template,
and add matching hours to the Tucson page. The blueprint as written implies both are missing.

**Engine improvement:**
When the site has multiple location pages (`pageType === 'location'`), compare `hasHours`
across them. If inconsistent, add a finding: "Business hours present on Phoenix location
page but missing from Tucson location page — extract and normalize."

More broadly: for multi-location sites, run a parity check across all location pages for:
`hasHours`, `hasAddress`, `hasMap`, `hasForm`, schema types. Report any asymmetry.

---

## GAP 8 — Service Pages Missing Service Schema

**What the engine reported:**
Schema report for service pages shows only `BreadcrumbList`, `ListItem`, `WebPage`,
`WPHeader`, `SiteNavigationElement`, `WPFooter`.

**What the engine did NOT report:**
No finding that service pages are missing `Service` schema (schema.org/Service with
`provider` linking to the `HVACBusiness` entity). This is a material local SEO gap
— service schema earns rich results and reinforces the connection between specific
services and the business entity.

**Engine improvement:**
Add a schema completeness check per page type:

| Page type | Expected schema types | Missing = finding? |
|---|---|---|
| home | LocalBusiness/HVACBusiness, WebSite | Yes — High |
| service | Service (with provider), BreadcrumbList | Yes — Medium |
| location | HVACBusiness (location-specific), BreadcrumbList | Yes — High |
| faq | FAQPage | Yes — Medium |
| contact | LocalBusiness with openingHours | Yes — Medium |

For each service page, check if `schemaTypes` includes `Service`. If not, add a finding.

---

## GAP 9 — H1 vs. Visual Headline Mismatch

**What the engine reported:**
> `hasHeroClarity: false` — "H1 exists but is below the fold: Air Conditioning Services in Arizona"

**What is actually true:**
The visual hero prominently shows "Alaskafy and Save!" as the main headline — but this is
NOT the H1. It is a styled div or H2 used as the visual anchor. The actual H1
("Air Conditioning Services in Arizona") is a separate element further down the page.

The engine correctly identified the H1 as below-the-fold, but the finding doesn't explain
the full problem: the site has TWO headlines — a visual one above the fold and an SEO H1
below. This is a common WordPress pattern and a more specific problem than "H1 is below fold."

**Why it matters for the developer:**
A developer might "fix" this by adding `position: absolute; top: 200px` to move the H1
up the page visually. The correct fix is to merge: make the visual hero headline the H1
tag itself. Without this clarification, the wrong fix is likely.

**Engine improvement:**
When `hasHeroClarity` fails AND the screenshot shows a large text element above the fold
that does NOT match the first `h1s[]` value, add a specific sub-finding:
"The visual headline above the fold does not match the page's H1 tag. They are separate
elements. Fix: Make the hero headline the H1 — not two separate elements."

This requires screenshot analysis (vision model comparison of visual text vs. scraped H1).

---

## GAP 10 — Booking Widget Not Identified as Third-Party Dependency

**What the engine reported:**
CTAs detected: `"Schedule Now(Tucson)"`, `"Schedule Now(Phoenix)"`, `"Book now"`

**What the engine did NOT report:**
No identification that these CTAs trigger a third-party booking widget (not an internal form).
No mention that the site lacks a native contact form specifically because the booking widget
is the intended lead capture mechanism.

**Why it matters:**
The finding "No contact form found on the site" implies the site has no async lead capture.
But "Schedule Now" buttons triggering a third-party booking widget IS async lead capture —
just not a traditional HTML form. The missing thing is a fallback form for users who prefer
email to scheduling. That's a different gap than "no form at all."

Also: the booking widget in this case is causing a scroll-to-top bug on desktop. This is
UX-breaking behavior that no amount of SEO will fix if users click Schedule Now and get
jarred to the top of the page.

**Engine improvement:**
1. Detect booking widget CTAs: When `ctaTexts` contains "Book now", "Schedule Now",
   "Book Online", "Request Appointment", etc., add a note:
   "Site uses a booking CTA — determine if this is a native form or third-party widget.
   If third-party: verify it works correctly and add a backup contact form."
2. In the Playwright test suite, click each CTA button and observe:
   - Does the page scroll? (scroll event detected)
   - Does an iframe appear?
   - Does a modal open?
   Log this behavior in the findings.

---

## SUMMARY TABLE

| Gap | Impact | Engine Fix Complexity | Priority |
|---|---|---|---|
| 1. Schema scoped to homepage, not site-wide | High | Low — logic fix | P0 |
| 2. JS-rendered content (trust signals) | High | Medium — Playwright timing | P0 |
| 3. Review count reconciliation | High | Low — add note to blueprint | P0 |
| 4. Redirect chain detection | High | Low — compare url vs finalUrl | P0 |
| 5. Undocumented crawled pages | Medium | Low — include all pageTypes | P1 |
| 6. Multiple phone NAP inconsistency | Medium | Low — count phones per page | P1 |
| 7. Hours inconsistency across locations | Medium | Low — parity check | P1 |
| 8. Service pages missing Service schema | Medium | Medium — schema completeness check | P1 |
| 9. H1 vs. visual headline mismatch | Medium | High — requires vision model | P2 |
| 10. Booking widget not identified | Medium | Medium — CTA pattern + Playwright click | P2 |
