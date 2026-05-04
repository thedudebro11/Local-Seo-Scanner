/**
 * Google Business Profile checker.
 *
 * Always checks on-site GBP signals (map embed, review links).
 * If a Google Places API key is configured in Settings, also queries the
 * Places Text Search + Details API to verify the GBP exists, check review
 * count, and compare the GBP phone number against the site's phone.
 *
 * Optional — logged and skipped on failure.
 */

import { readSettings } from '../../settings/settingsStorage'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'
import type { Finding, GbpCheckResult } from '../../types/audit'

const log = createLogger('gbpStage')

export async function gbpStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Checking Google Business Profile…', 94)

  if (ctx.pages.length === 0) return

  // ── On-site signals (always checked, no API key required) ─────────────────
  const hasMapEmbed = ctx.pages.some((p) => p.hasMap)

  const hasReviewLink = ctx.pages.some((p) => {
    const html = p.html ?? ''
    return (
      html.includes('search.google.com/local/writereview') ||
      /google\.com\/maps\/place/i.test(html)
    )
  })

  const findings: Finding[] = []

  if (!hasMapEmbed) {
    findings.push({
      id: 'gbp-no-map-embed',
      category: 'localSeo',
      severity: 'medium',
      title: 'No Google Maps embed found',
      summary: 'No embedded Google Map was detected on any page of the site.',
      whyItMatters:
        'An embedded map reinforces the physical location to Google and helps visitors find the business — both improve local pack rankings.',
      recommendation:
        'Add a Google Maps embed to the contact page or homepage using the "Embed a map" option inside Google Maps.',
    })
  }

  if (!hasReviewLink) {
    findings.push({
      id: 'gbp-no-review-link',
      category: 'trust',
      severity: 'medium',
      title: 'No Google review link on site',
      summary: 'No link to the business\'s Google review page was found.',
      whyItMatters:
        'A direct review link reduces friction for happy customers. More Google reviews improve local pack rankings and build social proof.',
      recommendation:
        'Add a "Leave us a Google review" button to the site. Get the direct review URL from the Google Business Profile dashboard → "Get more reviews".',
    })
  }

  // ── Base result (before optional API enrichment) ──────────────────────────
  const gbpResult: GbpCheckResult = {
    found: false,
    apiQueried: false,
    onSiteMapEmbed: hasMapEmbed,
    onSiteReviewLink: hasReviewLink,
    napConsistency: { phoneMatch: null },
  }

  // ── Google Places API (optional — only when key is configured) ────────────
  const settings = await readSettings()
  const apiKey = settings.googlePlacesApiKey?.trim()

  if (apiKey) {
    gbpResult.apiQueried = true
    try {
      await runPlacesCheck(ctx, apiKey, gbpResult, findings)
    } catch (err) {
      log.warn(`Places API error: ${(err as Error).message}`)
    }
  }

  ctx.gbpResult = gbpResult
  ctx.allFindings = [...ctx.allFindings, ...findings]

  log.info(
    `GBP check complete: found=${gbpResult.found}, onSiteMap=${hasMapEmbed}, ` +
    `onSiteReview=${hasReviewLink}, apiFindings=${findings.length}`,
  )
}

// ─── Places API enrichment ────────────────────────────────────────────────────

