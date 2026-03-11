/**
 * Local SEO scorer.
 * Weights: 30% of overall — heaviest category for local businesses.
 *
 * Positive signals rewarded:
 *   - phone on homepage
 *   - address present
 *   - LocalBusiness schema
 *   - map/directions embed
 *   - hours present
 *   - location pages exist
 */

import type { CrawledPage, Finding, ScoreOutput } from '../types/audit'
import { makeScore } from './scoreHelpers'

export interface LocalSeoScorerInput {
  findings: Finding[]
  pages: CrawledPage[]
}

export function scoreLocalSeo(input: LocalSeoScorerInput): ScoreOutput {
  const { findings, pages } = input
  const positives: string[] = []

  const home = pages.find((p) => p.pageType === 'home') ?? pages[0]

  // ── Positive signals ──────────────────────────────────────────────────────
  if (home?.phones && home.phones.length > 0) {
    positives.push('[+] Phone number present on homepage')
  }

  if (home?.hasAddress) {
    positives.push('[+] Business address found on homepage')
  }

  const hasLocalSchema = pages.some((p) =>
    p.schemaTypes.some((t) =>
      ['LocalBusiness', 'ProfessionalService', 'HomeAndConstructionBusiness',
       'FoodEstablishment', 'HealthAndBeautyBusiness', 'MedicalOrganization',
       'AutoRepair', 'Restaurant'].includes(t),
    ),
  )
  if (hasLocalSchema) {
    positives.push('[+] LocalBusiness structured data is present')
  }

  if (pages.some((p) => p.hasMap)) {
    positives.push('[+] Map or directions embed found')
  }

  if (pages.some((p) => p.hasHours)) {
    positives.push('[+] Business hours found on site')
  }

  const locationPages = pages.filter((p) => p.pageType === 'location')
  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`)
  }

  return makeScore(findings, positives)
}
