/**
 * Site Blueprint generator — v2.
 *
 * Improvements over v1:
 *   - Industry detection (HVAC, plumbing, roofing, dental, etc.) beyond the
 *     coarse BusinessType — drives correct schema, palette, keywords, FAQ topics
 *   - Keyword targets per page (primary keyword the page should rank for)
 *   - Keyword-first H1 and meta title patterns (not brand-name-first)
 *   - Fake placeholder hours replaced with explicit [INSERT] markers
 *   - Industry-specific design palette and style direction
 *   - GBP rating surfaced as a design directive when strong (≥ 4.5★)
 *   - Performance preservation warning when Lighthouse score is high
 *   - FAQ page suggestion with industry-specific topic ideas
 *   - "Rebuild from scratch" only when design score is genuinely low
 */

import type { AuditResult, DesignSignals, LighthouseMetrics } from '../types/audit'
import { format } from 'date-fns'

// ─── Industry detection ───────────────────────────────────────────────────────

type Industry =
  | 'hvac'
  | 'plumbing'
  | 'roofing'
  | 'electrical'
  | 'restaurant'
  | 'salon'
  | 'dental'
  | 'auto_shop'
  | 'contractor'
  | 'other'

function detectIndustry(result: AuditResult): Industry {
  const signals = [
    result.gbpCheck?.businessName ?? '',
    result.domain,
    result.pages.flatMap((p) => p.h1s).join(' '),
  ].join(' ').toLowerCase()

  if (/hvac|air.?condition|heating.*cool|cool.*heat|furnace|ac repair|heat pump/.test(signals)) return 'hvac'
  if (/plumb|drain|pipe|sewer|water.?heat|rooter/.test(signals)) return 'plumbing'
  if (/roof|shingle|gutter|siding/.test(signals)) return 'roofing'
  if (/electric|wiring|panel|circuit|sparky/.test(signals)) return 'electrical'
  if (/restaur|pizza|burger|café|cafe|bistro|diner|sushi|taco|bbq|eatery/.test(signals)) return 'restaurant'
  if (/salon|hair|nail|barber|beauty|spa|blowout/.test(signals)) return 'salon'
  if (/dent|ortho|smile|tooth|teeth|endodont/.test(signals)) return 'dental'
  if (/auto|car.?repair|mechanic|oil.?change|tire|brake/.test(signals)) return 'auto_shop'

  const typeMap: Record<string, Industry> = {
    roofer: 'roofing', contractor: 'contractor', dentist: 'dental',
    salon: 'salon', restaurant: 'restaurant', auto_shop: 'auto_shop',
  }
  return typeMap[result.detectedBusinessType] ?? 'other'
}

// ─── Industry metadata ────────────────────────────────────────────────────────

function getIndustryLabel(industry: Industry): string {
  const map: Record<Industry, string> = {
    hvac: 'HVAC & Air Conditioning', plumbing: 'Plumbing', roofing: 'Roofing',
    electrical: 'Electrical', restaurant: 'Restaurant', salon: 'Salon & Beauty',
    dental: 'Dental', auto_shop: 'Auto Repair', contractor: 'Contractor', other: 'Local Business',
  }
  return map[industry]
}

function getIndustrySchema(industry: Industry): string {
  const map: Record<Industry, string> = {
    hvac: 'HVACBusiness', plumbing: 'Plumber', roofing: 'RoofingContractor',
    electrical: 'Electrician', restaurant: 'Restaurant', salon: 'BeautySalon',
    dental: 'Dentist', auto_shop: 'AutoRepair', contractor: 'GeneralContractor',
    other: 'LocalBusiness',
  }
  return map[industry]
}

interface DesignPalette {
  primary: string
  accent: string
  backgrounds: string
  styleNote: string
  emergencyBadge: boolean
}

function getIndustryPalette(industry: Industry): DesignPalette {
  const palettes: Record<Industry, DesignPalette> = {
    hvac: {
      primary: '#1B6CA8  (cool blue — air conditioning)',
      accent: '#E8670A  (warm orange — heating)',
      backgrounds: 'Light gray or white sections; dark navy header and footer',
      styleNote: 'Split visual palette: blue side for AC/cooling services, orange/warm side for heating. "24/7 Emergency Service" badge in header. Seasonal CTAs (summer AC, winter heating).',
      emergencyBadge: true,
    },
    plumbing: {
      primary: '#1A5276  (navy blue — trust, water)',
      accent: '#F39C12  (amber — urgency, emergency)',
      backgrounds: 'White and light blue content areas; dark navy footer',
      styleNote: '"Emergency 24/7" badge prominent in header. License and insurance numbers visible. Before/after drain/pipe photos.',
      emergencyBadge: true,
    },
    roofing: {
      primary: '#2D3E50  (slate — durability, professionalism)',
      accent: '#E74C3C  (red — urgency for storm damage CTAs)',
      backgrounds: 'White content areas; charcoal header and footer',
      styleNote: 'Bold masculine design. Before/after project photo gallery prominent. "Free Estimate" CTA above fold. Warranty messaging.',
      emergencyBadge: false,
    },
    electrical: {
      primary: '#1A1A2E  (near-black — authority)',
      accent: '#F1C40F  (electric yellow — brand recognition)',
      backgrounds: 'Dark header with yellow accents; white body sections',
      styleNote: 'High-contrast design. Safety and certification messaging. License number in header. "No job too small" messaging.',
      emergencyBadge: true,
    },
    restaurant: {
      primary: '#C0392B  (warm red — appetite, energy)',
      accent: '#F39C12  (gold — premium feel)',
      backgrounds: 'Deep warm backgrounds for evening dining; bright white for casual',
      styleNote: 'Hero with professional food photography. Menu prominent. Reservation/order online CTA above fold.',
      emergencyBadge: false,
    },
    salon: {
      primary: '#8E44AD  (purple — luxury) or #E91E63 (pink — beauty)',
      accent: '#F8BBD9  (soft pink)',
      backgrounds: 'Clean white or very light blush; elegant typography',
      styleNote: 'Gallery-heavy: before/after transformations. Online booking CTA prominent. Stylist profiles with photos.',
      emergencyBadge: false,
    },
    dental: {
      primary: '#2196F3  (clean blue — clinical trust)',
      accent: '#4CAF50  (green — health, calm)',
      backgrounds: 'Clean clinical white with blue accents',
      styleNote: 'Calm, trustworthy design. Emphasize "gentle" and "pain-free" messaging. Before/after smile gallery. Insurance accepted prominently displayed.',
      emergencyBadge: false,
    },
    auto_shop: {
      primary: '#D32F2F  (red — automotive energy)',
      accent: '#212121  (near-black — precision)',
      backgrounds: 'Dark header and footer; white/light gray content',
      styleNote: 'Bold industrial fonts. Service menu with turnaround times. "While you wait" convenience. Coupon/discount section.',
      emergencyBadge: false,
    },
    contractor: {
      primary: '#1565C0  (professional blue)',
      accent: '#FF8F00  (amber — construction energy)',
      backgrounds: 'White content areas; dark professional header and footer',
      styleNote: 'Project portfolio gallery prominent. License and insurance trust bar. Free estimate CTA.',
      emergencyBadge: false,
    },
    other: {
      primary: '#1565C0  (professional blue)',
      accent: '#FF8F00  (amber — CTAs)',
      backgrounds: 'Clean white with colored accents; dark footer',
      styleNote: 'Professional, trust-focused. Prominent CTA. Clear service description above fold.',
      emergencyBadge: false,
    },
  }
  return palettes[industry]
}

