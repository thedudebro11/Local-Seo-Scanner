# REVIEW_PROMPT.md
## Local SEO Engine — Claude Enrichment Prompt
**Version:** 1.0 | **Date:** 2026-05-05
**Purpose:** Paste this prompt into Claude along with the engine output files
(report.json + blueprint.md + screenshots) to get a deep cross-reference analysis
that catches everything the automated scanner misses.

---

## HOW TO USE

1. Open Claude (claude.ai or Claude Code)
2. Attach or paste the contents of:
   - `report.json` (the raw scan data)
   - `blueprint.md` (the AI-generated brief)
   - `homepage.png` screenshot (visually analyzed)
   - `service.png` screenshot if present
3. Paste the prompt below
4. The output will be a structured gap analysis + enriched brief

---

## THE PROMPT
### (Copy everything between the triple-dashes)

---

You are a senior local SEO specialist and web architect reviewing the output of an
automated website audit tool. Your job is to perform a deep cross-reference analysis
of the scan data and identify every place where:

- The automated findings are inaccurate, overstated, or understated
- Critical information is missing that a developer would need
- Data conflicts between sources need a resolution decision
- Client input is required before a build can start

You will be given:
1. `report.json` — raw crawl data, Lighthouse scores, GBP API data, visual checks
2. `blueprint.md` — the AI-generated brief derived from the scan
3. Screenshots of the live site (analyze these visually)

---

## STEP 1 — READ EVERYTHING FIRST

Before producing any output, read all three inputs completely. Look at the screenshots
carefully — they often contradict the text-based findings. Specifically check screenshots for:
- Is the visual hero headline the same as the H1 tag in the crawl data?
- Are trust signals (star ratings, certification logos, review counts) visible above the fold?
- What color are the CTA buttons? Do they match a consistent palette?
- Is the phone number visible in the header?
- Is the business name/logo readable and professional?

---

## STEP 2 — RUN THESE 12 CROSS-CHECKS

Work through each check systematically. For each one, write a brief finding even if
the result is "no issue found."

### CHECK 1: Schema Scope
- Does the homepage specifically have LocalBusiness, HVACBusiness, or equivalent schema?
  (Do not accept "schema exists on other pages" as passing this check — the homepage must
  have it independently)
- Do location pages have location-specific HVACBusiness schema with a PostalAddress?
- Do service pages have Service schema linking back to the business entity?
- Does any page with FAQs have FAQPage schema?
- Compare `schemaTypes` in report.json for EACH page type against this expected baseline:
  - home → [LocalBusiness/HVACBusiness, WebSite]
  - service → [Service, BreadcrumbList]
  - location → [HVACBusiness with PostalAddress, BreadcrumbList]
  - faq → [FAQPage]
  - contact → [LocalBusiness with openingHours]

### CHECK 2: Review Count Reconciliation
- What does `gbpCheck.reviewCount` show?
- What does the blueprint say for the review count to display?
- If they differ by more than 10%, explain why and provide two explicit values:
  - "Use [X] in JSON-LD schema (GBP API — authoritative)"
  - "Use [Y] in marketing copy (site-displayed — what users currently see)"

### CHECK 3: Redirect Chain Audit
- For every page in `report.json` where `url !== finalUrl`, document the redirect:
  ```
  [source URL] → [final URL]  (301 redirect — already in place)
  ```
- List these in the blueprint's redirect table as EXISTING redirects, not as pages to create
- Flag if any blueprint page inventory item uses a source URL instead of the canonical URL

### CHECK 4: Full URL Inventory
- List EVERY URL found in the crawl, regardless of pageType
- For each URL not in the blueprint's page plan, recommend:
  - Keep as-is
  - Redirect to [specific URL]
  - Merge content into [page] then redirect

### CHECK 5: NAP Consistency
- List every unique phone number found across ALL crawled pages
- Identify which phone appears in `gbpCheck.phone` (canonical GBP number)
- Flag any page that shows a phone number that does NOT match the GBP phone
- Separate the "display number" (tracking/vanity) from the "schema NAP number" (GBP-matched)
  and state the rule clearly for the developer

### CHECK 6: Multi-Location Parity Check
If the site has multiple location pages (pageType: "location"):
- Run a side-by-side comparison of each location page on: hasHours, hasAddress, hasMap,
  hasForm, schemaTypes, phones, testimonialCount
- Flag every field where the values differ between locations
- Note what each location has that the other doesn't

### CHECK 7: H1 vs. Visual Headline
- What does the first entry in `h1s[]` say for the homepage?
- Looking at the homepage screenshot: what is the large text visible in the hero area?
- Do these match? If not, describe the mismatch and explain the correct fix:
  "The visual headline is a [div/H2/styled element]. The H1 is a separate element
  below the fold. Fix: the hero visual headline must BE the H1 tag."

### CHECK 8: Trust Signal Accuracy
- The engine flags `hasTrustSignalsVisible: false` based on DOM scraping
- Look at the homepage screenshot — are trust signals (ratings, badges, certifications,
  years in business) actually visible above the fold?
- If the screenshot shows trust signals that the engine missed, correct the finding:
  "Trust signals ARE visible above the fold (screenshot confirmed). Engine missed these
  because they are JavaScript-rendered. The real gap is: [specific missing element]."

