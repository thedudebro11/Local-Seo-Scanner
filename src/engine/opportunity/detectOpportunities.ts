/**
 * SEO Opportunity Engine — Phase 11.
 *
 * Detects high-value SEO growth opportunities the site is missing:
 *   1. Missing service pages (no dedicated service pages at all)
 *   2. Weak service coverage (generic /services but competitors have specific pages)
 *   3. Location page opportunities (serves areas but no city-specific pages)
 *   4. Competitor coverage gaps (mapped from CompetitorAnalysisResult.gaps)
 *
 * All four sources are merged and deduplicated before returning.
 * Never throws — returns [] on any internal error.
 */

import type {
  BusinessType,
  CompetitorAnalysisResult,
  CrawledPage,
  Finding,
  OpportunityItem,
} from '../types/audit'

// ─── Value ranges ─────────────────────────────────────────────────────────────

const VALUE: Record<OpportunityItem['opportunityLevel'], { low: number; high: number }> = {
  High:   { low: 2000, high: 8000 },
  Medium: { low: 800,  high: 3000 },
  Low:    { low: 200,  high: 1000 },
}

// ─── Business-type service page suggestions ───────────────────────────────────

const SERVICE_SLUGS: Partial<Record<Exclude<BusinessType, 'auto'>, string[]>> = {
  roofer:     ['roof-repair', 'roof-replacement', 'roof-inspection', 'gutter-installation', 'emergency-roof-repair'],
  contractor: ['kitchen-remodeling', 'bathroom-remodeling', 'basement-finishing', 'deck-installation', 'home-additions'],
  dentist:    ['teeth-whitening', 'dental-implants', 'orthodontics', 'emergency-dental-care', 'cosmetic-dentistry'],
  salon:      ['hair-coloring', 'hair-extensions', 'balayage-highlights', 'keratin-treatment', 'bridal-hair'],
  auto_shop:  ['oil-change-service', 'brake-repair', 'tire-rotation', 'transmission-repair', 'engine-diagnostics'],
  restaurant: ['private-dining', 'catering-services', 'takeout-delivery', 'meal-prep-delivery'],
}

const SERVICE_LABELS: Partial<Record<Exclude<BusinessType, 'auto'>, string[]>> = {
  roofer:     ['Roof Repair', 'Roof Replacement', 'Roof Inspection', 'Gutter Installation', 'Emergency Roof Repair'],
  contractor: ['Kitchen Remodeling', 'Bathroom Remodeling', 'Basement Finishing', 'Deck Installation', 'Home Additions'],
  dentist:    ['Teeth Whitening', 'Dental Implants', 'Orthodontics', 'Emergency Dental Care', 'Cosmetic Dentistry'],
  salon:      ['Hair Coloring', 'Hair Extensions', 'Balayage Highlights', 'Keratin Treatment', 'Bridal Hair'],
  auto_shop:  ['Oil Change Service', 'Brake Repair', 'Tire Rotation', 'Transmission Repair', 'Engine Diagnostics'],
  restaurant: ['Private Dining', 'Catering Services', 'Takeout & Delivery', 'Meal Prep Delivery'],
}

// ─── Gap ID → opportunity level mapping ──────────────────────────────────────