function getIndustryFaqTopics(industry: Industry, city: string): string[] {
  const map: Record<Industry, string[]> = {
    hvac: [
      `How often should I service my AC in ${city}?`,
      `What size AC unit do I need for my home?`,
      `Why is my air conditioner blowing warm air?`,
      `How long does an HVAC system last?`,
      `Should I repair or replace my AC unit?`,
      `What's the best thermostat setting for summer in ${city}?`,
      `How much does AC installation cost in ${city}?`,
    ],
    plumbing: [
      `What should I do if a pipe bursts?`,
      `How do I prevent drain clogs?`,
      `When should I replace my water heater?`,
      `What are signs of a sewer line problem?`,
      `Why is my water pressure low?`,
      `How much does a plumber cost in ${city}?`,
    ],
    roofing: [
      `How long does a roof replacement take?`,
      `What roofing materials are best for ${city}'s climate?`,
      `Does homeowners insurance cover roof replacement?`,
      `How do I know if my roof needs replacing vs. repairs?`,
      `How long does a new roof last?`,
      `What is the average cost to replace a roof in ${city}?`,
    ],
    electrical: [
      `When does an electrical panel need to be upgraded?`,
      `What are signs of outdated or dangerous wiring?`,
      `How much does it cost to rewire a house in ${city}?`,
      `What causes circuit breakers to keep tripping?`,
      `Do I need a permit for electrical work in ${city}?`,
    ],
    restaurant: [
      `Do you take reservations?`,
      `Do you offer catering or private dining events?`,
      `Is parking available nearby?`,
      `Do you have vegetarian or gluten-free options?`,
      `What are your hours on weekends?`,
    ],
    salon: [
      `How do I book an appointment?`,
      `Do you offer color correction services?`,
      `What is your cancellation policy?`,
      `Do you offer bridal or special event styling?`,
      `How long does a typical appointment take?`,
    ],
    dental: [
      `Do you accept my insurance?`,
      `How often should I get a dental cleaning?`,
      `What should I do in a dental emergency?`,
      `How long does teeth whitening last?`,
      `Do you offer payment plans or financing?`,
      `Are you accepting new patients?`,
    ],
    auto_shop: [
      `How often should I change my oil?`,
      `What are signs my brakes need to be replaced?`,
      `How long does a typical repair take?`,
      `Do you offer warranties on parts and labor?`,
      `Can I wait at the shop while my car is being serviced?`,
    ],
    contractor: [
      `How long does the project take from start to finish?`,
      `Are you licensed and insured in ${city}?`,
      `Do you offer free estimates?`,
      `Do you handle permits?`,
      `What payment methods do you accept?`,
      `Do you offer financing?`,
    ],
    other: [
      `What areas do you serve near ${city}?`,
      `How do I request a quote?`,
      `What are your business hours?`,
      `Are you licensed and insured?`,
    ],
  }
  return map[industry]
}

// ─── Per-page keyword targets ─────────────────────────────────────────────────

