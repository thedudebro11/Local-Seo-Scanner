/**
 * Aggregates crawled competitor pages into a CompetitorSite summary.
 * Pure function — no I/O, no side effects.
 */

import type { CrawledPage } from '../types/audit'
import type { CompetitorSite } from './competitorTypes'
import { getDomain } from '../utils/domain'

const LOCAL_BUSINESS_SCHEMA_TYPES = new Set([
  'LocalBusiness', 'ProfessionalService', 'HomeAndConstructionBusiness',
  'FoodEstablishment', 'HealthAndBeautyBusiness', 'MedicalOrganization',
  'AutoRepair', 'Restaurant',
])

const EMPTY_SITE = (url: string, crawlError?: string): CompetitorSite => ({
  url,
  domain: getDomain(url),
  crawlError,
  pageCount: 0,
  hasLocalBusinessSchema: false,
  schemaTypes: [],
  servicePageCount: 0,
  locationPageCount: 0,
  hasGalleryPage: false,
  hasAboutPage: false,
  hasContactPage: false,
  hasPhone: false,
  hasAddress: false,
  hasMap: false,
  hasHours: false,
  hasTrustSignals: false,
  avgWordCount: 0,
  ctaCoverage: 0,
  hasForm: false,
})

/**
 * Derive a CompetitorSite summary from crawled pages.
 * @param url        - The competitor's starting URL (normalized)
 * @param pages      - Crawled + extracted pages
 * @param crawlError - Set when crawl failed; pages will be empty
 */
export function analyzeCompetitor(
  url: string,
  pages: CrawledPage[],
  crawlError?: string,
): CompetitorSite {
  if (pages.length === 0) return EMPTY_SITE(url, crawlError)

  const allSchemaTypes = [...new Set(pages.flatMap((p) => p.schemaTypes))]
  const hasLocalBusinessSchema = allSchemaTypes.some((t) => LOCAL_BUSINESS_SCHEMA_TYPES.has(t))
  const pagesWithCta = pages.filter((p) => p.ctaTexts.length > 0).length
  const totalWordCount = pages.reduce((sum, p) => sum + (p.wordCount ?? 0), 0)

  return {
    url,
    domain: getDomain(url),
    crawlError,
    pageCount: pages.length,
    hasLocalBusinessSchema,
    schemaTypes: allSchemaTypes,
    servicePageCount: pages.filter((p) => p.pageType === 'service').length,
    locationPageCount: pages.filter((p) => p.pageType === 'location').length,
    hasGalleryPage: pages.some((p) => p.pageType === 'gallery'),
    hasAboutPage: pages.some((p) => p.pageType === 'about'),
    hasContactPage: pages.some((p) => p.pageType === 'contact'),
    hasPhone: pages.some((p) => p.phones.length > 0),
    hasAddress: pages.some((p) => p.hasAddress),
    hasMap: pages.some((p) => p.hasMap),
    hasHours: pages.some((p) => p.hasHours),
    hasTrustSignals: pages.some((p) => p.hasTrustSignals),
    avgWordCount: Math.round(totalWordCount / pages.length),
    ctaCoverage: pagesWithCta / pages.length,
    hasForm: pages.some((p) => p.hasForm),
  }
}
