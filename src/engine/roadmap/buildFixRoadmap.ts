/**
 * Priority Fix Roadmap generator.
 *
 * Converts existing findings into a strategic, ordered action plan written
 * in plain English for non-technical business owners.
 *
 * Rules:
 * - Reads findings as read-only — does NOT modify any scores
 * - Groups related findings into single strategic items (de-duplication)
 * - Ranks by combined impact, severity, money-leak status, and spread
 * - Caps output at 10 items to keep the roadmap actionable
 */

import type { Finding, FindingCategory, FixRoadmapItem } from '../types/audit'

// ─── Cluster definitions ──────────────────────────────────────────────────────
// Each cluster maps one or more finding IDs to a single strategic roadmap item.
// Order matters: the first matching cluster wins.

interface ClusterDef {
  clusterKey: string
  ids: string[]
  title: string
  whyItMatters: string
  plainEnglishFix: string
  effort: FixRoadmapItem['effort']
  category: FindingCategory
}

const CLUSTERS: ClusterDef[] = [
  // ── Crawlability / Indexing ────────────────────────────────────────────────
  {
    clusterKey: 'crawlability',
    ids: ['technical-noindex-money-pages', 'technical-broken-pages'],
    title: 'Fix pages that are hidden from or blocked by Google',
    whyItMatters:
      'Some of your important pages are either broken or telling Google to ignore them. ' +
      'That means potential customers searching for your services may never find those pages, ' +
      'and any money spent on SEO for those pages is wasted.',
    plainEnglishFix:
      'Restore any broken pages (or redirect them to working ones). ' +
      'Remove the "do not index" setting from service, contact, and location pages ' +
      'so they can appear in Google search results.',
    effort: 'Medium',
    category: 'technical',
  },

  // ── Page speed ────────────────────────────────────────────────────────────
  {
    clusterKey: 'page-speed',
    ids: [
      'lh-performance-poor', 'lh-performance-needs-work',
      'lh-lcp-slow', 'lh-lcp-needs-work',
      'lh-tbt-high', 'lh-tbt-medium',
      'lh-cls-high', 'lh-cls-medium',
    ],
    title: 'Speed up your website so visitors don\'t leave before it loads',
    whyItMatters:
      'A slow website frustrates visitors and hurts your Google ranking. ' +
      'Most people will leave a page if it takes more than 3 seconds to load, ' +
      'meaning you are losing leads before they even see your services.',
    plainEnglishFix:
      'Work with your web developer or hosting provider to compress images, ' +
      'reduce unnecessary scripts, and enable caching. ' +
      'If you use WordPress or a similar platform, a performance plugin can often fix this quickly.',
    effort: 'High',
    category: 'technical',
  },

  // ── Phone / contact visibility ─────────────────────────────────────────────
  {
    clusterKey: 'phone-visibility',
    ids: [
      'local-no-phone-homepage',
      'local-no-phone-contact',
      'conversion-no-phone-homepage',
      'visual-no-phone-above-fold',
    ],
    title: 'Make your phone number visible and easy to tap on every key page',
    whyItMatters:
      'People searching for local businesses often want to call immediately. ' +
      'If your phone number is missing or hard to find, those visitors will call a competitor instead. ' +
      'This is one of the most direct causes of lost leads.',
    plainEnglishFix:
      'Add your phone number in large, clickable text at the top of your homepage, ' +
      'contact page, and every service page. ' +
      'On mobile, it should be a tap-to-call link so visitors can reach you instantly.',
    effort: 'Low',
    category: 'conversion',
  },

  // ── CTA coverage ──────────────────────────────────────────────────────────
  {
    clusterKey: 'cta-coverage',
    ids: [
      'conversion-no-cta-homepage',
      'conversion-low-cta-coverage',
      'conversion-no-booking-cta',
      'visual-no-above-fold-cta',
    ],
    title: 'Add clear "contact us" or "get a quote" buttons to your key pages',
    whyItMatters:
      'Visitors who are ready to hire someone need a clear next step. ' +
      'Without a prominent button or link telling them what to do, many will leave without contacting you — ' +
      'even if they liked what they saw.',
    plainEnglishFix:
      'Add a visible button (such as "Call Now", "Get a Free Quote", or "Book an Appointment") ' +
      'near the top of your homepage and on every service page. ' +
      'The button should be a strong color that stands out from the rest of the page.',
    effort: 'Medium',
    category: 'conversion',
  },

  // ── Contact form ───────────────────────────────────────────────────────────
  {
    clusterKey: 'contact-form',
    ids: ['conversion-no-form', 'conversion-no-form-contact-page'],
    title: 'Add a contact form so people can reach you any time of day',
    whyItMatters:
      'Not everyone wants to call — many visitors prefer to send a message, especially outside business hours. ' +
      'Without a contact form you are missing enquiries from people who would have hired you.',
    plainEnglishFix:
      'Add a simple contact form to your contact page and ideally your homepage too. ' +
      'Ask only for the essentials: name, phone or email, and a brief message. ' +
      'Make sure form submissions arrive in an inbox you check regularly.',
    effort: 'Medium',
    category: 'conversion',
  },

  // ── LocalBusiness schema ───────────────────────────────────────────────────
  {
    clusterKey: 'local-schema',
    ids: ['local-no-localbusiness-schema'],
    title: 'Tell Google exactly what kind of business you are and where you operate',
    whyItMatters:
      'Google uses structured data to display your business name, address, phone number, and hours ' +
      'directly in search results. Without it, you are less likely to appear in local map results ' +
      'and Google may mis-categorize your business.',
    plainEnglishFix:
      'Add "LocalBusiness" structured data to your homepage. ' +
      'This is a small piece of code (or a plugin setting in WordPress) that gives Google ' +
      'your business name, type, address, phone, and opening hours in a format it can reliably read.',
    effort: 'Medium',
    category: 'localSeo',
  },

  // ── Local signals: map, hours, address ────────────────────────────────────
  {
    clusterKey: 'local-signals',
    ids: ['local-no-map', 'local-no-hours', 'local-no-address-homepage', 'local-no-location-pages'],
    title: 'Add your address, hours, and a map to make your location easy to find',
    whyItMatters:
      'Local customers need to know where you are, when you are open, and how to get there. ' +
      'If this information is missing or buried, visitors will go to a competitor whose website ' +
      'answers these questions immediately.',
    plainEnglishFix:
      'Add your full address and business hours to your homepage and contact page. ' +
      'Embed a Google Map so visitors can get directions with one click. ' +
      'If you serve multiple areas, create a dedicated page for each location.',
    effort: 'Low',
    category: 'localSeo',
  },

  // ── Meta content ──────────────────────────────────────────────────────────
  {
    clusterKey: 'meta-content',
    ids: [
      'technical-missing-title', 'technical-short-title', 'technical-long-title',
      'technical-missing-meta-desc',
      'technical-missing-h1', 'technical-multiple-h1',
      'technical-missing-canonical',
    ],
    title: 'Fix missing or poorly written page titles and descriptions',
    whyItMatters:
      'Page titles and descriptions are what Google shows in search results. ' +
      'If they are missing, duplicated, or too short, your pages look generic ' +
      'and get passed over for competitors who have written compelling, keyword-rich summaries.',
    plainEnglishFix:
      'Give every page a unique title (50–60 characters) that describes exactly what the page is about, ' +
      'including your service and city. ' +
      'Write a short description (150–160 characters) for each page that encourages someone to click. ' +
      'Make sure every page has exactly one clear main heading.',
    effort: 'Low',
    category: 'technical',
  },

  // ── Content depth ─────────────────────────────────────────────────────────
  {
    clusterKey: 'content-depth',
    ids: [
      'content-thin-homepage',
      'content-no-service-pages', 'content-too-few-service-pages', 'content-thin-service-pages',
      'content-no-location-pages',
      'content-widespread-thin-pages',
    ],
    title: 'Write more detailed pages that explain your services and service area',
    whyItMatters:
      'Thin pages with little content rarely rank well because Google struggles to understand ' +
      'what you offer and for whom. Competitors with detailed service pages consistently ' +
      'outrank sites with sparse content.',
    plainEnglishFix:
      'Create or expand your service pages to clearly describe each service, ' +
      'who it is for, and why customers should choose you. ' +
      'Add a dedicated page for each major service and each city or town you serve. ' +
      'Aim for at least 300–500 words per page.',
    effort: 'High',
    category: 'content',
  },

  // ── Trust & credibility ────────────────────────────────────────────────────
  {
    clusterKey: 'trust-credibility',
    ids: [
      'trust-no-https',
      'trust-no-testimonials', 'trust-weak-trust-signals', 'trust-homepage-no-trust-content',
      'trust-no-about-page', 'trust-no-gallery',
    ],
    title: 'Build visible credibility so visitors trust you before they call',
    whyItMatters:
      'Visitors decide within seconds whether a business looks trustworthy. ' +
      'Without reviews, credentials, photos, or an About page, ' +
      'many people will leave rather than risk contacting an unknown company.',
    plainEnglishFix:
      'Add real customer reviews or testimonials to your homepage. ' +
      'Create an About page that introduces your team and story. ' +
      'Add photos of your work, vehicle, or premises. ' +
      'If your site is not yet on HTTPS (the padlock), ask your hosting provider to enable SSL — it is usually free.',
    effort: 'Medium',
    category: 'trust',
  },

  // ── Visual / above-fold presence ──────────────────────────────────────────
  {
    clusterKey: 'above-fold',
    ids: ['visual-no-hero-clarity', 'visual-no-trust-signals-visible'],
    title: 'Make it immediately clear who you are and why visitors should stay',
    whyItMatters:
      'The first thing a visitor sees on your homepage determines whether they stay or leave. ' +
      'If there is no clear headline, photo, or trust signal above the fold (before scrolling), ' +
      'many visitors will bounce without ever learning about your services.',
    plainEnglishFix:
      'Update your homepage hero section to include: a clear headline stating what you do and where, ' +
      'a short sub-heading with your key selling point, a visible phone number or CTA button, ' +
      'and a recognizable photo (your team, your work, or your location).',
    effort: 'Medium',
    category: 'conversion',
  },

  // ── Robots / Sitemap ──────────────────────────────────────────────────────
  {
    clusterKey: 'crawl-config',
    ids: ['technical-no-robots', 'technical-no-sitemap'],
    title: 'Set up the basic files Google needs to crawl your site properly',
    whyItMatters:
      'A robots.txt file and a sitemap tell Google which pages exist and how to crawl your site. ' +
      'Without them, Google may miss pages entirely or crawl your site less often.',
    plainEnglishFix:
      'Ask your developer or use your CMS\'s SEO plugin (e.g., Yoast) to generate a sitemap.xml ' +
      'and a robots.txt file, then submit the sitemap to Google Search Console.',
    effort: 'Low',
    category: 'technical',
  },

  // ── Image accessibility ───────────────────────────────────────────────────
  {
    clusterKey: 'image-alt',
    ids: ['technical-poor-image-alt'],
    title: 'Add descriptions to your images so Google and screen readers can understand them',
    whyItMatters:
      'Images without alt text are invisible to Google — and to visitors using screen readers. ' +
      'Properly described images add keyword relevance and improve accessibility.',
    plainEnglishFix:
      'For each image on your site, add a short description (alt text) explaining what the image shows. ' +
      'For example: "Roofing crew replacing shingles on a home in Dallas." ' +
      'Your CMS likely has an alt text field when you upload or edit images.',
    effort: 'Low',
    category: 'technical',
  },

  // ── Lighthouse SEO score ──────────────────────────────────────────────────
  {
    clusterKey: 'lh-seo',
    ids: ['lh-seo-low'],
    title: 'Fix the technical SEO issues flagged by Google\'s own audit tool',
    whyItMatters:
      'Google\'s Lighthouse tool scored your SEO below the recommended threshold, ' +
      'meaning there are measurable technical issues that directly reduce your search visibility.',
    plainEnglishFix:
      'Run Google Search Console on your site and review the Core Web Vitals and Coverage reports. ' +
      'Address each flagged issue — these are items Google itself is telling you to fix.',
    effort: 'Medium',
    category: 'technical',
  },
]

