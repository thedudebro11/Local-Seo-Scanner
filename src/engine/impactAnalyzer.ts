/**
 * Business Impact Estimation — Impact Signals layer.
 *
 * Enriches each Finding with:
 *   impactLevel            — CRITICAL | HIGH | MEDIUM | LOW
 *   impactReason           — why this hurts the business
 *   estimatedBusinessEffect — concrete revenue/lead consequence
 *
 * Rules are keyed first by finding ID (precise), then fall back to
 * category × severity for any future findings not yet catalogued.
 *
 * Does NOT change existing scoring logic — only adds metadata.
 */

import type { Finding, BusinessType, ImpactLevel } from './types/audit'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImpactAssessment {
  impactLevel: ImpactLevel
  impactReason: string
  estimatedBusinessEffect: string
}

// ─── Per-finding rules (38 IDs) ───────────────────────────────────────────────

const IMPACT_RULES: Partial<Record<string, ImpactAssessment>> = {

  // ── CRITICAL ────────────────────────────────────────────────────────────────

  'local-no-phone-contact': {
    impactLevel: 'CRITICAL',
    impactReason: 'User intent is highest on contact pages — visitors are ready to call right now',
    estimatedBusinessEffect: 'Direct lead loss: every contact-page visitor who can\'t find a number likely leaves for a competitor',
  },
  'conversion-no-form-contact-page': {
    impactLevel: 'CRITICAL',
    impactReason: 'Contact page exists but offers no way to submit an inquiry',
    estimatedBusinessEffect: 'Direct lead loss: async conversion path is broken for visitors who prefer not to call',
  },
  'trust-no-https': {
    impactLevel: 'CRITICAL',
    impactReason: 'Browser marks the site "Not Secure" before the page loads — trust is destroyed immediately',
    estimatedBusinessEffect: 'Immediate trust destruction and Google ranking penalty; many users bounce without reading',
  },
  'technical-noindex-money-pages': {
    impactLevel: 'CRITICAL',
    impactReason: 'Revenue-generating pages are blocked from Google indexing',
    estimatedBusinessEffect: 'Zero organic traffic to key pages; completely invisible to prospects searching for these services',
  },

  // ── HIGH ────────────────────────────────────────────────────────────────────

  'local-no-phone-homepage': {
    impactLevel: 'HIGH',
    impactReason: 'Homepage is the most-visited page; no phone number eliminates the easiest conversion action',
    estimatedBusinessEffect: 'Significant missed calls from mobile visitors who expect one-tap dialing',
  },
  'conversion-no-cta-homepage': {
    impactLevel: 'HIGH',
    impactReason: 'Homepage is the primary conversion entry point — no CTA means visitors have no clear next step',
    estimatedBusinessEffect: 'Elevated bounce rate; leads leave without engaging',
  },
  'conversion-no-phone-homepage': {
    impactLevel: 'HIGH',
    impactReason: 'Phone is the #1 contact method for local service businesses',
    estimatedBusinessEffect: 'Missed calls from high-intent mobile visitors scanning the homepage',
  },
  'lh-performance-poor': {
    impactLevel: 'HIGH',
    impactReason: 'Google uses Core Web Vitals as a ranking signal; critically slow sites rank lower and lose mobile users',
    estimatedBusinessEffect: 'Lost search visibility + higher bounce rate (53% of mobile users leave after 3s)',
  },
  'lh-lcp-slow': {
    impactLevel: 'HIGH',
    impactReason: 'LCP > 4s signals a poor user experience to Google and causes mobile abandonment',
    estimatedBusinessEffect: 'Lower rankings + significant mobile visitor drop-off before the page is usable',
  },
  'technical-broken-pages': {
    impactLevel: 'HIGH',
    impactReason: 'Broken pages waste crawl budget, break internal link equity, and frustrate users',
    estimatedBusinessEffect: 'Lost link equity to service pages + negative UX signals sent to Google',
  },
  'local-no-localbusiness-schema': {
    impactLevel: 'HIGH',
    impactReason: 'LocalBusiness schema is a key signal for Google Local Pack placement',
    estimatedBusinessEffect: 'Reduced local pack visibility and fewer rich result features in Google Search',
  },
  'content-no-service-pages': {
    impactLevel: 'HIGH',
    impactReason: 'No dedicated service pages means no targeted landing pages for high-intent searches',
    estimatedBusinessEffect: 'Organic traffic from "service + location" queries goes entirely to competitors',
  },
  'local-no-location-pages': {
    impactLevel: 'HIGH',
    impactReason: 'Location-specific pages are critical for ranking in nearby cities and suburbs',
    estimatedBusinessEffect: 'Zero geo-specific organic visibility outside the primary city',
  },
  'visual-no-above-fold-cta': {
    impactLevel: 'HIGH',
    impactReason: 'Visitors who don\'t see a CTA above the fold rarely scroll to find one',
    estimatedBusinessEffect: 'Conversion rate drops significantly; leads disengage before taking action',
  },
  'visual-no-phone-above-fold': {
    impactLevel: 'HIGH',
    impactReason: 'Mobile users expect a tap-to-call number without scrolling',
    estimatedBusinessEffect: 'Missed inbound calls from mobile visitors; friction increases drop-off',
  },
  'conversion-no-booking-cta': {
    impactLevel: 'HIGH',
    impactReason: 'For appointment-driven businesses, booking friction translates directly to lost reservations',
    estimatedBusinessEffect: 'Prospective customers book with competitors who make it one click easier',
  },

  // ── MEDIUM ──────────────────────────────────────────────────────────────────

  'technical-missing-meta-desc': {
    impactLevel: 'MEDIUM',
    impactReason: 'Google may auto-generate poor descriptions, reducing SERP click-through rate',
    estimatedBusinessEffect: 'Fewer clicks from search results despite good ranking position',
  },
  'technical-missing-title': {
    impactLevel: 'MEDIUM',
    impactReason: 'Missing title forces Google to generate its own, weakening SERP presence and keyword targeting',
    estimatedBusinessEffect: 'Lower click-through rate and weaker keyword relevance in search results',
  },
  'technical-missing-h1': {
    impactLevel: 'MEDIUM',
    impactReason: 'H1 is a primary on-page signal for topic relevance',
    estimatedBusinessEffect: 'Minor ranking signal loss; pages may underperform for target keywords',
  },
  'local-no-address-homepage': {
    impactLevel: 'MEDIUM',
    impactReason: 'NAP consistency across the web and homepage is a local ranking factor',
    estimatedBusinessEffect: 'Weaker local pack signals; users can\'t confirm the business location',
  },
  'local-no-map': {
    impactLevel: 'MEDIUM',
    impactReason: 'Embedded maps reduce friction for customers who want to visit in person',
    estimatedBusinessEffect: 'Increased drop-off from intent-to-visit users; lost foot traffic',
  },
  'local-no-hours': {
    impactLevel: 'MEDIUM',
    impactReason: 'Users can\'t determine if the business is open before calling or visiting',
    estimatedBusinessEffect: 'Lost leads who move to a competitor that shows hours clearly',
  },
  'trust-no-testimonials': {
    impactLevel: 'MEDIUM',
    impactReason: 'Social proof is a primary conversion driver for local services',
    estimatedBusinessEffect: 'Lower conversion rate from undecided visitors who need reassurance before contacting',
  },
  'trust-weak-trust-signals': {
    impactLevel: 'MEDIUM',
    impactReason: 'Site lacks visible trust indicators (certifications, awards, affiliations)',
    estimatedBusinessEffect: 'Reduced conversion rate; prospects choose a competitor with more visible credibility',
  },
  'trust-homepage-no-trust-content': {
    impactLevel: 'MEDIUM',
    impactReason: 'Homepage is the first impression; missing trust content reduces immediate engagement',
    estimatedBusinessEffect: 'Higher bounce rate from skeptical visitors who don\'t see proof of quality',
  },
  'conversion-no-form': {
    impactLevel: 'MEDIUM',
    impactReason: 'No site-wide forms means there is no async lead capture path',
    estimatedBusinessEffect: 'All leads must call or email directly; visitors who prefer forms are lost',
  },
  'conversion-low-cta-coverage': {
    impactLevel: 'MEDIUM',
    impactReason: 'Visitors landing on inner pages have no clear action to take',
    estimatedBusinessEffect: 'Missed conversion opportunities from service, about, and blog page visitors',
  },
  'lh-tbt-high': {
    impactLevel: 'MEDIUM',
    impactReason: 'High total blocking time degrades interactivity and frustrates mobile users',
    estimatedBusinessEffect: 'Increased bounce rate; users leave before they can interact with the page',
  },
  'lh-cls-high': {
    impactLevel: 'MEDIUM',
    impactReason: 'Severe layout shifts cause accidental taps and a jarring experience',
    estimatedBusinessEffect: 'Reduced engagement; users who tap wrong elements leave in frustration',
  },
  'lh-seo-low': {
    impactLevel: 'MEDIUM',
    impactReason: 'Lighthouse SEO score reflects multiple on-page SEO deficiencies',
    estimatedBusinessEffect: 'Broad ranking signal loss across technical and on-page SEO factors',
  },
  'visual-no-hero-clarity': {
    impactLevel: 'MEDIUM',
    impactReason: 'An unclear hero message means visitors don\'t immediately know what the business offers',
    estimatedBusinessEffect: 'Higher bounce rate from confused first-time visitors',
  },
  'visual-no-trust-signals-visible': {
    impactLevel: 'MEDIUM',
    impactReason: 'Trust signals hidden below the fold are rarely seen before users decide to leave',
    estimatedBusinessEffect: 'Trust content is not doing its job; conversion rate is lower than it should be',
  },
  'content-thin-homepage': {
    impactLevel: 'MEDIUM',
    impactReason: 'Thin homepage content gives Google less topical authority to work with',
    estimatedBusinessEffect: 'Weaker broad keyword rankings; homepage underperforms as an organic landing page',
  },
  'content-no-location-pages': {
    impactLevel: 'MEDIUM',
    impactReason: 'No location-specific content means no foothold in nearby city searches',
    estimatedBusinessEffect: 'Missed organic traffic from high-intent "near me" and suburb-specific queries',
  },

  // ── LOW ─────────────────────────────────────────────────────────────────────

  'technical-no-robots': {
    impactLevel: 'LOW',
    impactReason: 'Missing robots.txt means no crawl guidance; Googlebot defaults to crawling everything',
    estimatedBusinessEffect: 'Minor crawl inefficiency; low direct ranking impact for most sites',
  },
  'technical-no-sitemap': {
    impactLevel: 'LOW',
    impactReason: 'Sitemap speeds up content discovery but is not required for indexing',
    estimatedBusinessEffect: 'Slightly slower discovery of new or updated pages',
  },
  'technical-short-title': {
    impactLevel: 'LOW',
    impactReason: 'Short titles miss keyword opportunities but don\'t actively harm rankings',
    estimatedBusinessEffect: 'Minor reduction in keyword coverage in search results',
  },
  'technical-long-title': {
    impactLevel: 'LOW',
    impactReason: 'Long titles get truncated in SERPs but the page still ranks',
    estimatedBusinessEffect: 'Truncated SERP titles may marginally reduce click-through rate',
  },
  'technical-multiple-h1': {
    impactLevel: 'LOW',
    impactReason: 'Multiple H1s send mixed topical signals but rarely cause significant ranking drops',
    estimatedBusinessEffect: 'Minor on-page optimization loss; easy to fix for small gains',
  },
  'technical-missing-canonical': {
    impactLevel: 'LOW',
    impactReason: 'Without canonical tags, duplicate content risk exists if URL variations are present',
    estimatedBusinessEffect: 'Potential link equity dilution if the same content appears at multiple URLs',
  },
  'technical-poor-image-alt': {
    impactLevel: 'LOW',
    impactReason: 'Missing alt text limits image search visibility and accessibility',
    estimatedBusinessEffect: 'Missed image search traffic; minor accessibility barrier',
  },
  'trust-no-about-page': {
    impactLevel: 'LOW',
    impactReason: 'About pages build credibility but are not critical to direct conversion',
    estimatedBusinessEffect: 'Marginally lower trust for prospects who research the business before contacting',
  },
  'trust-no-gallery': {
    impactLevel: 'LOW',
    impactReason: 'Gallery pages help visual businesses but are not a universal conversion factor',
    estimatedBusinessEffect: 'Missed opportunity to showcase work quality; affects visually-driven decisions',
  },
  'content-too-few-service-pages': {
    impactLevel: 'LOW',
    impactReason: 'Some service pages exist but don\'t cover all offered services',
    estimatedBusinessEffect: 'Partial keyword coverage; some high-intent searches go unanswered',
  },
  'content-thin-service-pages': {
    impactLevel: 'LOW',
    impactReason: 'Service pages exist but lack depth to outperform competitors in rankings',
    estimatedBusinessEffect: 'Weak keyword relevance on service pages; ranking potential is limited',
  },
  'content-widespread-thin-pages': {
    impactLevel: 'LOW',
    impactReason: 'Many pages with low word counts signal lower overall content quality to Google',
    estimatedBusinessEffect: 'Possible crawl quality reduction; pages compete weakly for long-tail searches',
  },
  'lh-performance-needs-work': {
    impactLevel: 'LOW',
    impactReason: 'Performance is below ideal but not critically slow',
    estimatedBusinessEffect: 'Some mobile user friction; borderline effect on rankings',
  },
  'lh-lcp-needs-work': {
    impactLevel: 'LOW',
    impactReason: 'LCP is slightly above target but not severely slow',
    estimatedBusinessEffect: 'Minor mobile user experience degradation',
  },
  'lh-tbt-medium': {
    impactLevel: 'LOW',
    impactReason: 'Some blocking time that may cause minor input delay on slower devices',
    estimatedBusinessEffect: 'Slight interactivity lag on lower-end mobile devices',
  },
  'lh-cls-medium': {
    impactLevel: 'LOW',
    impactReason: 'Moderate layout shift: annoying but not severe',
    estimatedBusinessEffect: 'Minor user experience friction; occasional accidental taps',
  },
}

