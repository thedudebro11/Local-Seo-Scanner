/**
 * Extracts NAP (Name-Address-Phone) contact signals from a page.
 * Priority order:
 *   1. tel:/mailto: href links (most reliable — explicitly marked up)
 *   2. itemprop="telephone" microdata
 *   3. JSON-LD LocalBusiness telephone property
 *   4. Visible text scan — header, main, footer, then body fallback
 */

import type { CheerioAPI } from 'cheerio'

export interface ContactSignals {
  phones: string[]
  emails: string[]
  hasAddress: boolean
}

// US/CA phone: (555) 555-5555 · 555-555-5555 · 555.555.5555 · +1 555 555 5555
const PHONE_REGEX =
  /(?:\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

const STREET_ADDRESS_REGEX =
  /\d{1,5}\s+[A-Z][a-zA-Z\s]{2,40}\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Way|Ct|Court|Ln|Lane|Pl|Place|Pkwy|Parkway|Hwy|Highway)\b/i

export function extractContactSignals($: CheerioAPI): ContactSignals {
  const phones = new Set<string>()
  const emails = new Set<string>()

  // ── 1. tel: and mailto: href links (highest confidence) ──────────────────
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

  // ── 2. Schema microdata: itemprop="telephone" ─────────────────────────────
  $('[itemprop="telephone"]').each((_, el) => {
    const val = ($(el).attr('content') ?? $(el).text()).trim()
    if (val) phones.add(val)
  })

  // ── 3. JSON-LD: LocalBusiness telephone field ─────────────────────────────
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() ?? '')
      extractJsonLdPhones(parsed, phones)
      extractJsonLdEmails(parsed, emails)
    } catch {
      // Malformed JSON-LD — skip
    }
  })

  // ── 4. Visible text scan ──────────────────────────────────────────────────
  // Collect text from every key layout zone independently so that a phone in
  // the <header> isn't missed just because <main> also exists.
  const textChunks: string[] = []

  const zones = ['header', 'main', 'article', '.contact', '#contact', 'footer']
  for (const sel of zones) {
    const text = $(sel).text()
    if (text.trim()) textChunks.push(text)
  }

  // Body fallback if no zone matched (very minimal sites)
  if (textChunks.length === 0) {
    textChunks.push($('body').text())
  }

  const fullText = textChunks.join(' ')

  const phoneMatches = fullText.match(PHONE_REGEX) ?? []
  phoneMatches.forEach((p) => phones.add(p.trim()))

  const emailMatches = fullText.match(EMAIL_REGEX) ?? []
  emailMatches
    .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg'))
    .forEach((e) => emails.add(e.toLowerCase()))

  // ── Address detection ─────────────────────────────────────────────────────
  const hasAddress =
    $('[itemprop="address"], [itemprop="streetAddress"], [typeof="PostalAddress"]').length > 0 ||
    $('address').length > 0 ||
    STREET_ADDRESS_REGEX.test(fullText)

  return {
    phones: [...phones].slice(0, 10),
    emails: [...emails].slice(0, 10),
    hasAddress,
  }
}

// ─── JSON-LD helpers ──────────────────────────────────────────────────────────

function extractJsonLdPhones(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((n) => extractJsonLdPhones(n, out)); return }

  const obj = node as Record<string, unknown>
  if (typeof obj['telephone'] === 'string' && obj['telephone']) {
    out.add(obj['telephone'])
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') extractJsonLdPhones(val, out)
  }
}

function extractJsonLdEmails(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((n) => extractJsonLdEmails(n, out)); return }

  const obj = node as Record<string, unknown>
  if (typeof obj['email'] === 'string' && obj['email']) {
    out.add(obj['email'].toLowerCase())
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') extractJsonLdEmails(val, out)
  }
}
