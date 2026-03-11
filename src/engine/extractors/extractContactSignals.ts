/**
 * Extracts NAP (Name-Address-Phone) contact signals from a page.
 * Checks both structured markup (schema, tel:/mailto: links) and raw text patterns.
 */

import type { CheerioAPI } from 'cheerio'

export interface ContactSignals {
  phones: string[]
  emails: string[]
  hasAddress: boolean
}

// US/CA phone: captures (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555
const PHONE_REGEX =
  /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Street address pattern: starts with digits followed by a street name + type
const STREET_ADDRESS_REGEX =
  /\d{1,5}\s+[A-Z][a-zA-Z\s]{2,40}\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Way|Ct|Court|Ln|Lane|Pl|Place|Pkwy|Parkway|Hwy|Highway)\b/i

export function extractContactSignals($: CheerioAPI): ContactSignals {
  const phones = new Set<string>()
  const emails = new Set<string>()
  let hasAddress = false

  // ── tel: and mailto: links (most reliable) ────────────────────────────────
  $('a[href^="tel:"]').each((_, el) => {
    const raw = $(el).attr('href') ?? ''
    const digits = raw.replace('tel:', '').replace(/\s/g, '')
    if (digits) phones.add(digits)
  })

  $('a[href^="mailto:"]').each((_, el) => {
    const raw = ($(el).attr('href') ?? '').replace('mailto:', '')
    const addr = raw.split('?')[0].trim().toLowerCase()
    if (addr && EMAIL_REGEX.test(addr)) emails.add(addr)
  })

  // ── Schema.org address (most reliable address signal) ─────────────────────
  const schemaAddress =
    $('[itemprop="address"]').length > 0 ||
    $('[itemprop="streetAddress"]').length > 0 ||
    $('[typeof="PostalAddress"]').length > 0

  // ── Visible text scanning ─────────────────────────────────────────────────
  // Pull text from relevant containers only (avoid nav/footer clutter)
  const searchSelectors = ['main', 'article', 'section', '.contact', '#contact', 'footer', 'body']
  let bodyText = ''

  for (const sel of searchSelectors) {
    const el = $(sel).first()
    if (el.length) {
      bodyText = el.text()
      break
    }
  }

  // Phone numbers from text
  const phoneMatches = bodyText.match(PHONE_REGEX) ?? []
  phoneMatches.forEach((p) => phones.add(p.trim()))

  // Emails from text
  const emailMatches = bodyText.match(EMAIL_REGEX) ?? []
  emailMatches
    .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg')) // exclude false positives
    .forEach((e) => emails.add(e.toLowerCase()))

  // Address detection
  hasAddress =
    schemaAddress ||
    STREET_ADDRESS_REGEX.test(bodyText) ||
    $('address').length > 0

  return {
    phones: [...phones].slice(0, 10), // cap at 10 to avoid runaway matches
    emails: [...emails].slice(0, 10),
    hasAddress,
  }
}