function getPageKeywords(industry: Industry, city: string, state: string): Record<string, string> {
  const c = city.toLowerCase()
  const s = state.toLowerCase()

  const map: Record<Industry, Record<string, string>> = {
    hvac: {
      home: `hvac ${c} ${s}`,
      '/services/': `hvac services ${c}`,
      '/contact/': `hvac company ${c} ${s}`,
      '/about/': `hvac contractor ${c}`,
      '/ac-repair/': `ac repair ${c} ${s}`,
      '/ac-maintenance/': `ac tune up ${c}`,
      '/air-conditioning-installation/': `ac installation ${c} ${s}`,
      '/heating/': `heating services ${c}`,
      '/heating-repair/': `furnace repair ${c} ${s}`,
      '/heating-maintenance/': `furnace tune up ${c}`,
      '/heating-installation/': `furnace installation ${c} ${s}`,
      '/service-area/': `hvac company near ${c}`,
    },
    plumbing: {
      home: `plumber ${c} ${s}`,
      '/services/': `plumbing services ${c}`,
      '/contact/': `emergency plumber ${c}`,
      '/drain-cleaning/': `drain cleaning ${c} ${s}`,
      '/water-heater/': `water heater repair ${c}`,
      '/leak-repair/': `pipe leak repair ${c}`,
    },
    roofing: {
      home: `roofing contractor ${c} ${s}`,
      '/services/': `roofing services ${c}`,
      '/roof-replacement/': `roof replacement ${c} ${s}`,
      '/roof-repair/': `roof repair ${c}`,
      '/gutters/': `gutter installation ${c}`,
    },
    electrical: {
      home: `electrician ${c} ${s}`,
      '/panel-upgrade/': `electrical panel upgrade ${c}`,
      '/wiring/': `house rewiring ${c} ${s}`,
      '/ev-charger/': `ev charger installation ${c}`,
    },
    restaurant: {
      home: `restaurant ${c} ${s}`,
      '/menu/': `menu ${c} restaurant`,
      '/catering/': `catering ${c}`,
    },
    salon: {
      home: `hair salon ${c} ${s}`,
      '/services/': `hair services ${c}`,
      '/color/': `hair color ${c}`,
      '/booking/': `book hair appointment ${c}`,
    },
    dental: {
      home: `dentist ${c} ${s}`,
      '/services/': `dental services ${c}`,
      '/teeth-whitening/': `teeth whitening ${c}`,
      '/emergency/': `emergency dentist ${c}`,
    },
    auto_shop: {
      home: `auto repair ${c} ${s}`,
      '/oil-change/': `oil change ${c}`,
      '/brake-repair/': `brake repair ${c} ${s}`,
      '/transmission/': `transmission repair ${c}`,
    },
    contractor: {
      home: `contractor ${c} ${s}`,
      '/services/': `construction services ${c}`,
      '/remodeling/': `home remodeling ${c}`,
    },
    other: {
      home: `${c} local business`,
      '/services/': `services ${c}`,
      '/contact/': `contact ${c}`,
    },
  }
  return map[industry] ?? map.other
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function buildSiteBlueprint(result: AuditResult, design?: DesignSignals): string {
  const industry = detectIndustry(result)
  const gbp = result.gbpCheck
  const city = gbp?.address?.split(',')[1]?.trim() ?? 'Your City'
  const state = gbp?.address?.split(',')[2]?.split(' ')[1]?.trim() ?? 'ST'
  const lh = result.lighthouse?.[0]

  const ctx: BlueprintCtx = { result, industry, design, gbp, city, state, lh }

  const sections: string[] = [
    buildHeader(ctx),
    buildExecutiveSummary(ctx),
    buildBusinessProfile(ctx),
    buildScoreBreakdown(ctx),
    buildPageArchitecture(ctx),
    buildLocalSeoImplementation(ctx),
    buildDesignRequirements(ctx),
    buildContentRequirements(ctx),
    buildCompetitorGaps(ctx),
    buildTechnicalChecklist(ctx),
    buildQuickWins(ctx),
    buildAiBuildPrompt(ctx),
  ]

  return sections.filter(Boolean).join('\n\n---\n\n')
}

// ─── Shared context ───────────────────────────────────────────────────────────

interface BlueprintCtx {
  result: AuditResult
  industry: Industry
  design?: DesignSignals
  gbp: AuditResult['gbpCheck']
  city: string
  state: string
  lh?: LighthouseMetrics
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildHeader(ctx: BlueprintCtx): string {
  const { result, industry, gbp } = ctx
  const score = result.scores.overall.value
  const label = result.scores.overall.label
  const date = format(new Date(result.scannedAt), 'MMMM d, yyyy')
  const businessName = gbp?.businessName ?? titleCase(result.domain)
  const typeLabel = getIndustryLabel(industry)

  return [
    `# Site Blueprint — ${businessName}`,
    ``,
    `**Domain:** ${result.domain} | **Type:** ${typeLabel} | **Scanned:** ${date}`,
    `**Current Score:** ${score}/100 — ${label}`,
    ``,
    `> This blueprint captures every weakness, gap, and opportunity found in the current site.`,
    `> Use it as a complete brief for rebuilding — paste the AI Build Prompt at the bottom into`,
    `> Claude, Cursor, or ChatGPT to generate the new site from scratch.`,
  ].join('\n')
}

function buildExecutiveSummary(ctx: BlueprintCtx): string {
  const { result, gbp } = ctx
  const lines: string[] = ['## Why This Site Isn\'t Ranking']
  const ri = result.revenueImpact

  if (ri) {
    const low = ri.estimatedLeadLossRange.low
    const high = ri.estimatedLeadLossRange.high
    lines.push(`Estimated **${low}–${high} leads lost per month** due to the issues below.`)
    if (ri.estimatedRevenueLossRange && ri.estimatedRevenueLossRange.high > 0) {
      const sym = ri.currencySymbol ?? '$'
      const rLow = ri.estimatedRevenueLossRange.low
      const rHigh = ri.estimatedRevenueLossRange.high
      // Only show if range is meaningful (high / low ratio < 8x)
      if (rHigh / Math.max(rLow, 1) < 8) {
        lines.push(`Estimated revenue gap: **${sym}${rLow.toLocaleString()}–${sym}${rHigh.toLocaleString()}/month**.`)
      }
    }
    lines.push(``)
  }

  // GBP rating callout — if strong, it's the main leverage point
  if (gbp?.found && gbp.rating !== undefined && gbp.rating >= 4.5 && (gbp.reviewCount ?? 0) >= 10) {
    lines.push(`**Key asset:** This business has a **${gbp.rating}★ Google rating from ${gbp.reviewCount} reviews** — exceptional social proof that the current site completely fails to leverage. The new site must put this front and centre.`)
    lines.push(``)
  }

  const high = result.findings.filter((f) => f.severity === 'high')
  const medium = result.findings.filter((f) => f.severity === 'medium')
  lines.push(`**${high.length} critical** and **${medium.length} medium** issues found across ${result.pages.length} pages.`)
  lines.push(``)

  const categories = ['localSeo', 'technical', 'conversion', 'content', 'trust'] as const
  for (const cat of categories) {
    const findings = result.findings.filter((f) => f.category === cat && f.severity !== 'low')
    if (findings.length === 0) continue
    lines.push(`**${catLabel(cat)}:** ${findings.map((f) => f.title).join(' · ')}`)
  }

  return lines.join('\n')
}

function buildBusinessProfile(ctx: BlueprintCtx): string {
  const { result, industry, gbp } = ctx
  const lines: string[] = ['## Business Profile']
  const businessName = gbp?.businessName ?? titleCase(result.domain)
  const home = result.pages.find((p) => p.pageType === 'home') ?? result.pages[0]
  const phone = gbp?.phone ?? home?.phones[0] ?? '[INSERT PHONE]'

  const rows: [string, string][] = [
    ['Business Name', businessName],
    ['Industry', getIndustryLabel(industry)],
    ['Schema Type', getIndustrySchema(industry)],
    ['Website', result.domain],
    ['Phone', phone],
  ]

  if (gbp?.address) rows.push(['Address', gbp.address])

  if (gbp) {
    const status = gbp.found
      ? `✓ Verified — ${gbp.businessName}`
      : gbp.apiQueried ? '✗ Not found in Google Maps' : '? Not checked (no API key)'
    rows.push(['Google Business Profile', status])
    if (gbp.found && gbp.rating !== undefined) {
      rows.push(['GBP Rating', `**${gbp.rating}★ (${gbp.reviewCount ?? 0} reviews)** ← use this in the hero`])
    }
    if (gbp.found && gbp.businessStatus) rows.push(['GBP Status', gbp.businessStatus])
  }

  const servicePages = result.pages.filter((p) => p.pageType === 'service')
  if (servicePages.length > 0) {
    rows.push(['Service Pages Found', servicePages.map((p) => extractSlug(p.url)).join(', ')])
  }

  lines.push(tableFromRows(rows))
  return lines.join('\n')
}

function buildScoreBreakdown(ctx: BlueprintCtx): string {
  const { result } = ctx
  const lines: string[] = ['## Score Breakdown — What\'s Dragging You Down']
  const weights: Record<string, string> = {
    localSeo: '30%', technical: '25%', conversion: '25%', content: '10%', trust: '10%',
  }

  lines.push('| Category | Weight | Score | Label | Top Issues |')
  lines.push('|---|---|---|---|---|')

  for (const cat of ['localSeo', 'technical', 'conversion', 'content', 'trust'] as const) {
    const s = result.scores[cat]
    const topIssues = result.findings
      .filter((f) => f.category === cat && f.severity !== 'low')
      .slice(0, 2)
      .map((f) => f.title)
      .join(', ') || 'None'
    lines.push(`| ${catLabel(cat)} | ${weights[cat]} | ${s.value} | ${s.label} | ${topIssues} |`)
  }

  lines.push(``)
  lines.push(`**Overall: ${result.scores.overall.value}/100 — ${result.scores.overall.label}**`)

  if (result.scoreConfidence) {
    lines.push(`*Confidence: ${result.scoreConfidence.level} — ${result.scoreConfidence.reason}*`)
  }

  return lines.join('\n')
}

function buildPageArchitecture(ctx: BlueprintCtx): string {
  const { result, industry, city, state } = ctx
  const lines: string[] = ['## Page Architecture — What to Build']
  const existingTypes = new Set(result.pages.map((p) => p.pageType))
  const keywords = getPageKeywords(industry, city, state)
  const faqTopics = getIndustryFaqTopics(industry, city)

  const mark = (exists: boolean, slug: string, purpose: string) => {
    const kw = keywords[slug] ? ` *(target keyword: "${keywords[slug]}")*` : ''
    return exists
      ? `- [x] **${slug}** — ${purpose}${kw} *(exists — review against requirements)*`
      : `- [ ] **${slug}** — ${purpose}${kw} *(MISSING — build this)*`
  }

  let priority = 1

  lines.push(`### Priority ${priority++} — Core Pages`)
  lines.push(mark(existingTypes.has('home'), '/', 'Hero, services overview, trust bar, map embed, testimonials'))
  lines.push(mark(existingTypes.has('service'), '/services/', 'Master services list linking to sub-pages'))
  lines.push(mark(existingTypes.has('contact'), '/contact/', 'Contact form, NAP, hours, Google Maps embed'))
  lines.push(mark(existingTypes.has('about'), '/about/', 'Team, story, certifications, trust signals'))
  lines.push('')

  const servicePages = result.pages.filter((p) => p.pageType === 'service')
  if (servicePages.length > 0) {
    lines.push(`### Priority ${priority++} — Service Sub-Pages *(exist — need content review)*`)
    servicePages.forEach((p) => {
      const slug = `/${extractSlug(p.url)}/`
      const kw = keywords[slug] ?? ''
      lines.push(`- [x] **${slug}** — ${p.h1s[0] ?? extractSlug(p.url)}${kw ? `  *(target: "${kw}")*` : ''}`)
    })
    lines.push('')
  }

  if (result.seoOpportunities && result.seoOpportunities.length > 0) {
    lines.push(`### Priority ${priority++} — SEO Opportunity Pages *(not yet built)*`)
    result.seoOpportunities.slice(0, 6).forEach((opp) => {
      lines.push(`- [ ] **/${opp.suggestedPageSlug}/** — ${opp.title} (${opp.opportunityLevel} opportunity)`)
    })
    lines.push('')
  }

  const needsLocation = result.findings.some((f) => f.id === 'local-no-location-pages')
  if (needsLocation) {
    lines.push(`### Priority ${priority++} — Location / Service Area Page`)
    lines.push(`- [ ] **/service-area/** — Cities and zip codes served, embedded map  *(target: "${keywords.home?.replace(/ [a-z]{2}$/, ' near me') ?? 'near me'}")*`)
    lines.push('')
  }

  lines.push(`### Priority ${priority++} — FAQ Page *(high local SEO value — earns featured snippets)*`)
  lines.push(`- [ ] **/faq/** — Answers to the most common customer questions`)
  lines.push('  Suggested questions to answer:')
  faqTopics.slice(0, 5).forEach((q) => lines.push(`  - ${q}`))
  lines.push('')
  lines.push(`*Crawled ${result.pages.length} pages. [x] = exists but should be reviewed against requirements below.*`)

  return lines.join('\n')
}

function buildLocalSeoImplementation(ctx: BlueprintCtx): string {
  const { result, industry, gbp } = ctx
  const lines: string[] = ['## Local SEO Implementation']

  const businessName = gbp?.businessName ?? titleCase(result.domain)
  const phone = gbp?.phone ?? '[INSERT PHONE]'
  const address = gbp?.address ?? '[INSERT FULL ADDRESS]'
  const typeSchema = getIndustrySchema(industry)

  // NAP block
  lines.push('### NAP Block (paste into every page footer — must match GBP exactly)')
  lines.push('```html')
  lines.push(`<address class="nap">`)
  lines.push(`  <strong>${businessName}</strong><br>`)
  lines.push(`  ${address}<br>`)
  lines.push(`  <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a>`)
  lines.push(`</address>`)
  lines.push('```')

  // Schema
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': typeSchema,
    name: businessName,
    telephone: phone,
    url: `https://${result.domain}`,
  }
  if (gbp?.address) {
    const parts = gbp.address.split(',').map((s) => s.trim())
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: parts[0] ?? '',
      addressLocality: parts[1] ?? '',
      addressRegion: parts[2]?.split(' ')[0] ?? '',
      postalCode: parts[2]?.split(' ')[1] ?? '',
      addressCountry: 'US',
    }
  }
  if (gbp?.rating !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: gbp.rating,
      reviewCount: gbp.reviewCount ?? 0,
    }
  }

  lines.push('')
  lines.push('### LocalBusiness Schema (add to `<head>` on every page)')
  lines.push('```html')
  lines.push('<script type="application/ld+json">')
  lines.push(JSON.stringify(schema, null, 2))
  lines.push('</script>')
  lines.push('```')

  // Map embed
  if (gbp?.placeId) {
    lines.push('')
    lines.push('### Google Maps Embed (add to Home and Contact pages)')
    lines.push('```html')
    lines.push(`<iframe`)
    lines.push(`  src="https://www.google.com/maps/embed/v1/place?key=YOUR_MAPS_API_KEY&q=place_id:${gbp.placeId}"`)
    lines.push(`  width="100%" height="400" style="border:0;" allowfullscreen loading="lazy"`)
    lines.push(`  title="${businessName} location map">`)
    lines.push(`</iframe>`)
    lines.push('```')
    lines.push('> Replace `YOUR_MAPS_API_KEY` with your Google Maps Embed API key (free tier is sufficient).')
  }

  // Review link
  if (gbp?.placeId) {
    lines.push('')
    lines.push('### Google Review Link')
    lines.push(`\`https://search.google.com/local/writereview?placeid=${gbp.placeId}\``)
    lines.push('> Add a "Leave us a Google review" button using this URL on the home page, thank-you pages, and post-service emails.')
  }

  // Hours — never invent placeholder times
  const missingHours = result.findings.some((f) => f.id === 'local-no-hours')
  if (missingHours) {
    lines.push('')
    lines.push('### Business Hours *(currently missing from the site — add these)*')
    lines.push('> **⚠ Insert your real hours below — do not leave placeholder times.**')
    lines.push('> Check your Google Business Profile for the hours you have listed there and match them exactly.')
    lines.push('```html')
    lines.push('<div class="business-hours">')
    lines.push('  <h3>Hours of Operation</h3>')
    lines.push('  <p>Monday–Friday: [INSERT HOURS]</p>')
    lines.push('  <p>Saturday: [INSERT HOURS or "Closed"]</p>')
    lines.push('  <p>Sunday: [INSERT HOURS or "Emergency service only"]</p>')
    lines.push('</div>')
    lines.push('<!-- Add to schema: "openingHours": ["Mo-Fr HH:MM-HH:MM", "Sa HH:MM-HH:MM"] -->')
    lines.push('```')
  }

  return lines.join('\n')
}