// Build a lookup map: findingId → clusterKey
const ID_TO_CLUSTER = new Map<string, string>()
for (const cluster of CLUSTERS) {
  for (const id of cluster.ids) {
    ID_TO_CLUSTER.set(id, cluster.clusterKey)
  }
}

// ─── Priority scoring ─────────────────────────────────────────────────────────

const IMPACT_SCORE: Record<string, number> = {
  CRITICAL: 40,
  HIGH:     20,
  MEDIUM:   10,
  LOW:       3,
}

const SEVERITY_SCORE: Record<string, number> = {
  high:   8,
  medium: 4,
  low:    1,
}

function findingScore(f: Finding, moneyLeakIds: Set<string>): number {
  let score = 0
  score += IMPACT_SCORE[f.impactLevel ?? ''] ?? 0
  score += SEVERITY_SCORE[f.severity] ?? 0
  if (moneyLeakIds.has(f.id)) score += 15
  score += Math.min((f.affectedUrls?.length ?? 0) * 2, 10)
  return score
}

function toRoadmapImpact(f: Finding): FixRoadmapItem['impact'] {
  switch (f.impactLevel) {
    case 'CRITICAL': return 'Critical'
    case 'HIGH':     return 'High'
    case 'MEDIUM':   return 'Medium'
    default:
      return f.severity === 'high' ? 'High' : f.severity === 'medium' ? 'Medium' : 'Low'
  }
}