// ─── Fallback rules (category × severity) ────────────────────────────────────

const FALLBACK: Record<string, Record<string, ImpactAssessment>> = {
  conversion: {
    high:   { impactLevel: 'HIGH',   impactReason: 'Conversion issues directly prevent leads from contacting the business', estimatedBusinessEffect: 'Direct reduction in lead generation rate' },
    medium: { impactLevel: 'MEDIUM', impactReason: 'Conversion friction reduces the rate at which visitors become leads',   estimatedBusinessEffect: 'Moderately lower lead conversion rate' },
    low:    { impactLevel: 'LOW',    impactReason: 'Minor conversion optimisation opportunity',                              estimatedBusinessEffect: 'Small improvement possible with minimal effort' },
  },
  localSeo: {
    high:   { impactLevel: 'HIGH',   impactReason: 'Critical local SEO signals missing; affects local pack ranking',        estimatedBusinessEffect: 'Reduced local search visibility' },
    medium: { impactLevel: 'MEDIUM', impactReason: 'Local SEO signals incomplete; moderate ranking impact',                 estimatedBusinessEffect: 'Weaker local pack presence' },
    low:    { impactLevel: 'LOW',    impactReason: 'Minor local SEO optimisation opportunity',                              estimatedBusinessEffect: 'Small local ranking improvement possible' },
  },
  technical: {
    high:   { impactLevel: 'HIGH',   impactReason: 'Technical issues preventing proper crawling or indexing',               estimatedBusinessEffect: 'Reduced search visibility for affected pages' },
    medium: { impactLevel: 'MEDIUM', impactReason: 'Technical issues reducing search performance',                          estimatedBusinessEffect: 'Moderate ranking signal loss' },
    low:    { impactLevel: 'LOW',    impactReason: 'Minor technical improvement opportunity',                               estimatedBusinessEffect: 'Small ranking or crawl efficiency gain' },
  },
  content: {
    high:   { impactLevel: 'HIGH',   impactReason: 'Severe content gaps prevent ranking for key service queries',           estimatedBusinessEffect: 'Significant organic traffic loss' },
    medium: { impactLevel: 'MEDIUM', impactReason: 'Content quality or depth issues limit keyword targeting',              estimatedBusinessEffect: 'Moderate reduction in organic reach' },
    low:    { impactLevel: 'LOW',    impactReason: 'Content improvement opportunity for incremental gains',                 estimatedBusinessEffect: 'Minor keyword coverage improvement' },
  },
  trust: {
    high:   { impactLevel: 'HIGH',   impactReason: 'Significant trust deficiency affecting visitor confidence',             estimatedBusinessEffect: 'Lower conversion rate from first-time visitors' },
    medium: { impactLevel: 'MEDIUM', impactReason: 'Moderate trust gap reducing conversion confidence',                    estimatedBusinessEffect: 'Some visitors choose a competitor with more visible credibility' },
    low:    { impactLevel: 'LOW',    impactReason: 'Minor trust enhancement opportunity',                                   estimatedBusinessEffect: 'Marginal conversion rate improvement' },
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute impact signals for a single finding.
 * _businessType is reserved for future business-type-specific overrides.
 */
export function analyzeIssueImpact(issue: Finding, _businessType: BusinessType): ImpactAssessment {
  return (
    IMPACT_RULES[issue.id] ??
    FALLBACK[issue.category]?.[issue.severity] ?? {
      impactLevel: 'LOW',
      impactReason: 'Minor improvement opportunity',
      estimatedBusinessEffect: 'Small incremental gain',
    }
  )
}

/**
 * Enrich a findings array with impact signals in-place (returns new array).
 */
export function enrichFindingsWithImpact(findings: Finding[], businessType: BusinessType): Finding[] {
  return findings.map((f) => ({ ...f, ...analyzeIssueImpact(f, businessType) }))
}

// ─── Score adjustment ─────────────────────────────────────────────────────────

const IMPACT_PENALTY: Record<ImpactLevel, number> = {
  CRITICAL: 12,
  HIGH:      8,
  MEDIUM:    4,
  LOW:       1,
}

/**
 * Compute the total impact-weighted score penalty for a finding set.
 * Capped at 30 so a worst-case site still shows a non-zero score.
 * Applied to the overall score only — category scores are unchanged.
 */
export function computeImpactPenalty(findings: Finding[]): number {
  const raw = findings.reduce((sum, f) => sum + (f.impactLevel ? (IMPACT_PENALTY[f.impactLevel] ?? 0) : 0), 0)
  return Math.min(raw, 30)
}