function buildDesignRequirements(ctx: BlueprintCtx): string {
  const { result, industry, design, gbp, lh } = ctx
  const lines: string[] = ['## Design Requirements']
  const palette = getIndustryPalette(industry)

  // Design analysis summary
  if (design) {
    const isActuallyModern = design.designScore >= 75
    const rebuildAdvice = isActuallyModern
      ? `The technical implementation is solid — focus on layout and conversion improvements rather than a full rebuild.`
      : `The design is dated and should be rebuilt from scratch.`

    lines.push(`**Current design:** ${eraLabel(design.designEra)} — score ${design.designScore}/100`)
    lines.push(`**Framework:** ${frameworkLabel(design.frameworkHint)}`)
    lines.push(`**Assessment:** ${rebuildAdvice}`)
    lines.push('')

    if (design.issues.length > 0) {
      lines.push('### Design Weaknesses Found')
      design.issues.forEach((i) => lines.push(`- ${i}`))
      lines.push('')
    }
    if (design.strengths.length > 0) {
      lines.push('### Design Strengths (keep these)')
      design.strengths.forEach((s) => lines.push(`- ${s}`))
      lines.push('')
    }
  }

  // GBP rating as design directive
  if (gbp?.found && gbp.rating !== undefined && gbp.rating >= 4.5 && (gbp.reviewCount ?? 0) >= 10) {
    lines.push(`### ★ Lead With Social Proof`)
    lines.push(`This business has **${gbp.rating} stars from ${gbp.reviewCount} Google reviews**. That number belongs in the hero section — not buried, not just in the footer. Treating this as decoration is a missed conversion opportunity.`)
    lines.push(`- Display the star rating and review count in the hero or immediately below it`)
    lines.push(`- Add a Google reviews widget or manually curated quotes with star ratings`)
    lines.push(`- Use the review count in CTA copy: "Join ${gbp.reviewCount}+ happy customers — Call now"`)
    lines.push('')
  }

  // Lighthouse performance warning
  if (lh && lh.performanceScore >= 80) {
    lines.push(`### ⚡ Performance Preservation Warning`)
    lines.push(`The current site scores **${lh.performanceScore}/100 on Lighthouse performance** — that is exceptionally fast. A naive rebuild (especially in a heavy WordPress theme or page builder) will destroy this. The new site must match or beat it.`)
    lines.push(`- Use a lightweight theme or build custom HTML/CSS`)
    lines.push(`- Avoid page builders (Elementor, Divi, WPBakery) unless performance is rigorously tested`)
    lines.push(`- Defer all non-critical JS; inline critical CSS`)
    lines.push(`- Target: LCP < 2.5s, CLS < 0.1, FID < 100ms`)
    lines.push('')
  }

  // Industry-specific palette
  lines.push('### Color Palette & Style Direction')
  lines.push(`**Primary color:** ${palette.primary}`)
  lines.push(`**Accent / CTA color:** ${palette.accent}`)
  lines.push(`**Backgrounds:** ${palette.backgrounds}`)
  lines.push(`**Style notes:** ${palette.styleNote}`)
  if (palette.emergencyBadge) {
    lines.push(`**Emergency badge:** Add a "24/7 Emergency Service" badge in the header — this industry expects it.`)
  }
  lines.push('')

  // Universal layout requirements
  lines.push('### Page Layout Requirements')
  lines.push('')
  lines.push('**Above the fold (first viewport — most important):**')
  lines.push('- H1 that leads with what you do and where — not the business name')
  lines.push('- Phone number clickable in the header at all times')
  lines.push('- Primary CTA button (contrasting color, high contrast text)')
  if (gbp?.found && gbp.rating !== undefined) {
    lines.push(`- Star rating display: "${gbp.rating}★ rated on Google"`)
  }
  lines.push('')
  lines.push('**Home page section order:**')
  lines.push('1. Sticky navigation — logo left, phone + CTA right')
  lines.push('2. Hero — H1, sub-headline, CTA, phone, star rating')
  lines.push('3. Trust bar — years in business · licensed & insured · service area · certifications')
  lines.push('4. Services grid — cards with icons linking to service sub-pages')
  lines.push('5. Why choose us — differentiators (not generic, be specific)')
  lines.push('6. Testimonials — real quotes with star ratings and reviewer name')
  lines.push('7. Google Maps embed')
  lines.push('8. Footer — full NAP, hours, quick links, copyright, review link')
  lines.push('')
  lines.push('**Typography:**')
  lines.push('- 2 fonts maximum: bold display font for headings, clean sans-serif for body')
  lines.push('- Body text minimum 16px — never smaller')
  lines.push('- Headings: clear hierarchy H1 > H2 > H3, never skip levels')
  lines.push('')
  lines.push('**Avoid:**')
  lines.push('- Stock photo overuse (use real photos of the business/team/work whenever possible)')
  lines.push('- More than 3 colors in the palette')
  lines.push('- Full-width text blocks with no visual breaks')
  lines.push('- Any font below 14px anywhere')

  return lines.join('\n')
}