const IMPACT_RANK: Record<FixRoadmapItem['impact'], number> = {
  Critical: 4, High: 3, Medium: 2, Low: 1,
}

function highestImpact(impacts: FixRoadmapItem['impact'][]): FixRoadmapItem['impact'] {
  return impacts.reduce((best, cur) =>
    IMPACT_RANK[cur] > IMPACT_RANK[best] ? cur : best
  , 'Low' as FixRoadmapItem['impact'])
}

function effortForUngrouped(f: Finding): FixRoadmapItem['effort'] {
  if (f.category === 'technical' && (f.id.startsWith('lh-') || f.id.includes('speed'))) return 'High'
  if ((f.affectedUrls?.length ?? 0) > 5) return 'High'
  if (f.severity === 'low') return 'Low'
  return 'Medium'
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildFixRoadmap(result: { findings: Finding[]; moneyLeaks: string[] }): FixRoadmapItem[] {
  const { findings, moneyLeaks } = result

  // Build a set of finding IDs that appear in moneyLeaks text (best-effort match)
  const moneyLeakIds = new Set<string>(
    findings
      .filter((f) => moneyLeaks.some((ml) => ml.toLowerCase().includes(f.title.toLowerCase().slice(0, 20))))
      .map((f) => f.id),
  )

  // ── Step 1: Score and classify every finding ──────────────────────────────
  type ScoredFinding = { finding: Finding; score: number; clusterKey: string | null }

  const scored: ScoredFinding[] = findings.map((f) => ({
    finding: f,
    score: findingScore(f, moneyLeakIds),
    clusterKey: ID_TO_CLUSTER.get(f.id) ?? null,
  }))

  // ── Step 2: Aggregate into clusters ───────────────────────────────────────
  const clusterBuckets = new Map<string, ScoredFinding[]>()
  const ungrouped: ScoredFinding[] = []

  for (const sf of scored) {
    if (sf.clusterKey) {
      if (!clusterBuckets.has(sf.clusterKey)) clusterBuckets.set(sf.clusterKey, [])
      clusterBuckets.get(sf.clusterKey)!.push(sf)
    } else {
      ungrouped.push(sf)
    }
  }

  // ── Step 3: Build cluster roadmap items ───────────────────────────────────
  const items: Array<{ item: Omit<FixRoadmapItem, 'priority'>; totalScore: number }> = []

  for (const cluster of CLUSTERS) {
    const bucket = clusterBuckets.get(cluster.clusterKey)
    if (!bucket || bucket.length === 0) continue

    const totalScore = bucket.reduce((s, sf) => s + sf.score, 0)
    const allUrls = Array.from(new Set(bucket.flatMap((sf) => sf.finding.affectedUrls ?? [])))
    const impact = highestImpact(bucket.map((sf) => toRoadmapImpact(sf.finding)))

    items.push({
      totalScore,
      item: {
        title: cluster.title,
        whyItMatters: cluster.whyItMatters,
        plainEnglishFix: cluster.plainEnglishFix,
        impact,
        effort: cluster.effort,
        category: cluster.category,
        affectedUrls: allUrls.length > 0 ? allUrls.slice(0, 5) : undefined,
        sourceFindingIds: bucket.map((sf) => sf.finding.id),
      },
    })
  }

  // ── Step 4: Add high-priority ungrouped findings as individual items ───────
  // Include only findings that scored high enough and won't bloat the roadmap
  const UNGROUPED_THRESHOLD = 10

  for (const sf of ungrouped) {
    if (sf.score < UNGROUPED_THRESHOLD) continue

    const f = sf.finding
    items.push({
      totalScore: sf.score,
      item: {
        title: f.title,
        whyItMatters: f.whyItMatters,
        plainEnglishFix: f.recommendation,
        impact: toRoadmapImpact(f),
        effort: effortForUngrouped(f),
        category: f.category,
        affectedUrls: f.affectedUrls?.slice(0, 5),
        sourceFindingIds: [f.id],
      },
    })
  }

  // ── Step 5: Sort by total score desc, cap at 10, assign priority ──────────
  items.sort((a, b) => b.totalScore - a.totalScore)
  const top10 = items.slice(0, 10)

  return top10.map((entry, idx) => ({ priority: idx + 1, ...entry.item }))
}
