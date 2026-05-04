/**
 * Google Business Profile checker.
 *
 * Uses a 3-step lookup chain — stops at the first hit:
 *
 *   Step 1 — Extract Place ID directly from the website's own HTML.
 *             Most businesses that have a GBP link to it somewhere (review
 *             button, Maps embed, write-a-review link). Those URLs contain the
 *             exact Place ID. This is 100% accurate with zero guessing.
 *
 *   Step 2 — Find Place from Text (Google's precise single-match endpoint)
 *             using the business name + city, with a geographic location bias
 *             derived from the site's JSON-LD address data. Much more accurate
 *             than a plain text search.
 *
 *   Step 3 — Text Search fallback using business name only.
 *             Validates the match by checking if the returned Place's website
 *             field matches the domain we scanned.
 *
 * After finding the Place ID (by any method), fetches Place Details for
 * rating, review count, phone (NAP check), and operational status.
 *
 * On-site signals (map embed, review link) are always checked regardless of
 * whether an API key is configured.
 *
 * Optional stage — failure is logged and scan continues.
 */

import { readSettings } from '../../settings/settingsStorage'
import { createLogger } from '../../utils/logger'
import type { ScanJobContext, PipelineProgressEmitter } from '../types'
import type { Finding, GbpCheckResult } from '../../types/audit'

const log = createLogger('gbpStage')

// Google Place IDs always begin with ChIJ and are ~27 chars
const PLACE_ID_RE = /ChIJ[A-Za-z0-9_-]{10,}/g

