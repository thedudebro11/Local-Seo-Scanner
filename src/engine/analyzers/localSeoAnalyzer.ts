/**
 * Local SEO analyzer.
 * Checks NAP consistency, LocalBusiness schema, maps/directions presence,
 * business hours, and location/service-area page coverage.
 */

import type { AnalyzerOutput, CrawledPage, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage, pagesByType, importantPages } from './types'

export function analyzeLocalSeo(input: AnalyzerInput): AnalyzerOutput {
  const { pages, domain } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)
  const keyPages = importantPages(pages)
  const contactPages = pagesByType(pages, 'contact')

  // ── 1. Phone number on homepage ───────────────────────────────────────────
  if (home && home.phones.length === 0) {
    findings.push({
      id: 'local-no-phone-homepage',
      category: 'localSeo',
      severity: 'high',
      title: 'No phone number found on homepage',
      summary: `The homepage for ${domain} has no detectable phone number.`,
      whyItMatters:
        'Google uses phone number presence as a local relevance signal. More importantly, visitors who arrive via local search expect to see a phone number immediately — especially on mobile.',
      recommendation:
        'Add a click-to-call phone number in the site header and prominently on the homepage. Use a tel: href: `<a href="tel:+15555551234">(555) 555-1234</a>`',
    })
  }

  // ── 2. Phone on contact page ──────────────────────────────────────────────
  const contactWithNoPhone = contactPages.filter((p) => p.phones.length === 0)
  if (contactPages.length > 0 && contactWithNoPhone.length > 0) {
    findings.push({
      id: 'local-no-phone-contact',
      category: 'localSeo',
      severity: 'high',
      title: 'Contact page missing phone number',
      summary: 'The contact page has no visible phone number.',
      whyItMatters:
        'When a prospect visits your contact page they are ready to act. Missing a phone number at this moment is a direct lead loss.',
      recommendation:
        'Place the phone number at the top of the contact page in large, tap-friendly text with a tel: link.',
      affectedUrls: contactWithNoPhone.map((p) => p.url),
    })
  }

  // ── 3. Address / NAP on homepage ──────────────────────────────────────────
  if (home && !home.hasAddress) {
    findings.push({
      id: 'local-no-address-homepage',
      category: 'localSeo',
      severity: 'medium',
      title: 'No physical address detected on homepage',
      summary: `${domain} homepage does not appear to display a business address.`,
      whyItMatters:
        'NAP (Name, Address, Phone) consistency is a core local SEO signal. Google uses address presence to confirm local relevance and to match you with map listings.',
      recommendation:
        'Display your full business address in the site footer and on the homepage. Mark it up with LocalBusiness schema for extra credit.',
    })
  }

  // ── 4. LocalBusiness schema ───────────────────────────────────────────────
  const hasLocalBusinessSchema = pages.some((p) =>
    p.schemaTypes.some((t) =>
      ['LocalBusiness', 'ProfessionalService', 'HomeAndConstructionBusiness',
       'FoodEstablishment', 'HealthAndBeautyBusiness', 'MedicalOrganization',
       'AutoRepair', 'Restaurant'].includes(t),
    ),
  )

  if (!hasLocalBusinessSchema) {
    findings.push({
      id: 'local-no-localbusiness-schema',
      category: 'localSeo',
      severity: 'high',
      title: 'No LocalBusiness structured data found',
      summary: 'The site has no LocalBusiness (or equivalent) JSON-LD schema markup.',
      whyItMatters:
        'LocalBusiness schema is how you formally tell Google: "This is a local business, here is our address, phone, hours, and category." It directly powers your Google Business Profile integration and Knowledge Panel data.',
      recommendation:
        'Add a LocalBusiness JSON-LD block to the homepage. Include: name, address, phone, url, openingHours, and geo coordinates. Use schema.org/LocalBusiness as the base type and a more specific subtype if applicable.',
    })
  }

  // ── 5. Map or directions ──────────────────────────────────────────────────
  const hasAnyMap = pages.some((p) => p.hasMap)
  if (!hasAnyMap) {
    findings.push({
      id: 'local-no-map',
      category: 'localSeo',
      severity: 'medium',
      title: 'No map embed or directions link found',
      summary: 'No Google Maps embed or "Get Directions" link was detected anywhere on the site.',
      whyItMatters:
        'A map embed reinforces physical location signals, helps mobile users get directions instantly, and contributes to local relevance signals for Google.',
      recommendation:
        'Embed a Google Maps iframe on the contact page. Also add a "Get Directions" button linked to your Google Maps listing.',
    })
  }

  // ── 6. Business hours ─────────────────────────────────────────────────────
  const hasAnyHours = pages.some((p) => p.hasHours)
  if (!hasAnyHours) {
    findings.push({
      id: 'local-no-hours',
      category: 'localSeo',
      severity: 'medium',
      title: 'No business hours found on the site',
      summary: 'No business hours information was detected across all scanned pages.',
      whyItMatters:
        'Hours are a core conversion signal — users need to know if you\'re open before they call. Google also uses hours from your site to cross-validate Google Business Profile data.',
      recommendation:
        'Display your hours on the homepage, contact page, and in the footer. Add `openingHoursSpecification` to your LocalBusiness schema.',
    })
  }

  // ── 7. Location / service-area pages ─────────────────────────────────────
  const locationPages = pagesByType(pages, 'location')
  if (pages.length >= 5 && locationPages.length === 0) {
    findings.push({
      id: 'local-no-location-pages',
      category: 'localSeo',
      severity: 'medium',
      title: 'No location or service-area pages found',
      summary: 'The site appears to have no pages targeting specific cities or service areas.',
      whyItMatters:
        'Without location-specific pages, the site cannot rank for "[service] in [city]" searches. These are the highest-value local SEO searches for most service businesses.',
      recommendation:
        'Create dedicated pages for each primary service area (e.g., "/plumber-austin-tx/"). Each page should mention the city prominently and include NAP for that location.',
    })
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const phonePagesCount = keyPages.filter((p) => p.phones.length > 0).length
  notes.push(
    `LocalBusiness schema: ${hasLocalBusinessSchema ? 'found' : 'missing'}`,
    `Map present: ${hasAnyMap ? 'yes' : 'no'} | Hours present: ${hasAnyHours ? 'yes' : 'no'}`,
    `Phone on key pages: ${phonePagesCount}/${keyPages.length} | Location pages: ${locationPages.length}`,
  )

  return { findings, notes }
}