function buildContentRequirements(ctx: BlueprintCtx): string {
  const { result, industry, gbp, city, state } = ctx
  const lines: string[] = ['## Content Requirements Per Page']

  const businessName = gbp?.businessName ?? titleCase(result.domain)
  const phone = gbp?.phone ?? '[INSERT PHONE]'
  const typeLabel = getIndustryLabel(industry)
  const schemaType = getIndustrySchema(industry)
  const keywords = getPageKeywords(industry, city, state)
  const shortName = deriveShortName(businessName)

  // Home
  const homeKw = keywords.home ?? `${typeLabel.toLowerCase()} ${city.toLowerCase()}`
  lines.push('### Home Page (`/`)')
  lines.push(`- **Primary keyword:** "${homeKw}"`)
  lines.push(`- **H1 (keyword-first):** "${toTitleCase(homeKw)} — ${shortName}"`)
  lines.push(`- **Sub-headline:** "[Your key differentiator — e.g., 'Same-day service · ${gbp?.rating ?? '5'}★ rated · Serving ${city} since [YEAR]']"`)
  lines.push(`- **Meta title (≤60 chars):** "${toTitleCase(homeKw)} | ${shortName}"`)
  lines.push(`- **Meta description:** "Expert ${typeLabel.toLowerCase()} in ${city}${gbp?.rating !== undefined ? `. ${gbp.rating}★ rated (${gbp.reviewCount} reviews)` : ''}. [KEY DIFFERENTIATOR]. Call ${phone}."`)
  lines.push(`- **Target word count:** 800–1,200 words`)
  lines.push(`- **Schema:** LocalBusiness + ${schemaType}`)
  lines.push(`- **Must include:** Hero, services grid, star rating display, testimonials, map, NAP`)
  lines.push('')

  // Contact
  lines.push('### Contact Page (`/contact/`)')
  lines.push(`- **Primary keyword:** "${keywords['/contact/'] ?? `${typeLabel.toLowerCase()} ${city.toLowerCase()}`}"`)
  lines.push(`- **H1:** "Contact ${shortName} — ${city}, ${state}"`)
  lines.push(`- **Meta title:** "Contact Us | ${shortName} — ${city}, ${state}"`)
  lines.push(`- **Must include:** Contact form (name, phone, service needed, message), NAP, hours, Google Map embed`)
  lines.push(`- **Schema:** LocalBusiness with openingHours`)
  lines.push('')

  // About
  lines.push('### About Page (`/about/`)')
  lines.push(`- **H1:** "About ${shortName} — ${typeLabel} in ${city}, ${state}"`)
  lines.push(`- **Meta title:** "About Us | ${shortName} | ${city} ${typeLabel}"`)
  lines.push(`- **Must include:** Founding story, team photos, years in business, licenses/certifications, why you do what you do`)
  lines.push(`- **Target word count:** 400–700 words`)
  lines.push('')

  // Service pages
  lines.push('### Service Sub-Pages (`/[service-name]/`)')
  lines.push(`- **H1 pattern (keyword-first):** "[Service Name] in ${city}, ${state} | ${shortName}"`)
  lines.push(`  - Example: "AC Repair in ${city}, ${state} | ${shortName}"`)
  lines.push(`  - NOT: "${businessName} — AC Repair Services" (brand-first is wasted H1 real estate)`)
  lines.push(`- **Meta title (≤60 chars):** "[Service] ${city} ${state} | ${shortName}"`)
  lines.push(`- **Target word count:** 500–900 words per page`)
  lines.push(`- **Structure per page:**`)
  lines.push(`  1. What is this service and who needs it?`)
  lines.push(`  2. Signs you need this service`)
  lines.push(`  3. Our process / what to expect`)
  lines.push(`  4. Why choose ${shortName}`)
  lines.push(`  5. FAQ (3–5 questions)`)
  lines.push(`  6. CTA — phone + contact form link`)
  lines.push(`- **Schema:** Service schema with "provider" linking to ${schemaType}`)
  lines.push(`- **Internal links:** Every service page links to /contact/ and /services/`)
  lines.push('')

  // FAQ
  const faqTopics = getIndustryFaqTopics(industry, city)
  lines.push('### FAQ Page (`/faq/`)')
  lines.push(`- **H1:** "Frequently Asked Questions — ${shortName} ${city}, ${state}"`)
  lines.push(`- **Meta title:** "${typeLabel} FAQ | ${shortName} | ${city}"`)
  lines.push(`- **Schema:** FAQPage (each Q&A gets Question + Answer schema — earns featured snippets)`)
  lines.push(`- **Suggested questions:`)
  faqTopics.forEach((q) => lines.push(`  - ${q}`))
  lines.push('')

  // Location page if needed
  const needsLocation = result.findings.some((f) => f.id === 'local-no-location-pages')
  if (needsLocation) {
    lines.push('### Service Area Page (`/service-area/`)')
    lines.push(`- **H1:** "${typeLabel} Services in ${city} and Surrounding Areas"`)
    lines.push(`- **Target word count:** 400–700 words`)
    lines.push(`- **Must include:** List of cities/zip codes served, embedded map, 1–2 sentences per area served`)
    lines.push(`- **Schema:** LocalBusiness with areaServed`)
    lines.push('')
  }

  return lines.join('\n')
}

