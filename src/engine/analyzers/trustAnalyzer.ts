/**
 * Trust analyzer.
 * Checks for social proof (testimonials, reviews), business legitimacy signals
 * (licensing, certifications, years in business), gallery/proof-of-work,
 * about/team pages, and HTTPS.
 */

import type { AnalyzerOutput, CrawledPage, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage, pagesByType } from './types'
import { isHttps } from '../utils/domain'

export function analyzeTrust(input: AnalyzerInput): AnalyzerOutput {
  const { pages, domain } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)
  const aboutPages = pagesByType(pages, 'about')
  const galleryPages = pagesByType(pages, 'gallery')

  // ── 1. HTTPS ──────────────────────────────────────────────────────────────
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`
  if (!isHttps(homeUrl)) {
    findings.push({
      id: 'trust-no-https',
      category: 'trust',
      severity: 'high',
      title: 'Site is not using HTTPS',
      summary: `${domain} appears to be serving pages over HTTP instead of HTTPS.`,
      whyItMatters:
        'Google explicitly uses HTTPS as a ranking signal. More importantly, Chrome displays "Not Secure" warnings to visitors on HTTP sites — which kills conversion rates and trust instantly.',
      recommendation:
        'Install an SSL certificate and force HTTPS across the site. Most hosts offer free SSL via Let\'s Encrypt. Redirect all HTTP traffic to HTTPS with a 301 redirect.',
    })
  }

  // ── 2. No testimonials or reviews ─────────────────────────────────────────
  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0)
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals)

  if (totalTestimonials === 0 && !hasTrustOnAnyPage) {
    findings.push({
      id: 'trust-no-testimonials',
      category: 'trust',
      severity: 'high',
      title: 'No testimonials or reviews found on the site',
      summary: 'No customer testimonials, star ratings, or review widgets were detected.',
      whyItMatters:
        'For local service businesses, social proof is often the deciding factor. Visitors ask: "Has anyone else used this business and been happy?" Without testimonials, many prospects move to a competitor who shows proof.',
      recommendation:
        'Add 3–5 real customer testimonials to the homepage. Include the customer\'s first name, location, and service. Also embed your Google Business Profile reviews using a review widget.',
    })
  } else if (!hasTrustOnAnyPage && totalTestimonials === 0) {
    // Already covered above
  } else if (!hasTrustOnAnyPage) {
    findings.push({
      id: 'trust-weak-trust-signals',
      category: 'trust',
      severity: 'medium',
      title: 'Trust signals are weak or limited',
      summary: 'Some trust elements exist but no licensing, certification, or guarantee language was found.',
      whyItMatters:
        'Trust signals help overcome purchase anxiety. Phrases like "Licensed & Insured", "5-Star Rated", "Satisfaction Guaranteed" increase conversion rates significantly for service businesses.',
      recommendation:
        'Add trust badges and copy to the homepage: license numbers, insurance statements, guarantee language, award logos, and years in business. Place them above the fold if possible.',
    })
  }

  // ── 3. No about / team page ───────────────────────────────────────────────
  if (aboutPages.length === 0) {
    findings.push({
      id: 'trust-no-about-page',
      category: 'trust',
      severity: 'medium',
      title: 'No About or Team page found',
      summary: 'No "About Us" or team page was detected on the site.',
      whyItMatters:
        'Local customers often want to know who they\'re inviting into their home or trusting with their business. An About page humanizes your brand and builds credibility.',
      recommendation:
        'Add an About page that tells your story: how long you\'ve been in business, who your team is, what makes you different, and why you care about the work you do. Include real photos of your team.',
    })
  }

  // ── 4. No gallery or proof-of-work ───────────────────────────────────────
  if (galleryPages.length === 0 && pages.length >= 4) {
    findings.push({
      id: 'trust-no-gallery',
      category: 'trust',
      severity: 'medium',
      title: 'No gallery or portfolio page found',
      summary: 'No gallery, portfolio, or before/after page was detected.',
      whyItMatters:
        'For trade businesses (roofers, remodelers, landscapers, etc.) and beauty services, showing your work is one of the strongest trust signals available. "Show, don\'t tell."',
      recommendation:
        'Add a gallery, portfolio, or "Our Work" page with photos of real completed jobs. For each image, add a descriptive alt text (e.g., "roof replacement Austin TX") for SEO benefit.',
    })
  }

  // ── 5. Homepage trust signals absent ─────────────────────────────────────
  if (home && !home.hasTrustSignals && aboutPages.length > 0) {
    // Only fire if about page exists (otherwise #3 already covers this territory)
    findings.push({
      id: 'trust-homepage-no-trust-content',
      category: 'trust',
      severity: 'low',
      title: 'Homepage has no visible trust signals',
      summary: 'The homepage has no detectable testimonials, certifications, or guarantee language.',
      whyItMatters:
        'The homepage is the highest-traffic page on most sites. If trust signals only appear on inner pages, most visitors never see them.',
      recommendation:
        'Move your strongest trust signals to the homepage: one star-rated testimonial, your license/insurance statement, and any guarantee you offer.',
      affectedUrls: [home.url],
    })
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  notes.push(
    `HTTPS: ${isHttps(homeUrl) ? 'yes' : 'NO'}`,
    `Testimonials found: ${totalTestimonials} | Trust signals on any page: ${hasTrustOnAnyPage ? 'yes' : 'no'}`,
    `About pages: ${aboutPages.length} | Gallery pages: ${galleryPages.length}`,
  )

  return { findings, notes }
}
