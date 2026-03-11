/**
 * Competitor gap analysis.
 *
 * Derives the client site's comparable signals from its crawled pages, then
 * compares them against the successful competitor summaries.
 *
 * A gap is flagged when a majority of successful competitors (≥ 60%, min 1)
 * have a signal or feature that the client site lacks.
 *
 * All gap findings are descriptive and evidence-based — no ranking or traffic
 * claims are made that cannot be supported by the crawl data.
 */

import type { CrawledPage } from '../types/audit'
import type { CompetitorSite, CompetitorGap } from './competitorTypes'
import { getDomain } from '../utils/domain'

const LOCAL_BUSINESS_SCHEMA = new Set([
  'LocalBusiness', 'ProfessionalService', 'HomeAndConstructionBusiness',
  'FoodEstablishment', 'HealthAndBeautyBusiness', 'MedicalOrganization',
  'AutoRepair', 'Restaurant',
])

/** Minimum fraction of successful competitors that must have an advantage for it to count as a gap. */
const GAP_THRESHOLD_FRACTION = 0.6

function threshold(successfulCount: number): number {
  return Math.max(1, Math.ceil(successfulCount * GAP_THRESHOLD_FRACTION))
}

interface ClientSignals {
  domain: string
  servicePageCount: number
  locationPageCount: number
  hasLocalBusinessSchema: boolean
  hasTrustSignals: boolean
  hasGalleryPage: boolean
  hasMap: boolean
  hasHours: boolean
  hasForm: boolean
  avgWordCount: number
  ctaCoverage: number
}

function deriveClientSignals(clientUrl: string, clientPages: CrawledPage[]): ClientSignals {
  if (clientPages.length === 0) {
    return {
      domain: getDomain(clientUrl),
      servicePageCount: 0, locationPageCount: 0,
      hasLocalBusinessSchema: false, hasTrustSignals: false,
      hasGalleryPage: false, hasMap: false, hasHours: false, hasForm: false,
      avgWordCount: 0, ctaCoverage: 0,
    }
  }

  const totalWords = clientPages.reduce((s, p) => s + (p.wordCount ?? 0), 0)
  const pagesWithCta = clientPages.filter((p) => p.ctaTexts.length > 0).length

  return {
    domain: getDomain(clientUrl),
    servicePageCount: clientPages.filter((p) => p.pageType === 'service').length,
    locationPageCount: clientPages.filter((p) => p.pageType === 'location').length,
    hasLocalBusinessSchema: clientPages.some((p) =>
      p.schemaTypes.some((t) => LOCAL_BUSINESS_SCHEMA.has(t)),
    ),
    hasTrustSignals: clientPages.some((p) => p.hasTrustSignals),
    hasGalleryPage: clientPages.some((p) => p.pageType === 'gallery'),
    hasMap: clientPages.some((p) => p.hasMap),
    hasHours: clientPages.some((p) => p.hasHours),
    hasForm: clientPages.some((p) => p.hasForm),
    avgWordCount: Math.round(totalWords / clientPages.length),
    ctaCoverage: pagesWithCta / clientPages.length,
  }
}

/**
 * Compare client site against competitors and return gap findings.
 * Only successful competitor crawls (pageCount > 0) are counted.
 */
