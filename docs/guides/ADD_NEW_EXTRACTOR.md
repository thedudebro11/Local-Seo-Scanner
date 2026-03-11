# How to Add a New Extractor

Extractors parse HTML using cheerio and return typed signal objects. This guide adds a hypothetical `extractSocialLinks` extractor that detects social media profile links.

## Step 1: Create the Extractor File

Create `src/engine/extractors/extractSocialLinks.ts`:

```typescript
/**
 * Extracts social media profile links from a page.
 */

import type { CheerioAPI } from 'cheerio'

export interface SocialSignals {
  hasFacebook: boolean
  hasInstagram: boolean
  hasGoogleMapsProfile: boolean
  socialUrls: string[]
}

const SOCIAL_PATTERNS: Array<[RegExp, string]> = [
  [/facebook\.com\//, 'facebook'],
  [/instagram\.com\//, 'instagram'],
  [/business\.google\.com\/|maps\.google\.com\/.*place/, 'googlemaps'],
  [/yelp\.com\/biz\//, 'yelp'],
  [/twitter\.com\/|x\.com\//, 'twitter'],
]

export function extractSocialLinks($: CheerioAPI): SocialSignals {
  const socialUrls: string[] = []
  const found = new Set<string>()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    for (const [pattern, key] of SOCIAL_PATTERNS) {
      if (pattern.test(href)) {
        found.add(key)
        if (!socialUrls.includes(href)) {
          socialUrls.push(href)
        }
        break
      }
    }
  })

  return {
    hasFacebook: found.has('facebook'),
    hasInstagram: found.has('instagram'),
    hasGoogleMapsProfile: found.has('googlemaps'),
    socialUrls: socialUrls.slice(0, 10),
  }
}
```

**Rules**:
- Accept only `CheerioAPI` as parameter — the barrel module passes the pre-loaded instance
- Do NOT call `cheerio.load()` inside an individual extractor — it is loaded once in the barrel
- Do NOT import cheerio directly in the extractor — only `CheerioAPI` type is needed
- Return a typed interface, never `any`

## Step 2: Add Field to ExtractedSignals in the Barrel (extractors/index.ts)

Open `src/engine/extractors/index.ts` and make three changes:

**Add the import**:
```typescript
import { extractSocialLinks } from './extractSocialLinks'
export type { SocialSignals } from './extractSocialLinks'
```

**Add fields to `ExtractedSignals`**:
```typescript
export interface ExtractedSignals {
  // ... existing fields ...
  // Social
  hasFacebook: boolean
  hasInstagram: boolean
  hasGoogleMapsProfile: boolean
  socialUrls: string[]
}
```

**Call the extractor in `extractAllSignals`**:
```typescript
export function extractAllSignals(html: string, pageUrl: string): ExtractedSignals {
  // ...
  const social = extractSocialLinks($)

  return {
    // ...existing fields...
    // Social
    hasFacebook: social.hasFacebook,
    hasInstagram: social.hasInstagram,
    hasGoogleMapsProfile: social.hasGoogleMapsProfile,
    socialUrls: social.socialUrls,
  }
}
```

**Update `emptySignals()`**:
```typescript
function emptySignals(): ExtractedSignals {
  return {
    // ...existing empty fields...
    hasFacebook: false,
    hasInstagram: false,
    hasGoogleMapsProfile: false,
    socialUrls: [],
  }
}
```

## Step 3: Add Fields to CrawledPage in audit.ts

Open `src/engine/types/audit.ts` and add the new fields to `CrawledPage`:

```typescript
export interface CrawledPage {
  // ... existing fields ...
  // Social signals
  hasFacebook: boolean
  hasInstagram: boolean
  hasGoogleMapsProfile: boolean
  socialUrls: string[]
}
```

## Step 4: Wire into runAudit.ts

Open `src/engine/orchestrator/runAudit.ts` and add the new fields to the `CrawledPage` construction block (around line 130):

```typescript
crawledPages = fetchedPages.map((raw) => {
  const signals = extractAllSignals(raw.html, raw.finalUrl)
  // ...
  return {
    // ...existing fields...
    hasFacebook: signals.hasFacebook,
    hasInstagram: signals.hasInstagram,
    hasGoogleMapsProfile: signals.hasGoogleMapsProfile,
    socialUrls: signals.socialUrls,
  } satisfies CrawledPage
})
```

The `satisfies CrawledPage` constraint will catch any missing fields at compile time.

## Step 5: Use in an Analyzer (Optional)

With the new fields on `CrawledPage`, any analyzer can now use them:

```typescript
// In trustAnalyzer.ts
if (!pages.some(p => p.hasFacebook || p.hasInstagram)) {
  findings.push({
    id: 'trust-no-social-proof-links',
    category: 'trust',
    severity: 'low',
    title: 'No social media profile links found',
    // ...
  })
}
```

## Step 6: Verify

```bash
npm run typecheck   # The 'satisfies CrawledPage' constraint will surface any missing wiring
npm run build
npm run dev
```

## Step 7: Update Documentation

- Add the new extractor to `docs/engine/EXTRACTORS.md`
- Update `docs/reference/DATA_MODELS.md` with the new `CrawledPage` fields
- Update `docs/status/IMPLEMENTATION_STATUS.md`