export async function gbpStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Checking Google Business Profile…', 94)
  if (ctx.pages.length === 0) return

  // ── On-site signals (no API key needed) ──────────────────────────────────
  const hasMapEmbed = ctx.pages.some((p) => p.hasMap)
  const hasReviewLink = ctx.pages.some((p) => {
    const html = p.html ?? ''
    return (
      html.includes('search.google.com/local/writereview') ||
      /google\.com\/maps\/place/i.test(html) ||
      /g\.page\//i.test(html) ||
      /maps\.app\.goo\.gl\//i.test(html)
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

  const gbpResult: GbpCheckResult = {
    found: false,
    apiQueried: false,
    onSiteMapEmbed: hasMapEmbed,
    onSiteReviewLink: hasReviewLink,
    napConsistency: { phoneMatch: null },
  }

  // ── Step 1: extract Place ID directly from HTML (free, no API key needed) ──
  const directPlaceId = extractPlaceIdFromHtml(ctx)
  if (directPlaceId) {
    log.info(`GBP: Place ID found directly in HTML: ${directPlaceId}`)
    gbpResult.found = true
    gbpResult.placeId = directPlaceId
  }

  // ── Steps 2 & 3: Places API lookup (only when key is configured) ──────────
  const settings = await readSettings()
  const apiKey = settings.googlePlacesApiKey?.trim()

  if (apiKey) {
    gbpResult.apiQueried = true
    try {
      await runPlacesCheck(ctx, apiKey, gbpResult, findings)
    } catch (err) {
      log.warn(`Places API error: ${(err as Error).message}`)
    }
  } else if (!gbpResult.found) {
    // No API key and no Place ID found in HTML — flag as unverified rather than "not found"
    findings.push({
      id: 'gbp-unverified',
      category: 'localSeo',
      severity: 'low',
      title: 'Google Business Profile status unverified',
      summary: 'No Google Places API key is configured, so GBP existence could not be verified via the API.',
      whyItMatters: 'A missing or unclaimed GBP is the #1 local SEO issue for local businesses.',
      recommendation: 'Add a Google Places API key in Settings to enable full GBP verification.',
    })
  }

  ctx.gbpResult = gbpResult
  ctx.allFindings = [...ctx.allFindings, ...findings]

  // Also push into categoryFindings so scoreStage deducts these from the
  // localSeo and trust category scores (scoreStage reads categoryFindings, not allFindings).
  for (const f of findings) {
    const bucket = ctx.categoryFindings[f.category as keyof typeof ctx.categoryFindings]
    if (bucket) bucket.push(f)
  }


  log.info(
    `GBP check: found=${gbpResult.found}, method=${gbpResult.placeId ? 'api' : 'none'}, ` +
    `mapEmbed=${hasMapEmbed}, reviewLink=${hasReviewLink}, findings=${findings.length}`,
  )
}

// ─── Places check orchestrator ────────────────────────────────────────────────

async function runPlacesCheck(
  ctx: ScanJobContext,
  apiKey: string,
  result: GbpCheckResult,
  findings: Finding[],
): Promise<void> {
  // Place ID may already be set from Step 1 (HTML extraction before this runs)
  let placeId = result.placeId ?? null

  // Step 2 — Find Place from Text with name + city + location bias
  if (!placeId) {
    placeId = await findPlaceFromText(ctx, apiKey)
    if (placeId) log.info(`GBP: Place ID found via Find Place: ${placeId}`)
  }

  // Step 3 — Text Search fallback, validate result matches our domain
  if (!placeId) {
    placeId = await findPlaceViaTextSearch(ctx, apiKey)
    if (placeId) log.info(`GBP: Place ID found via Text Search: ${placeId}`)
  }

  if (!placeId) {
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

  result.found = true
  result.placeId = placeId
  await enrichWithDetails(ctx, apiKey, placeId, result, findings)
}

// ─── Step 1: Direct Place ID extraction from HTML ─────────────────────────────

function extractPlaceIdFromHtml(ctx: ScanJobContext): string | null {
  for (const page of ctx.pages) {
    const html = page.html ?? ''

    // Google review / write-a-review URLs: ?placeid=ChIJ... or &place_id=ChIJ...
    const reviewMatch = html.match(/(?:placeid|place_id)=([A-Za-z0-9_-]{20,})/i)
    if (reviewMatch && reviewMatch[1].startsWith('ChIJ')) return reviewMatch[1]

    // Any URL containing a Place ID pattern
    const allIds = html.match(PLACE_ID_RE)
    if (allIds && allIds.length > 0) return allIds[0]

    // Google Maps CID links: maps.google.com/?cid=12345
    // CID is a legacy identifier — we can resolve it via the Places API
    const cidMatch = html.match(/maps\.google\.com[^"']*[?&]cid=(\d{8,})/i)
    if (cidMatch) {
      // Store CID for resolution — returned as a sentinel so callers know to resolve
      return `cid:${cidMatch[1]}`
    }
  }
  return null
}

// ─── Step 2: Find Place from Text (precise single-match endpoint) ─────────────

async function findPlaceFromText(ctx: ScanJobContext, apiKey: string): Promise<string | null> {
  const name = extractBusinessName(ctx)
  const city = extractCity(ctx)
  const query = city ? `${name} ${city}` : name

  const locationBias = buildLocationBias(ctx)
  const biasParam = locationBias ? `&locationbias=${encodeURIComponent(locationBias)}` : ''

  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery` +
    `&fields=place_id,name` +
    `${biasParam}` +
    `&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json() as { candidates?: Array<{ place_id: string; name: string }>; status?: string }

  log.info(`GBP Find Place: query="${query}", status=${data.status}, candidates=${data.candidates?.length ?? 0}`)

  return data.candidates?.[0]?.place_id ?? null
}

// ─── Step 3: Text Search with domain validation ───────────────────────────────

async function findPlaceViaTextSearch(ctx: ScanJobContext, apiKey: string): Promise<string | null> {
  const name = extractBusinessName(ctx)
  const city = extractCity(ctx)
  const query = city ? `${name} ${city}` : name

  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}` +
    `&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json() as { results?: PlaceResult[]; status?: string }

  log.info(`GBP Text Search: query="${query}", status=${data.status}, results=${data.results?.length ?? 0}`)

  if (data.status !== 'OK' || !data.results?.length) return null

  // Validate top results against our domain to avoid false positives
  for (const place of data.results.slice(0, 3)) {
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${place.place_id}&fields=website&key=${apiKey}`,
    )
    const details = (await detailsRes.json() as { result?: { website?: string } }).result
    if (details?.website && domainMatches(details.website, ctx.domain)) {
      log.info(`GBP Text Search: domain match confirmed for ${place.place_id}`)
      return place.place_id
    }
  }

  // No domain match found — use the top result anyway but log the uncertainty
  log.info(`GBP Text Search: no domain match — using top result ${data.results[0].place_id} (unverified)`)
  return data.results[0].place_id
}

// ─── Place Details enrichment ─────────────────────────────────────────────────

async function enrichWithDetails(
  ctx: ScanJobContext,
  apiKey: string,
  placeId: string,
  result: GbpCheckResult,
  findings: Finding[],
): Promise<void> {
  // Resolve CID → real place_id first
  let resolvedId = placeId
  if (placeId.startsWith('cid:')) {
    const cid = placeId.slice(4)
    const cidRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=place_id&key=${apiKey}`,
    )
    const cidData = (await cidRes.json() as { result?: { place_id?: string } }).result
    if (cidData?.place_id) {
      resolvedId = cidData.place_id
      result.placeId = resolvedId
    }
  }

  const detailsRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${resolvedId}` +
    `&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,business_status,website` +
    `&key=${apiKey}`,
  )
  const details = (await detailsRes.json() as { result?: PlaceDetails }).result
  if (!details) return

  result.businessName = details.name
  result.address = details.formatted_address
  result.phone = details.formatted_phone_number
  result.rating = details.rating
  result.reviewCount = details.user_ratings_total
  result.businessStatus = details.business_status
  result.websiteUrl = details.website

  // NAP: phone consistency
  const sitePhones = ctx.pages.flatMap((p) => p.phones)
  if (details.formatted_phone_number && sitePhones.length > 0) {
    const gbpDigits = details.formatted_phone_number.replace(/\D/g, '')
    const phoneMatch = sitePhones.some((sp) => {
      const d = sp.replace(/\D/g, '')
      return d.length >= 7 && gbpDigits.length >= 7 &&
        (gbpDigits.endsWith(d.slice(-10)) || d.endsWith(gbpDigits.slice(-10)))
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

  // Review count
  if (details.user_ratings_total !== undefined && details.user_ratings_total < 10) {
    findings.push({
      id: 'gbp-low-reviews',
      category: 'trust',
      severity: 'high',
      title: `Low Google review count (${details.user_ratings_total} review${details.user_ratings_total !== 1 ? 's' : ''})`,
      summary: `This business has only ${details.user_ratings_total} Google review${details.user_ratings_total !== 1 ? 's' : ''}.`,
      whyItMatters:
        'Review count is a top local pack ranking factor. Businesses with fewer than 10 reviews rank significantly below competitors with 50+ reviews and get fewer clicks.',
      recommendation:
        'Implement a review request process: after each job, send a follow-up text or email with a direct Google review link.',
    })
  }

  // Business status
  if (details.business_status && details.business_status !== 'OPERATIONAL') {
    const readable = details.business_status.replace(/_/g, ' ').toLowerCase()
    findings.push({
      id: 'gbp-not-operational',
      category: 'localSeo',
      severity: 'high',
      title: `Google Business Profile marked as: ${readable}`,
      summary: `GBP status is "${readable}" — it is not showing as open/operational.`,
      whyItMatters:
        'A non-operational GBP status significantly reduces or eliminates local pack visibility.',
      recommendation:
        'Log into Google Business Profile and update the business status to open.',
    })
  }
}

// ─── Signal extractors ────────────────────────────────────────────────────────

function extractBusinessName(ctx: ScanJobContext): string {
  // 1. JSON-LD LocalBusiness @type anchored name
  for (const page of ctx.pages) {
    const html = page.html ?? ''
    const m = html.match(
      /"@type"\s*:\s*"(?:LocalBusiness|[A-Za-z]+Service|[A-Za-z]+Store|Restaurant|Dentist|Contractor)[^"]*"[\s\S]{0,500}?"name"\s*:\s*"([^"]{3,80})"/,
    )
    if (m) return m[1]
  }

  // 2. og:site_name — skip if it contains separator chars (keyword-stuffed)
  for (const page of ctx.pages) {
    const html = page.html ?? ''
    const m = html.match(/property="og:site_name"\s+content="([^"]{2,80})"/) ??
              html.match(/content="([^"]{2,80})"\s+property="og:site_name"/)
    if (m && !/[|\-–—]/.test(m[1])) return m[1]
  }

  // 3. Most common last-segment across page titles
  //    (brand name repeats in the trailing position; homepage is keyword-stuffed)
  const counts = new Map<string, number>()
  for (const page of ctx.pages) {
    if (!page.title) continue
    const parts = page.title.split(/\s*[|\-–—·•]\s*/)
    const last = parts[parts.length - 1].trim()
    if (last.length >= 3 && last.length <= 60)
      counts.set(last, (counts.get(last) ?? 0) + 1)
  }
  if (counts.size > 0) {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    if (best) return best
  }

  // 4. Domain humanisation
  return ctx.domain
    .replace(/\.(com|net|org|biz|info|co)(\.[a-z]{2})?$/, '')
    .replace(/-/g, ' ')
}

function extractCity(ctx: ScanJobContext): string | null {
  for (const page of ctx.pages) {
    const html = page.html ?? ''

    // JSON-LD addressLocality
    const jld = html.match(/"addressLocality"\s*:\s*"([^"]{2,50})"/)
    if (jld) return jld[1]

    // "City, ST" pattern (US state abbreviation)
    const stateAbbr = html.match(
      /\b([A-Z][a-z]{2,20}),\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/,
    )
    if (stateAbbr) return stateAbbr[1]
  }

  // Try page titles for city-like words adjacent to state abbreviations
  for (const page of ctx.pages) {
    const title = page.title ?? ''
    const m = title.match(/\b([A-Z][a-z]{2,20})\b/)
    if (m && m[1].length >= 3) return m[1]
  }

  return null
}

function buildLocationBias(ctx: ScanJobContext): string | null {
  // Use JSON-LD geo coordinates for the tightest bias (within 5km)
  for (const page of ctx.pages) {
    const html = page.html ?? ''
    const lat = html.match(/"latitude"\s*:\s*([-\d.]+)/)
    const lng = html.match(/"longitude"\s*:\s*([-\d.]+)/)
    if (lat && lng) return `circle:5000@${lat[1]},${lng[1]}`
  }
  return null
}

function domainMatches(websiteUrl: string, domain: string): boolean {
  try {
    const host = new URL(websiteUrl).hostname.replace(/^www\./, '')
    const target = domain.replace(/^www\./, '')
    return host === target || host.endsWith(`.${target}`) || target.endsWith(`.${host}`)
  } catch {
    return false
  }
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