### CHECK 9: Booking Widget vs. Contact Form
- Do the CTAs ("Book Now", "Schedule Now", "Request Appointment", etc.) lead to an external
  booking widget or a native HTML form?
- If a booking widget is the primary CTA: the "no contact form" finding should be reframed as
  "site relies on third-party booking widget; no backup contact form for email-preference leads"
- Flag this as a conversion gap, not a missing-form gap

### CHECK 10: Missing Client Data Inventory
Compile every piece of information referenced in the blueprint with "[INSERT...]" or that
is logically required but not present in report.json. Format as:

```
⚠️ CLIENT INPUT NEEDED: [exact item] — [why it's needed] — [where it will be used]
```

Common items to check for:
- Business hours (both locations if multi-location)
- Physical address for secondary locations
- GBP phone number for secondary locations
- Team photo / owner photo
- High-resolution logo (SVG preferred)
- High-resolution hero image (van, team, storefront)
- Real testimonial quotes with customer names

### CHECK 11: Lighthouse — LCP Element Identification
- What is the LCP value from `lighthouse[].largestContentfulPaint`?
- Based on the screenshot, what is most likely the LCP element?
  (Usually the hero image, hero background, or H1 text)
- Provide a specific fix: "The LCP element is likely the [hero image / background].
  Fix: [specific action — preload the image, convert to WebP, set fetchpriority=high]"

### CHECK 12: Performance Budget Reality Check
- Current Lighthouse performance score: [from data]
- Current LCP: [from data]
- The blueprint warns: "new build must match or beat 91/100 Lighthouse score"
- Based on the recommended stack (WordPress / Next.js / Astro etc.), flag any realistic
  threats to the performance target:
  "If rebuilding in [stack], the main performance risks are: [specific risks]. 
   Mitigations: [specific actions]."

---

## STEP 3 — PRODUCE THE OUTPUT

Produce a document with these sections in order:

### Section 1: Blueprint Corrections
A numbered list of statements in blueprint.md that are inaccurate or need amending,
with the correction. Format:
```
FINDING [N]: "[Quoted text from blueprint]"
CORRECTION: [What's actually true]
IMPACT: [Why this matters for the developer or the build]
```

### Section 2: Missing From Blueprint
Everything a developer needs that is not in blueprint.md at all. Format:
```
MISSING ITEM [N]: [What's missing]
NEEDED FOR: [Which part of the build requires it]
SOURCE: [Where this information exists or how to get it]
```

### Section 3: Client Input Required
All items that require the client (the business owner) to provide data.
Format each as a ready-to-send question the agency can copy-paste to the client:
```
Q[N]: "[Exact question to ask the client]"
     Needed for: [specific use in the build]
     Blocking: [what cannot be built until this is answered]
```

### Section 4: Data Reconciliation Decisions
For each conflict between two data sources (e.g., GBP API count vs. site-displayed count),
state the decision explicitly:
```
CONFLICT [N]: [Description of the conflict]
DATA SOURCE A: [Value + where it comes from]
DATA SOURCE B: [Value + where it comes from]
RESOLUTION: Use [A/B] for [schema / copy / display] because [reason]
```

### Section 5: Priority Additions to the Build
Items not in blueprint.md that should be added to the build spec based on this analysis,
ranked by impact:
```
ADDITION [N] — [High/Medium/Low] priority
[What to add and why]
```

---

## QUALITY BAR

- Every section must have at least one entry. If a check is truly clean, write:
  "Check [N]: No issues found — [what was verified]."
- Do not summarize the blueprint back to me — only produce deltas (what's wrong or missing)
- Flag every piece of information that a developer would need to make a decision but
  currently has to guess about
- When you are uncertain about something, say so explicitly rather than stating it as fact

---

## (End of prompt)

---

## NOTES ON USING THIS PROMPT

**For multi-location businesses:**
The prompt is written to handle multi-location by default (CHECK 6). For single-location
businesses, CHECK 6 will return "no issues — single location" and can be skipped.

**For non-HVAC business types:**
The schema baseline in CHECK 1 uses HVACBusiness as an example. Replace with the correct
schema type for the business:
- Dentist → `Dentist` (sub-type of `MedicalBusiness`)
- Restaurant → `Restaurant`
- Law firm → `LegalService` or `Attorney`
- Plumber/electrician → `HomeAndConstructionBusiness`
- Roofing → `RoofingContractor`

**For sites without Lighthouse data:**
If `lighthouse[]` is empty, skip CHECK 11 and CHECK 12, noting:
"Lighthouse data not available — run pagespeed.web.dev on the homepage before build."

**Running this in Claude Code vs. claude.ai:**
- Claude Code: put report.json and blueprint.md in the same directory and reference them
  in the prompt. Claude Code can read files directly.
- claude.ai: paste the JSON and markdown content directly into the chat window.
  For screenshots, attach as image files.

**Token budget awareness:**
If `report.json` is large (> 50KB), summarize the `pages[]` array before pasting:
keep all fields but truncate `h2s[]` to first 3 entries per page.
The `findings[]`, `scores{}`, `gbpCheck{}`, `lighthouse[]`, and `design{}` objects
are critical — always include them in full.
