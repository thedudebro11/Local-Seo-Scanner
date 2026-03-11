/**
 * Page type classifier.
 * Uses URL path keywords + heading/title text heuristics.
 * Returns one of the PageType values defined in audit.ts.
 */

import type { PageType } from '../types/audit'

// Ordered rules: first match wins. More specific patterns first.
const PATH_RULES: Array<[RegExp, PageType]> = [
  [/\/(contact|contact-us|reach-us|get-in-touch|find-us)/i, 'contact'],
  [/\/(book|booking|appointments?|schedule|reserve|reservations?)/i, 'booking'],
  [/\/(menu|food|drinks|cuisine|order-online|our-menu)/i, 'menu'],
  [/\/(gallery|photos?|portfolio|our-work|projects?)/i, 'gallery'],
  [/\/(about|about-us|our-story|our-team|who-we-are|company)/i, 'about'],
  [/\/(locations?|areas?|cities|city|serve|coverage|service-area)/i, 'location'],
  [/\/(services?|what-we-do|our-services|solutions?|offerings?)/i, 'service'],
  [/\/(blog|news|articles?|posts?|updates?|resources?)/i, 'blog'],
]

const HEADING_RULES: Array<[RegExp, PageType]> = [
  [/book\s*(now|an?\s*appointment|online)|schedule\s*(an?\s*appointment|now)/i, 'booking'],
  [/contact\s*us|get\s*in\s*touch|reach\s*us|call\s*us\s*today/i, 'contact'],
  [/our\s*menu|view\s*(the\s*)?menu|food\s*&\s*drinks/i, 'menu'],
  [/photo\s*gallery|our\s*(gallery|portfolio|work|projects?)/i, 'gallery'],
  [/about\s*us|our\s*(story|team|company|mission|history)/i, 'about'],
  [/service\s*area|areas?\s*we\s*serve|serving\s*(the\s*)?\w+/i, 'location'],
  [/our\s*services?|what\s*we\s*(do|offer)|services?\s*(we\s*)?provide/i, 'service'],
  [/latest\s*(news|posts?|articles?)|from\s*the\s*blog/i, 'blog'],
]

/**
 * Classify a page into a PageType.
 * @param url   - Absolute URL of the page
 * @param title - <title> text content
 * @param h1s   - All H1 text content on the page
 * @param h2s   - All H2 text content on the page
 */
export function classifyPage(
  url: string,
  title: string,
  h1s: string[],
  h2s: string[],
): PageType {
  let pathname: string
  try {
    pathname = new URL(url).pathname.toLowerCase()
  } catch {
    return 'other'
  }

  // Root is always home
  if (pathname === '/' || pathname === '') return 'home'

  // URL path matching (most reliable signal)
  for (const [pattern, type] of PATH_RULES) {
    if (pattern.test(pathname)) return type
  }

  // Heading text matching (fallback)
  const headingText = [...h1s, ...h2s, title].join(' ')
  for (const [pattern, type] of HEADING_RULES) {
    if (pattern.test(headingText)) return type
  }

  return 'other'
}
