/**
 * Technical SEO analyzer.
 * Converts crawl metadata and page signals into technical findings.
 * Covers: titles, meta descriptions, headings, canonicals, noindex, broken pages,
 * robots.txt, sitemap, and image alt coverage.
 */

import type { AnalyzerOutput, Finding } from '../types/audit'
import type { AnalyzerInput } from './types'
import { homepage, importantPages } from './types'

const TITLE_MIN = 20
const TITLE_MAX = 70
const DESC_MIN = 50
const DESC_MAX = 160
const ALT_POOR_THRESHOLD = 0.30 // >30% missing alt = a finding

export function analyzeTechnical(input: AnalyzerInput): AnalyzerOutput {
  const { pages, domain, robotsFound, sitemapFound } = input
  const findings: Finding[] = []
  const notes: string[] = []

  const home = homepage(pages)
  const keyPages = importantPages(pages)

  // ── 1. robots.txt ─────────────────────────────────────────────────────────
  if (!robotsFound) {
    findings.push({
      id: 'technical-no-robots',
      category: 'technical',
      severity: 'low',
      title: 'No robots.txt file found',
      summary: `${domain} is missing a robots.txt file.`,
      whyItMatters:
        'robots.txt guides search engine crawlers. Its absence is a minor signal but indicates incomplete technical setup. A Sitemap: directive inside robots.txt also speeds up indexing.',
      recommendation:
        'Create a robots.txt at the site root. At minimum include: `Sitemap: https://yourdomain.com/sitemap.xml`',
    })
  }

  // ── 2. Sitemap ────────────────────────────────────────────────────────────
  if (!sitemapFound) {
    findings.push({
      id: 'technical-no-sitemap',
      category: 'technical',
      severity: 'medium',
      title: 'No XML sitemap found',
      summary: `No sitemap.xml was detected for ${domain}.`,
      whyItMatters:
        'A sitemap helps Google discover every page on your site. Without one, service pages and location pages may never be indexed.',
      recommendation:
        'Generate and submit an XML sitemap. Most CMS platforms have built-in options: WordPress (Yoast/RankMath), Squarespace, and Wix all auto-generate sitemaps.',
    })
  }

  // ── 3. Broken pages ───────────────────────────────────────────────────────
  const broken = pages.filter((p) => p.statusCode >= 400)
  if (broken.length > 0) {
    findings.push({
      id: 'technical-broken-pages',
      category: 'technical',
      severity: broken.length > 3 ? 'high' : 'medium',
      title: `${broken.length} broken page${broken.length > 1 ? 's' : ''} (4xx/5xx)`,
      summary: `${broken.length} URL(s) returned error status codes during the crawl.`,
      whyItMatters:
        'Broken pages hurt crawl budget, lose any inbound link equity, and instantly damage trust when visitors land on them.',
      recommendation:
        'Fix or 301-redirect all broken URLs. Check for typos in internal links. Use Google Search Console to identify any externally-linked broken pages.',
      affectedUrls: broken.map((p) => p.url),
    })
  }

  // ── 4. noindex on money pages ─────────────────────────────────────────────
  const noindexed = pages.filter(
    (p) => p.noindex && ['service', 'location', 'contact'].includes(p.pageType),
  )
  if (noindexed.length > 0) {
    findings.push({
      id: 'technical-noindex-money-pages',
      category: 'technical',
      severity: 'high',
      title: `${noindexed.length} money page${noindexed.length > 1 ? 's' : ''} blocked from Google`,
      summary: `${noindexed.length} service/location/contact page(s) have a noindex directive.`,
      whyItMatters:
        'These pages are completely invisible to Google. If no one can find your service pages, you lose every organic lead they would have generated.',
      recommendation:
        'Remove the noindex meta tag from these pages immediately. Check both the HTML meta tag and any X-Robots-Tag HTTP headers.',
      affectedUrls: noindexed.map((p) => p.url),
    })
  }

  // ── 5. Missing title ──────────────────────────────────────────────────────
  const noTitle = keyPages.filter((p) => !p.title || p.title.trim() === '')
  if (noTitle.length > 0) {
    findings.push({
      id: 'technical-missing-title',
      category: 'technical',
      severity: 'high',
      title: `${noTitle.length} key page${noTitle.length > 1 ? 's' : ''} missing a title tag`,
      summary: `${noTitle.length} important page(s) have no <title> tag.`,
      whyItMatters:
        'The title tag is one of the strongest on-page SEO signals. Pages without titles are effectively invisible in search results and receive no ranking credit.',
      recommendation:
        'Add a descriptive title to every page. Format: "Primary Keyword | Business Name | City, State". Keep it under 60 characters.',
      affectedUrls: noTitle.map((p) => p.url),
    })
  }

  // ── 6. Title length ───────────────────────────────────────────────────────
  const shortTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > 0 && p.title.trim().length < TITLE_MIN,
  )
  if (shortTitle.length > 0) {
    findings.push({
      id: 'technical-short-title',
      category: 'technical',
      severity: 'low',
      title: `${shortTitle.length} page${shortTitle.length > 1 ? 's' : ''} with very short title tags`,
      summary: `${shortTitle.length} page(s) have titles under ${TITLE_MIN} characters.`,
      whyItMatters:
        'Short titles miss the opportunity to include your city, service, and business name — all signals that help Google understand what you do and where.',
      recommendation:
        `Expand these titles to ${TITLE_MIN}–${TITLE_MAX} characters. Include the primary service, city/state, and brand name.`,
      affectedUrls: shortTitle.map((p) => p.url),
    })
  }

  const longTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > TITLE_MAX,
  )
  if (longTitle.length > 0) {
    findings.push({
      id: 'technical-long-title',
      category: 'technical',
      severity: 'low',
      title: `${longTitle.length} page${longTitle.length > 1 ? 's' : ''} with titles that will be truncated in search`,
      summary: `${longTitle.length} page(s) have titles over ${TITLE_MAX} characters.`,
      whyItMatters:
        'Google truncates titles longer than ~60–70 characters in search results, cutting off important keywords or your brand name.',
      recommendation:
        `Shorten these titles to under ${TITLE_MAX} characters. Lead with the most important keyword.`,
      affectedUrls: longTitle.map((p) => p.url),
    })
  }

  // ── 7. Missing meta description ───────────────────────────────────────────
  const noDesc = keyPages.filter((p) => !p.metaDescription || p.metaDescription.trim() === '')
  if (noDesc.length > 0) {
    findings.push({
      id: 'technical-missing-meta-desc',
      category: 'technical',
      severity: 'medium',
      title: `${noDesc.length} key page${noDesc.length > 1 ? 's' : ''} missing meta descriptions`,
      summary: `${noDesc.length} important page(s) have no meta description.`,
      whyItMatters:
        'Without a meta description, Google auto-generates one — often pulling an irrelevant sentence. A well-written description directly impacts click-through rates from search results.',
      recommendation:
        `Write a ${DESC_MIN}–${DESC_MAX} character meta description for each page. Include a CTA: "Call us for a free estimate today."`,
      affectedUrls: noDesc.map((p) => p.url),
    })
  }

  // ── 8. Missing H1 ─────────────────────────────────────────────────────────
  const noH1 = pages.filter((p) => p.h1s.length === 0)
  if (noH1.length > 0) {
    findings.push({
      id: 'technical-missing-h1',
      category: 'technical',
      severity: 'medium',
      title: `${noH1.length} page${noH1.length > 1 ? 's' : ''} missing an H1 heading`,
      summary: `${noH1.length} page(s) have no H1 tag.`,
      whyItMatters:
        'The H1 is the primary on-page heading — it tells both Google and visitors what the page is about. Pages without an H1 miss a key ranking signal.',
      recommendation:
        'Add a single, descriptive H1 to each page. For a service page it should name the service and ideally the location: "Roof Replacement in Austin, TX".',
      affectedUrls: noH1.map((p) => p.url),
    })
  }

  // ── 9. Multiple H1s ──────────────────────────────────────────────────────
  const multiH1 = pages.filter((p) => p.h1s.length > 1)
  if (multiH1.length > 0) {
    findings.push({
      id: 'technical-multiple-h1',
      category: 'technical',
      severity: 'low',
      title: `${multiH1.length} page${multiH1.length > 1 ? 's' : ''} with multiple H1 headings`,
      summary: `${multiH1.length} page(s) have more than one H1 tag.`,
      whyItMatters:
        'Multiple H1s dilute the page\'s topical focus signal. Google prefers one clear H1 per page.',
      recommendation:
        'Keep exactly one H1 per page. Downgrade additional H1s to H2 or H3.',
      affectedUrls: multiH1.map((p) => p.url),
    })
  }

  // ── 10. Missing canonical ─────────────────────────────────────────────────
  const noCanonical = keyPages.filter((p) => !p.canonical || p.canonical.trim() === '')
  if (noCanonical.length > 0) {
    findings.push({
      id: 'technical-missing-canonical',
      category: 'technical',
      severity: 'low',
      title: `${noCanonical.length} key page${noCanonical.length > 1 ? 's' : ''} missing canonical tags`,
      summary: `${noCanonical.length} important page(s) have no canonical link element.`,
      whyItMatters:
        'Canonical tags prevent duplicate content issues (e.g., http vs https, trailing slash variants). Without them, link equity can be split across URL variations.',
      recommendation:
        'Add a self-referencing canonical tag to every page: `<link rel="canonical" href="https://yourdomain.com/page/" />`',
      affectedUrls: noCanonical.map((p) => p.url),
    })
  }

  // ── 11. Image alt coverage ────────────────────────────────────────────────
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0)
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0)

  if (totalImages > 0) {
    const missingRatio = missingAlt / totalImages
    if (missingRatio > ALT_POOR_THRESHOLD) {
      const pct = Math.round(missingRatio * 100)
      findings.push({
        id: 'technical-poor-image-alt',
        category: 'technical',
        severity: missingRatio > 0.6 ? 'medium' : 'low',
        title: `${pct}% of images are missing alt text`,
        summary: `${missingAlt} of ${totalImages} images across the site have no alt attribute.`,
        whyItMatters:
          'Alt text helps Google understand image content — contributing to Google Image Search visibility and overall page relevance. It\'s also an accessibility requirement (ADA).',
        recommendation:
          'Add descriptive alt text to all images. For local businesses: include the service and location in alt text for hero images (e.g., "roof replacement Austin TX").',
      })
    }
  }

  // ── Homepage-specific checks ──────────────────────────────────────────────
  if (home) {
    notes.push(`Homepage: "${home.title ?? 'no title'}" | H1s: ${home.h1s.length} | Words: ${home.wordCount ?? 0}`)
  }

  notes.push(
    `Pages scanned: ${pages.length} | Key pages: ${keyPages.length} | Broken: ${broken.length}`,
    `Robots: ${robotsFound ? 'found' : 'missing'} | Sitemap: ${sitemapFound ? 'found' : 'missing'}`,
    `Images: ${totalImages} total, ${missingAlt} missing alt (${totalImages > 0 ? Math.round((missingAlt / totalImages) * 100) : 0}%)`,
  )

  return { findings, notes }
}