function buildCompetitorGaps(ctx: BlueprintCtx): string {
  const { result } = ctx
  if (!result.competitor || result.competitor.gaps.length === 0) return ''

  const lines: string[] = [`## Competitor Gaps to Close`]
  lines.push(`*Based on analysis of ${result.competitor.competitors.length} competitor site(s).*`)
  lines.push('')

  result.competitor.gaps.forEach((gap, i) => {
    lines.push(`### ${i + 1}. ${gap.title}`)
    lines.push(gap.description)
    lines.push(`**Competitors that have this:** ${gap.competitorDomains.join(', ')}`)
    lines.push(`**Fix:** ${gap.recommendation}`)
    lines.push('')
  })

  return lines.join('\n')
}

function buildTechnicalChecklist(ctx: BlueprintCtx): string {
  const { result, lh, industry, city, state } = ctx
  const lines: string[] = ['## Technical Checklist']

  // Detect SSL from page URLs
  const isHttps = result.pages.some((p) => p.url.startsWith('https://'))

  const techFindings = result.findings.filter((f) => f.category === 'technical')
  const hasRobots = !result.findings.some((f) => f.id === 'technical-no-robots')
  const hasSitemap = !result.findings.some((f) => f.id === 'technical-no-sitemap')

  lines.push('### Must Have')
  lines.push(`- [x] Responsive design (mobile-first)`)
  lines.push(`- [${isHttps ? 'x' : ' '}] SSL certificate (HTTPS)${isHttps ? '' : ' ← **CRITICAL — get this first**'}`)
  lines.push(`- [${hasRobots ? 'x' : ' '}] robots.txt`)
  lines.push(`- [${hasSitemap ? 'x' : ' '}] XML sitemap`)
  lines.push(`- [ ] Google Analytics 4`)
  lines.push(`- [ ] Google Search Console verified`)
  lines.push(`- [ ] Core Web Vitals passing (check: pagespeed.web.dev)`)
  lines.push('')

  if (lh && lh.performanceScore >= 80) {
    lines.push(`### ⚡ Performance Baseline to Match`)
    lines.push(`The current site scores **${lh.performanceScore}/100 Lighthouse performance**. The new build must match or beat this.`)
    lines.push(`| Metric | Current | Target |`)
    lines.push(`|---|---|---|`)
    lines.push(`| Performance | **${lh.performanceScore}** | ≥ ${lh.performanceScore} |`)
    lines.push(`| SEO | **${lh.seoScore}** | ≥ ${lh.seoScore} |`)
    lines.push(`| Accessibility | **${lh.accessibilityScore}** | ≥ 85 |`)
    if (lh.largestContentfulPaint) lines.push(`| LCP | ${(lh.largestContentfulPaint / 1000).toFixed(1)}s | < 2.5s |`)
    lines.push('')
  } else if (lh) {
    lines.push('### Lighthouse Scores (targets for the new site)')
    lines.push(`| Metric | Current | Target |`)
    lines.push(`|---|---|---|`)
    lines.push(`| Performance | ${lh.performanceScore} | > 70 |`)
    lines.push(`| SEO | ${lh.seoScore} | > 90 |`)
    lines.push(`| Accessibility | ${lh.accessibilityScore} | > 85 |`)
    lines.push('')
  }

  if (techFindings.length > 0) {
    lines.push('### Technical Issues to Fix in Rebuild')
    techFindings.forEach((f) => {
      lines.push(`- [ ] **${f.title}** — ${localizeExample(f.recommendation, industry, city, state)}`)
    })
    lines.push('')
  }

  lines.push('### Per-Page Requirements')
  lines.push('- [ ] Exactly one H1 per page — never skip, never duplicate')
  lines.push('- [ ] Unique meta title (50–60 chars) and meta description (150–160 chars) on every page')
  lines.push('- [ ] Alt text on every image — include service + city where relevant')
  lines.push('- [ ] No broken internal links')
  lines.push('- [ ] width and height attributes on all images (prevents CLS)')
  lines.push('- [ ] Lazy load all below-fold images')
  lines.push('- [ ] Canonical tag on any paginated or duplicate content')
  lines.push('- [ ] Open Graph tags for social sharing')
  lines.push('- [ ] Favicon (all sizes: 16, 32, 180px)')

  return lines.join('\n')
}