export function analyzeGaps(
  clientUrl: string,
  clientPages: CrawledPage[],
  competitors: CompetitorSite[],
): CompetitorGap[] {
  const successful = competitors.filter((c) => c.pageCount > 0)
  if (successful.length === 0) return []

  const t = threshold(successful.length)
  const client = deriveClientSignals(clientUrl, clientPages)
  const gaps: CompetitorGap[] = []

  // ── 1. Service pages ────────────────────────────────────────────────────────
  if (client.servicePageCount === 0) {
    const with_ = successful.filter((c) => c.servicePageCount >= 1)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-service-pages',
        title: 'Competitors have dedicated service pages — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) have dedicated service ` +
          'pages that help rank for "[service] in [city]" searches.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Create individual pages for each service you offer. Each page should target a specific service keyword and mention your city/service area.',
      })
    }
  }

  // ── 2. Location / service-area pages ────────────────────────────────────────
  if (client.locationPageCount === 0) {
    const with_ = successful.filter((c) => c.locationPageCount >= 1)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-location-pages',
        title: 'Competitors target specific locations — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) have location or ` +
          'service-area pages that capture geo-targeted search traffic.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Create a page for each city or area you cover (e.g., "/roofing-dallas-tx/") targeting "[service] [city]" searches.',
      })
    }
  }

  // ── 3. LocalBusiness schema ──────────────────────────────────────────────────
  if (!client.hasLocalBusinessSchema) {
    const with_ = successful.filter((c) => c.hasLocalBusinessSchema)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-local-schema',
        title: 'Competitors implement LocalBusiness schema — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) use LocalBusiness ` +
          'JSON-LD structured data, which helps Google surface their business in local results.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Add a LocalBusiness JSON-LD block to your homepage with your name, address, phone, hours, and business type.',
      })
    }
  }

  // ── 4. Trust signals ────────────────────────────────────────────────────────
  if (!client.hasTrustSignals) {
    const with_ = successful.filter((c) => c.hasTrustSignals)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-trust-signals',
        title: 'Competitors display trust signals — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) show reviews, ratings, ` +
          'or credibility indicators that build visitor confidence.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Add a reviews section, star ratings, or trust badges (licensed, insured, years in business) to your homepage.',
      })
    }
  }

  // ── 5. Map / directions ─────────────────────────────────────────────────────
  if (!client.hasMap) {
    const with_ = successful.filter((c) => c.hasMap)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-map',
        title: 'Competitors provide maps or directions — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) include map embeds or ` +
          'directions links that reinforce local relevance and help mobile visitors.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Embed a Google Maps iframe on your contact page and add a "Get Directions" link.',
      })
    }
  }

  // ── 6. Business hours ───────────────────────────────────────────────────────
  if (!client.hasHours) {
    const with_ = successful.filter((c) => c.hasHours)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-hours',
        title: 'Competitors display business hours — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) prominently display ` +
          'their hours, which is a conversion factor for visitors deciding when to call.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Display your business hours on the homepage, contact page, and in the footer.',
      })
    }
  }

  // ── 7. Contact form ─────────────────────────────────────────────────────────
  if (!client.hasForm) {
    const with_ = successful.filter((c) => c.hasForm)
    if (with_.length >= t) {
      gaps.push({
        id: 'comp-no-contact-form',
        title: 'Competitors offer online contact forms — this site does not',
        description:
          `${with_.length} of ${successful.length} competitor(s) have contact or quote ` +
          'request forms, providing a low-friction conversion path for visitors who prefer not to call.',
        competitorDomains: with_.map((c) => c.domain),
        recommendation:
          'Add a simple "Request a Quote" or contact form to capture leads who prefer to inquire online.',
      })
    }
  }

  // ── 8. Content depth ────────────────────────────────────────────────────────
  const compsWithDeepContent = successful.filter(
    (c) => c.avgWordCount > Math.max(client.avgWordCount * 1.5, 300),
  )
  if (compsWithDeepContent.length >= t && client.avgWordCount < 300) {
    const competitorAvg = Math.round(
      compsWithDeepContent.reduce((s, c) => s + c.avgWordCount, 0) /
        compsWithDeepContent.length,
    )
    gaps.push({
      id: 'comp-thin-content',
      title: 'Competitor pages contain significantly more content',
      description:
        `${compsWithDeepContent.length} of ${successful.length} competitor(s) average ` +
        `${competitorAvg} words per page vs ${client.avgWordCount} on this site. ` +
        'Thinner pages are harder to rank for competitive keywords.',
      competitorDomains: compsWithDeepContent.map((c) => c.domain),
      recommendation:
        'Expand your page content with detailed service descriptions, FAQs, and location information. Aim for 300–600 words per key page.',
    })
  }

  return gaps
}