async function runPlacesCheck(
  ctx: ScanJobContext,
  apiKey: string,
  result: GbpCheckResult,
  findings: Finding[],
): Promise<void> {
  // Build a search query from JSON-LD business name + domain as fallback
  const businessName = extractBusinessName(ctx)
  // Search by business name alone — appending the domain confuses the Places API
  // when the name was extracted from the domain itself
  const query = encodeURIComponent(businessName)

  const textSearchRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`,
  )
  const textSearch = await textSearchRes.json() as { results?: PlaceResult[]; status?: string }

  if (textSearch.status !== 'OK' || !textSearch.results || textSearch.results.length === 0) {
    result.found = false
    findings.push({
      id: 'gbp-not-found',
      category: 'localSeo',
      severity: 'high',
      title: 'Google Business Profile not found',
      summary: 'This business does not appear to have a claimed Google Business Profile.',
      whyItMatters:
        'A Google Business Profile is the #1 local SEO factor. Without one, the business cannot appear in the Local Pack (the map results at the top of Google for local searches).',
      recommendation:
        'Claim or create a Google Business Profile at business.google.com. Verify the listing, add photos, and complete all profile fields.',
    })
    return
  }

  const place = textSearch.results[0]
  result.found = true
  result.placeId = place.place_id

  // Get full details
  const detailsRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${place.place_id}` +
    `&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,business_status,website` +
    `&key=${apiKey}`,
  )
  const details = (await detailsRes.json() as { result?: PlaceDetails }).result

  if (details) {
    result.businessName = details.name
    result.address = details.formatted_address
    result.phone = details.formatted_phone_number
    result.rating = details.rating
    result.reviewCount = details.user_ratings_total
    result.businessStatus = details.business_status
    result.websiteUrl = details.website
  }

  // ── NAP: phone number consistency ─────────────────────────────────────────
  const sitePhones = ctx.pages.flatMap((p) => p.phones)
  if (details?.formatted_phone_number && sitePhones.length > 0) {
    const gbpDigits = details.formatted_phone_number.replace(/\D/g, '')
    const phoneMatch = sitePhones.some((sp) => {
      const siteDigits = sp.replace(/\D/g, '')
      return (
        siteDigits.length >= 7 &&
        gbpDigits.length >= 7 &&
        (gbpDigits.endsWith(siteDigits.slice(-10)) || siteDigits.endsWith(gbpDigits.slice(-10)))
      )
    })
    result.napConsistency.phoneMatch = phoneMatch

    if (!phoneMatch) {
      findings.push({
        id: 'gbp-phone-mismatch',
        category: 'localSeo',
        severity: 'high',
        title: 'Phone number mismatch: website vs Google Business Profile',
        summary: `Website shows "${sitePhones[0]}" but GBP lists "${details.formatted_phone_number}".`,
        whyItMatters:
          'NAP (Name, Address, Phone) consistency is a critical local ranking signal. Inconsistent phone numbers tell Google the information is unreliable, which hurts local pack rankings.',
        recommendation:
          'Update either the website or the Google Business Profile so both show the exact same phone number.',
      })
    }
  }

  // ── Review count ──────────────────────────────────────────────────────────
  if (details?.user_ratings_total !== undefined && details.user_ratings_total < 10) {
    findings.push({
      id: 'gbp-low-reviews',
      category: 'trust',
      severity: 'high',
      title: `Low Google review count (${details.user_ratings_total} review${details.user_ratings_total !== 1 ? 's' : ''})`,
      summary: `This business has only ${details.user_ratings_total} Google review${details.user_ratings_total !== 1 ? 's' : ''}.`,
      whyItMatters:
        'Review count is a top local pack ranking factor. Businesses with fewer than 10 reviews rank significantly below competitors with 50+ reviews and get fewer clicks.',
      recommendation:
        'Implement a review request process: after each job, send a follow-up text or email with a direct Google review link. A "Leave us a Google review" button on the site also helps.',
    })
  }

  // ── Business status ───────────────────────────────────────────────────────
  if (details?.business_status && details.business_status !== 'OPERATIONAL') {
    const readableStatus = details.business_status.replace(/_/g, ' ').toLowerCase()
    findings.push({
      id: 'gbp-not-operational',
      category: 'localSeo',
      severity: 'high',
      title: `Google Business Profile marked as: ${readableStatus}`,
      summary: `GBP status is "${readableStatus}" — it is not showing as open/operational.`,
      whyItMatters:
        'A non-operational GBP status significantly reduces or eliminates local pack visibility and may show a "permanently closed" label to searchers.',
      recommendation:
        'Log into Google Business Profile and update the business status to open. If closed temporarily, set a reopening date.',
    })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractBusinessName(ctx: ScanJobContext): string {
  // 1. JSON-LD LocalBusiness name — most authoritative when present
  for (const page of ctx.pages) {
    const html = page.html ?? ''
    const localBizMatch = html.match(
      /"@type"\s*:\s*"(?:LocalBusiness|[A-Za-z]+Service|[A-Za-z]+Store|Restaurant|Dentist|Contractor)[^"]*"[\s\S]{0,500}?"name"\s*:\s*"([^"]{3,80})"/,
    )
    if (localBizMatch) return localBizMatch[1]
  }

  // 2. og:site_name meta tag
  for (const page of ctx.pages) {
    const html = page.html ?? ''
    const ogMatch =
      html.match(/property="og:site_name"\s+content="([^"]{2,80})"/) ??
      html.match(/content="([^"]{2,80})"\s+property="og:site_name"/)
    if (ogMatch) return ogMatch[1]
  }

  // 3. Page titles — brand names usually appear as the LAST segment (after |, -, etc.)
  //    on inner pages. The homepage title is often keyword-stuffed ("Best HVAC | Tucson").
  //    Strategy: collect all last-segments, find the one that repeats most across pages.
  const segmentCounts = new Map<string, number>()
  for (const page of ctx.pages) {
    if (!page.title) continue
    const parts = page.title.split(/\s*[|\-–—·•]\s*/)
    const last = parts[parts.length - 1].trim()
    if (last.length >= 3 && last.length <= 60) {
      segmentCounts.set(last, (segmentCounts.get(last) ?? 0) + 1)
    }
  }
  if (segmentCounts.size > 0) {
    // Pick the segment that appears most often (ties go to the first found)
    const best = [...segmentCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    if (best) return best
  }

  // 4. Humanise the domain as last resort
  return ctx.domain
    .replace(/\.(com|net|org|biz|info|co)(\.[a-z]{2})?$/, '')
    .replace(/-/g, ' ')
}

// ─── Places API response shapes ───────────────────────────────────────────────

interface PlaceResult {
  place_id: string
  name: string
}

interface PlaceDetails {
  name?: string
  formatted_address?: string
  formatted_phone_number?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  website?: string
}