function buildQuickWins(ctx: BlueprintCtx): string {
  const { result } = ctx
  const lines: string[] = ['## Quick Win Checklist']
  lines.push('*Do these on the EXISTING site immediately — don\'t wait for the rebuild.*')
  lines.push('')

  if (result.roadmap && result.roadmap.length > 0) {
    result.roadmap.slice(0, 8).forEach((item) => {
      lines.push(`### ${item.priority}. ${item.title}`)
      lines.push(`**Impact:** ${item.impact} | **Effort:** ${item.effort} | **Category:** ${catLabel(item.category)}`)
      lines.push(item.plainEnglishFix)
      lines.push('')
    })
  } else {
    result.quickWins.forEach((win, i) => lines.push(`${i + 1}. ${win}`))
  }

  return lines.join('\n')
}

function buildAiBuildPrompt(ctx: BlueprintCtx): string {
  const { result, industry, design, gbp, city, state, lh } = ctx
  const lines: string[] = [
    '## AI Build Prompt',
    '',
    '> **Copy from the line below and paste directly into Claude, Cursor, or ChatGPT.**',
    '',
    '---',
    '',
  ]

  const businessName = gbp?.businessName ?? titleCase(result.domain)
  const shortName = deriveShortName(businessName)
  const phone = gbp?.phone ?? '[INSERT PHONE]'
  const address = gbp?.address ?? '[INSERT ADDRESS]'
  const typeLabel = getIndustryLabel(industry)
  const schemaType = getIndustrySchema(industry)
  const palette = getIndustryPalette(industry)
  const keywords = getPageKeywords(industry, city, state)
  const faqTopics = getIndustryFaqTopics(industry, city)
  const homeKw = keywords.home ?? `${typeLabel.toLowerCase()} ${city.toLowerCase()}`
  const homeH1 = toTitleCase(homeKw) + ` — ${shortName}`

  const ratingLine = (gbp?.found && gbp.rating !== undefined && (gbp.reviewCount ?? 0) >= 5)
    ? `Google Rating: ${gbp.rating}★ (${gbp.reviewCount} verified reviews) — display prominently in hero`
    : ''

  const performanceWarning = (lh && lh.performanceScore >= 80)
    ? `⚡ PERFORMANCE WARNING: Current site scores ${lh.performanceScore}/100 Lighthouse. New build must match or beat this. Use lightweight code — no heavy page builders.`
    : ''

  const servicePages = result.pages.filter((p) => p.pageType === 'service')
  const serviceList = servicePages.slice(0, 10)
    .map((p) => {
      const slug = `/${extractSlug(p.url)}/`
      const kw = keywords[slug] ?? ''
      return `  - ${p.h1s[0] ?? extractSlug(p.url)} (${p.url})${kw ? `  → target keyword: "${kw}"` : ''}`
    }).join('\n')

  const topFindings = result.findings
    .filter((f) => f.severity !== 'low')
    .slice(0, 12)
    .map((f) => `  - [${catLabel(f.category)}] ${f.title}: ${localizeExample(f.recommendation, industry, city, state)}`)
    .join('\n')

  const gapList = result.competitor?.gaps.slice(0, 4)
    .map((g) => `  - ${g.title}: ${g.recommendation}`)
    .join('\n') ?? ''

  const oppList = result.seoOpportunities?.slice(0, 5)
    .map((o) => {
      const kw = keywords[`/${o.suggestedPageSlug}/`] ?? ''
      return `  - /${o.suggestedPageSlug}/ — ${o.title}${kw ? ` (target: "${kw}")` : ''}`
    }).join('\n') ?? ''

  const prompt = [
    `You are a professional web developer and local SEO specialist. Build a complete,`,
    `production-ready local business website. Prioritize local SEO, conversion rate,`,
    `page speed, and a modern design that builds trust immediately above the fold.`,
    ``,
    `═══════════════════════════════════════════════`,
    `BUSINESS INFORMATION`,
    `═══════════════════════════════════════════════`,
    `Business Name: ${businessName}`,
    `Short name to use in headings/CTAs: ${shortName}`,
    `Industry: ${typeLabel}`,
    `Schema type: ${schemaType}`,
    `Website: ${result.domain}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
    `City/State: ${city}, ${state}`,
    ratingLine,
    gbp?.placeId ? `Google Place ID: ${gbp.placeId}` : '',
    performanceWarning,
    ``,
    `═══════════════════════════════════════════════`,
    `PAGES TO BUILD`,
    `═══════════════════════════════════════════════`,
    ``,
    `1. Home (/)`,
    `   H1: "${homeH1}"`,
    `   Target keyword: "${homeKw}"`,
    `   Sections: sticky nav, hero with H1+CTA+phone${ratingLine ? '+star rating' : ''}, trust bar, services grid, why-choose-us, testimonials, map embed, footer NAP`,
    ``,
    `2. Services (/services/)`,
    `   H1: "${typeLabel} Services in ${city}, ${state} | ${shortName}"`,
    `   Target keyword: "${keywords['/services/'] ?? `${typeLabel.toLowerCase()} services ${city.toLowerCase()}`}"`,
    ``,
    `3. Contact (/contact/)`,
    `   H1: "Contact ${shortName} — ${city}, ${state}"`,
    `   Target keyword: "${keywords['/contact/'] ?? `contact ${typeLabel.toLowerCase()} ${city.toLowerCase()}`}"`,
    `   Must include: contact form (name, phone, service, message), NAP, hours [INSERT ACTUAL HOURS], Google Maps embed`,
    ``,
    `4. About (/about/)`,
    `   H1: "About ${shortName} | ${typeLabel} in ${city}, ${state}"`,
    `   Must include: founding story, team photos, years in business, certifications`,
    ``,
    `5. FAQ (/faq/)`,
    `   H1: "Frequently Asked Questions — ${shortName}"`,
    `   Schema: FAQPage`,
    `   Questions to answer:`,
    faqTopics.map((q) => `   - ${q}`).join('\n'),
    ``,
    serviceList ? `Existing service pages to recreate with improved content:\n${serviceList}` : '',
    oppList ? `\nNew opportunity pages to build:\n${oppList}` : '',
    ``,
    `═══════════════════════════════════════════════`,
    `LOCAL SEO REQUIREMENTS (NON-NEGOTIABLE)`,
    `═══════════════════════════════════════════════`,
    `- NAP in footer of EVERY page — must exactly match Google Business Profile`,
    `  Name: ${businessName}`,
    `  Address: ${address}`,
    `  Phone: ${phone}`,
    `- ${schemaType} JSON-LD schema in <head> of every page`,
    `- Single H1 per page — never skip or duplicate`,
    `- Unique meta title (≤60 chars, keyword-first) on every page`,
    `- Unique meta description (≤160 chars) on every page`,
    `- Google Maps embed on home and contact pages`,
    gbp?.placeId ? `- Review link: https://search.google.com/local/writereview?placeid=${gbp.placeId}` : `- Add "Leave us a Google review" button`,
    `- Business hours on contact page and home footer — [INSERT ACTUAL HOURS FROM GBP]`,
    `- All phone numbers as <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a>`,
    `- Descriptive alt text on every image (include city + service where relevant)`,
    `- robots.txt and sitemap.xml`,
    ``,
    `═══════════════════════════════════════════════`,
    `DESIGN REQUIREMENTS`,
    `═══════════════════════════════════════════════`,
    design ? `Current design: ${eraLabel(design.designEra)} (score ${design.designScore}/100)` : '',
    ``,
    `Color palette:`,
    `  Primary: ${palette.primary}`,
    `  Accent/CTA: ${palette.accent}`,
    `  Backgrounds: ${palette.backgrounds}`,
    ``,
    `Style: ${palette.styleNote}`,
    palette.emergencyBadge ? `Include "24/7 Emergency Service" badge in the header.` : '',
    ``,
    ratingLine
      ? `Social proof directive: Display "${gbp!.rating}★ from ${gbp!.reviewCount} reviews" in the hero section. Use it in CTA copy: "Join ${gbp!.reviewCount}+ satisfied customers — Call ${phone}".`
      : '',
    ``,
    `Layout rules:`,
    `- Mobile-first, fully responsive`,
    `- Sticky header: logo left, phone number + CTA button right`,
    `- Hero: H1, sub-headline with key differentiator, CTA button, phone`,
    `- Trust bar directly below hero: years in business · licensed & insured · certifications · service area`,
    `- Services grid: icon cards linking to service sub-pages`,
    `- Footer: full NAP, hours, quick links, review link`,
    `- 2 fonts max (bold display + clean sans-serif body)`,
    `- Body text minimum 16px`,
    `- AVOID: page builders with heavy JS, table layouts, inline styles, stock photo overuse`,
    ``,
    `═══════════════════════════════════════════════`,
    `SEO ISSUES TO FIX (from audit — ${result.scores.overall.value}/100 current score)`,
    `═══════════════════════════════════════════════`,
    topFindings,
    gapList ? `\nCompetitor advantages to match:\n${gapList}` : '',
    ``,
    `═══════════════════════════════════════════════`,
    `TECHNICAL REQUIREMENTS`,
    `═══════════════════════════════════════════════`,
    `- Valid semantic HTML5 — no div soup`,
    `- All images: width + height attributes (prevents layout shift), lazy loading below fold`,
    performanceWarning ? `- ${performanceWarning}` : `- Target: Lighthouse performance > 80`,
    `- Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms`,
    `- Minified CSS and JS, no render-blocking resources`,
    `- Open Graph and Twitter Card meta tags`,
    `- Favicon (16, 32, 180px)`,
    `- 404 page`,
    ``,
    `═══════════════════════════════════════════════`,
    `DELIVERABLE`,
    `═══════════════════════════════════════════════`,
    `Build each page as complete HTML with embedded or linked CSS.`,
    `For each page, include:`,
    `1. Full HTML (<!DOCTYPE html> to </html>)`,
    `2. JSON-LD schema in <head>`,
    `3. A brief checklist confirming which requirements are implemented`,
    ``,
    `Build order: Home → Services → Contact → About → FAQ → service sub-pages`,
    `Pause after each page and wait for confirmation before continuing.`,
  ].filter((l) => l !== undefined && l !== '').join('\n')

  lines.push(prompt)
  return lines.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleCase(str: string): string {
  return str.replace(/[.\-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const FORCE_UPPER = new Set(['hvac', 'ac', 'seo', 'nap', 'gbp', 'faq', 'cta', 'llc', 'inc', 'usa', 'html', 'css'])

function toTitleCase(str: string): string {
  return str.replace(/\b([a-zA-Z]+)\b/g, (word) => {
    if (FORCE_UPPER.has(word.toLowerCase())) return word.toUpperCase()
    return word.charAt(0).toUpperCase() + word.slice(1)
  })
}

/** Extract a short, usable brand name from the full business name. */
function deriveShortName(fullName: string): string {
  // Remove common suffixes: "LLC", "Inc", "Company", "Co."
  const stripped = fullName.replace(/\b(LLC|Inc\.?|Corp\.?|Company|Co\.?|Ltd\.?)\b/gi, '').trim()
  // If it's over 30 chars, use up to the first meaningful break
  if (stripped.length <= 30) return stripped
  const parts = stripped.split(/\s+/)
  // Take first 3 words
  return parts.slice(0, 3).join(' ')
}

function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? '/'
  } catch {
    return url
  }
}

function catLabel(cat: string): string {
  const map: Record<string, string> = {
    localSeo: 'Local SEO', technical: 'Technical', conversion: 'Conversion',
    content: 'Content', trust: 'Trust',
  }
  return map[cat] ?? cat
}

function eraLabel(era: string): string {
  const map: Record<string, string> = {
    modern: 'Modern (2021+)', standard: 'Standard (2018–2021)',
    dated: 'Dated (2015–2018)', old: 'Old (pre-2015)',
  }
  return map[era] ?? era
}

function frameworkLabel(hint: string): string {
  const map: Record<string, string> = {
    tailwind: 'Tailwind CSS', bootstrap5: 'Bootstrap 5', bootstrap4: 'Bootstrap 4',
    bootstrap3: 'Bootstrap 3 (outdated)', wordpress: 'WordPress',
    squarespace: 'Squarespace', wix: 'Wix', custom: 'Custom CSS', unknown: 'Unknown',
  }
  return map[hint] ?? hint
}

function tableFromRows(rows: [string, string][]): string {
  return ['| Field | Value |', '|---|---|', ...rows.map(([l, v]) => `| ${l} | ${v} |`)].join('\n')
}

/**
 * Replace the hardcoded "Roof Replacement in Austin, TX" example in finding
 * recommendation text with a business-type-aware equivalent.
 */
function localizeExample(text: string, industry: Industry, city: string, state: string): string {
  const exampleH1: Record<Industry, string> = {
    hvac: `"AC Repair in ${city}, ${state}"`,
    plumbing: `"Emergency Plumber in ${city}, ${state}"`,
    roofing: `"Roof Replacement in ${city}, ${state}"`,
    electrical: `"Electrician in ${city}, ${state}"`,
    restaurant: `"Best Pizza Restaurant in ${city}, ${state}"`,
    salon: `"Hair Salon in ${city}, ${state}"`,
    dental: `"Family Dentist in ${city}, ${state}"`,
    auto_shop: `"Auto Repair in ${city}, ${state}"`,
    contractor: `"Home Remodeling Contractor in ${city}, ${state}"`,
    other: `"[Your Service] in ${city}, ${state}"`,
  }
  return text
    .replace(/"Roof Replacement in Austin, TX"/g, exampleH1[industry])
    .replace(/Austin, TX/g, `${city}, ${state}`)
}
