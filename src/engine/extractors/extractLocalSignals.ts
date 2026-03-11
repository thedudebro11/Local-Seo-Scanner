/**
 * Extracts local business signals: maps presence, business hours,
 * geographic mentions (city, state, ZIP), and service area phrases.
 */

import type { CheerioAPI } from 'cheerio'

export interface LocalSignals {
  hasMap: boolean
  hasHours: boolean
  cityMentions: string[]
  stateMentions: string[]
  hasServiceAreaText: boolean
}

// Days of the week used as a reliable hours indicator
const DAYS_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s:.-]/i

// Time patterns: 9am, 9:00, 9:00 AM, 9 a.m.
const TIME_PATTERN = /\b\d{1,2}(:\d{2})?\s*([ap]\.?m\.?|[AP]M)\b/i

// Business hours keywords
const HOURS_KEYWORDS = /\b(hours|open|closed|open\s+daily|24\s*hours|open\s+now)\b/i

// US state abbreviations (two-letter)
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

// Matches ", TX" / ", Texas" / ", New York" patterns in text
const STATE_ABBR_PATTERN = /,\s*([A-Z]{2})\b/g
const STATE_FULL_PATTERN =
  /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)\b/gi

// Service area phrases
const SERVICE_AREA_PATTERN =
  /\b(serving|we\s+serve|service\s+area|areas?\s+we\s+serve|proudly\s+serving|serving\s+the|available\s+in|serving\s+all\s+of)\b/i

// Google Maps & directions links / embeds
const MAPS_HREF_PATTERN = /maps\.google\.|google\.com\/maps|goo\.gl\/maps|maps\.apple\.|bing\.com\/maps/i
const MAPS_IFRAME_PATTERN = /maps\.google\.|google\.com\/maps/i

export function extractLocalSignals($: CheerioAPI): LocalSignals {
  // ── Map detection ─────────────────────────────────────────────────────────
  let hasMap = false

  // Iframe embed (Google Maps)
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    if (MAPS_IFRAME_PATTERN.test(src)) hasMap = true
  })

  // Links to maps / directions
  if (!hasMap) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const text = $(el).text().toLowerCase()
      if (MAPS_HREF_PATTERN.test(href) || text.includes('directions') || text.includes('get directions')) {
        hasMap = true
      }
    })
  }

  // ── Hours detection ───────────────────────────────────────────────────────
  const bodyText = $('body').text()
  const hasHours =
    DAYS_PATTERN.test(bodyText) ||
    (HOURS_KEYWORDS.test(bodyText) && TIME_PATTERN.test(bodyText))

  // ── Geographic mentions ───────────────────────────────────────────────────
  const cityMentions: string[] = []
  const stateMentions = new Set<string>()

  // State abbreviations from text
  const abbrMatches = [...bodyText.matchAll(STATE_ABBR_PATTERN)]
  abbrMatches.forEach((m) => {
    const abbr = m[1].toUpperCase()
    if (US_STATES.has(abbr)) stateMentions.add(abbr)
  })

  // Full state names from text
  const fullMatches = [...bodyText.matchAll(STATE_FULL_PATTERN)]
  fullMatches.forEach((m) => stateMentions.add(m[0].trim()))

  // City: extract from meta or <title> if it contains "City, State" pattern
  const titleText = $('title').text()
  const metaDesc = $('meta[name="description"]').attr('content') ?? ''
  const cityPattern = /([A-Z][a-zA-Z\s]{2,20}),\s*[A-Z]{2}\b/g
  const citySearchText = `${titleText} ${metaDesc}`
  const cityMatches = [...citySearchText.matchAll(cityPattern)]
  cityMatches.forEach((m) => {
    const city = m[1].trim()
    if (city.length > 2 && city.length < 30) cityMentions.push(city)
  })

  // ── Service area text ─────────────────────────────────────────────────────
  const hasServiceAreaText = SERVICE_AREA_PATTERN.test(bodyText)

  return {
    hasMap,
    hasHours,
    cityMentions: [...new Set(cityMentions)].slice(0, 10),
    stateMentions: [...stateMentions].slice(0, 5),
    hasServiceAreaText,
  }
}