const GAP_LEVEL: Record<string, OpportunityItem['opportunityLevel']> = {
  'comp-no-service-pages':  'High',
  'comp-no-location-pages': 'High',
  'comp-no-local-schema':   'Medium',
  'comp-no-trust-signals':  'Medium',
  'comp-no-map':            'Low',
  'comp-no-hours':          'Low',
  'comp-no-contact-form':   'Medium',
  'comp-thin-content':      'Medium',
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface DetectOpportunitiesInput {
  pages: CrawledPage[]
  categoryFindings: {
    technical: Finding[]
    localSeo: Finding[]
    conversion: Finding[]
    content: Finding[]
    trust: Finding[]
  }
  competitorResult?: CompetitorAnalysisResult
  detectedBusinessType: Exclude<BusinessType, 'auto'>
}

export function detectOpportunities(input: DetectOpportunitiesInput): OpportunityItem[] {
  const { pages, categoryFindings, competitorResult, detectedBusinessType } = input
  const allFindings = [
    ...categoryFindings.technical,
    ...categoryFindings.localSeo,
    ...categoryFindings.conversion,
    ...categoryFindings.content,
    ...categoryFindings.trust,
  ]
  const findingIds = new Set(allFindings.map((f) => f.id))

  const items: OpportunityItem[] = []

  // Track which broad opportunity types we've emitted so we don't duplicate
  // when both content findings AND competitor gaps indicate the same gap.
  const emittedTypes = new Set<string>()

  // 1. Missing service pages entirely
  const servicePages = pages.filter((p) => p.pageType === 'service')
  if (servicePages.length === 0 && !emittedTypes.has('service-pages')) {
    const slugs = SERVICE_SLUGS[detectedBusinessType as Exclude<BusinessType, 'auto'>] ?? ['services-overview', 'our-services']
    const labels = SERVICE_LABELS[detectedBusinessType as Exclude<BusinessType, 'auto'>] ?? ['Our Services']
    const compCoverage = competitorResult
      ? competitorResult.competitors
          .filter((c) => c.servicePageCount > 0 && !c.crawlError)
          .map((c) => c.domain)
      : []
    items.push({
      title: 'Create Dedicated Service Pages',
      description:
        `Your site has no dedicated service pages. Customers searching for specific services ` +
        `(like "${labels[0]}" or "${labels[1] ?? 'specialized services'}") can't find them — ` +
        `and Google can't rank you for those terms.`,
      suggestedPageSlug: slugs[0],
      opportunityLevel: 'High',
      reason:
        `No service-specific pages were found. Dedicated service pages are the single highest-ROI ` +
        `content investment for local businesses — each page can rank for dozens of local keywords.`,
      competitorCoverage: compCoverage.length > 0 ? compCoverage : undefined,
      estimatedMonthlyValueRange: VALUE.High,
    })
    emittedTypes.add('service-pages')

    // Also suggest the top additional service pages for this business type
    if (slugs.length > 1) {
      slugs.slice(1, 3).forEach((slug, i) => {
        items.push({
          title: `Add "${labels[i + 1] ?? slug}" Service Page`,
          description: `A dedicated page for ${labels[i + 1] ?? slug} allows you to target customers searching for that specific service in your area.`,
          suggestedPageSlug: slug,
          opportunityLevel: 'Medium',
          reason: `Service-specific pages consistently outperform generic service overviews for local search visibility.`,
          competitorCoverage: compCoverage.length > 0 ? compCoverage : undefined,
          estimatedMonthlyValueRange: VALUE.Medium,
        })
      })
    }
  }

  // 2. Weak service coverage (has a generic services page but no specific ones)
  const hasGenericServicesOnly =
    servicePages.length === 1 &&
    /^\/(services?|our-services?|what-we-do)\/?$/i.test(new URL(servicePages[0].url, 'https://x').pathname)

  if (
    hasGenericServicesOnly &&
    !emittedTypes.has('service-pages')
  ) {
    const avgCompServicePages = competitorResult
      ? average(competitorResult.competitors.filter((c) => !c.crawlError).map((c) => c.servicePageCount))
      : 0
    const slugs = SERVICE_SLUGS[detectedBusinessType as Exclude<BusinessType, 'auto'>] ?? ['specific-service']
    const labels = SERVICE_LABELS[detectedBusinessType as Exclude<BusinessType, 'auto'>] ?? ['Specific Service']
    const compCoverage = competitorResult
      ? competitorResult.competitors
          .filter((c) => c.servicePageCount >= 3 && !c.crawlError)
          .map((c) => c.domain)
      : []

    if (avgCompServicePages >= 3 || findingIds.has('content-too-few-service-pages')) {
      items.push({
        title: 'Split Generic Services Page into Individual Pages',
        description:
          `You have one generic services page but competitors have ${Math.round(avgCompServicePages) || 'multiple'} ` +
          `individual service pages. Each dedicated page can rank for its own set of local keywords.`,
        suggestedPageSlug: slugs[0],
        opportunityLevel: 'High',
        reason:
          `Google ranks specific pages higher for specific searches. A page titled ` +
          `"${labels[0]}" will rank for "${labels[0].toLowerCase()} near me" far better ` +
          `than a generic services page.`,
        competitorCoverage: compCoverage.length > 0 ? compCoverage : undefined,
        estimatedMonthlyValueRange: VALUE.High,
      })
      emittedTypes.add('service-pages')
    }
  }

  // 3. Location page opportunities
  const locationPages = pages.filter((p) => p.pageType === 'location')
  const hasAddressSignal = pages.some((p) => p.hasAddress)

  if (
    locationPages.length === 0 &&
    hasAddressSignal &&
    !emittedTypes.has('location-pages')
  ) {
    const compCoverage = competitorResult
      ? competitorResult.competitors
          .filter((c) => c.locationPageCount > 0 && !c.crawlError)
          .map((c) => c.domain)
      : []
    const level: OpportunityItem['opportunityLevel'] =
      findingIds.has('content-no-location-pages') || findingIds.has('local-no-location-pages')
        ? 'High'
        : 'Medium'

    items.push({
      title: 'Create City-Specific Service Pages',
      description:
        `You have no location-specific pages. Creating pages like ` +
        `"[Service] in [City]" dramatically improves rankings for nearby searches and ` +
        `customers searching by area.`,
      suggestedPageSlug: 'service-area-cityname',
      opportunityLevel: level,
      reason:
        `"Near me" and city-specific searches make up a large portion of local service queries. ` +
        `Location pages let you target each area you serve directly.`,
      competitorCoverage: compCoverage.length > 0 ? compCoverage : undefined,
      estimatedMonthlyValueRange: VALUE[level],
    })
    emittedTypes.add('location-pages')
  }

  // 4. Competitor coverage gaps (only add types not already emitted above)
  if (competitorResult && competitorResult.gaps.length > 0) {
    for (const gap of competitorResult.gaps) {
      const level = GAP_LEVEL[gap.id] ?? 'Low'

      // Skip gap types we've already generated a richer opportunity for
      if (gap.id === 'comp-no-service-pages' && emittedTypes.has('service-pages')) continue
      if (gap.id === 'comp-no-location-pages' && emittedTypes.has('location-pages')) continue

      const slug = gapSlug(gap.id)
      items.push({
        title: gap.title,
        description: gap.description,
        suggestedPageSlug: slug,
        opportunityLevel: level,
        reason: gap.recommendation,
        competitorCoverage: gap.competitorDomains.length > 0 ? gap.competitorDomains : undefined,
        estimatedMonthlyValueRange: VALUE[level],
      })

      // Mark broad types to prevent future duplicates in longer gap lists
      if (gap.id === 'comp-no-service-pages')  emittedTypes.add('service-pages')
      if (gap.id === 'comp-no-location-pages') emittedTypes.add('location-pages')
    }
  }

  // Sort by level: High first, then Medium, then Low
  const levelOrder: Record<OpportunityItem['opportunityLevel'], number> = { High: 0, Medium: 1, Low: 2 }
  return items.sort((a, b) => levelOrder[a.opportunityLevel] - levelOrder[b.opportunityLevel])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function gapSlug(gapId: string): string {
  const map: Record<string, string> = {
    'comp-no-service-pages':  'our-services',
    'comp-no-location-pages': 'service-area-city',
    'comp-no-local-schema':   'about-local-business',
    'comp-no-trust-signals':  'reviews-testimonials',
    'comp-no-map':            'contact-directions',
    'comp-no-hours':          'business-hours',
    'comp-no-contact-form':   'contact-us',
    'comp-thin-content':      'detailed-service-page',
  }
  return map[gapId] ?? gapId.replace(/^comp-no-/, '')
}
