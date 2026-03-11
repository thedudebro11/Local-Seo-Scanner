/**
 * Extractor barrel.
 * Loads Cheerio once per page, runs all extractors, and returns a unified
 * ExtractedSignals object that maps directly onto CrawledPage's signal fields.
 *
 * Usage:
 *   import { extractAllSignals } from '../extractors'
 *   const signals = extractAllSignals(raw.html, raw.finalUrl)
 */

import * as cheerio from 'cheerio/slim'
import { extractMeta } from './extractMeta'
import { extractHeadings } from './extractHeadings'
import { extractSchema } from './extractSchema'
import { extractContactSignals } from './extractContactSignals'
import { extractLocalSignals } from './extractLocalSignals'
import { extractCTAs } from './extractCTAs'
import { extractTrustSignals } from './extractTrustSignals'
import { extractImages } from './extractImages'
import { extractTextStats } from './extractTextStats'

export type { MetaSignals } from './extractMeta'
export type { HeadingsSignals } from './extractHeadings'
export type { SchemaSignals } from './extractSchema'
export type { ContactSignals } from './extractContactSignals'
export type { LocalSignals } from './extractLocalSignals'
export type { CTASignals } from './extractCTAs'
export type { TrustSignals } from './extractTrustSignals'
export type { ImageSignals } from './extractImages'
export type { TextStats } from './extractTextStats'

/** All extracted signals for a single page — maps 1:1 to CrawledPage fields */
export interface ExtractedSignals {
  // Meta
  title: string
  metaDescription: string
  canonical: string
  noindex: boolean
  // Headings
  h1s: string[]
  h2s: string[]
  // Schema
  schemaTypes: string[]
  // Contact
  phones: string[]
  emails: string[]
  hasAddress: boolean
  // Local
  hasMap: boolean
  hasHours: boolean
  // CTAs
  ctaTexts: string[]
  hasForm: boolean
  // Trust
  hasTrustSignals: boolean
  testimonialCount: number
  // Images
  imageCount: number
  missingAltCount: number
  // Text
  textContent: string
  wordCount: number
}

/**
 * Run all extractors against a single page's HTML.
 * Loads Cheerio once and passes the same instance to every extractor.
 *
 * @param html     Raw HTML string from the crawler
 * @param pageUrl  Final URL of the page (used by some extractors for context)
 */
export function extractAllSignals(html: string, pageUrl: string): ExtractedSignals {
  if (!html) return emptySignals()

  const $ = cheerio.load(html)

  const meta = extractMeta($)
  const headings = extractHeadings($)
  const schema = extractSchema($)
  const contact = extractContactSignals($)
  const local = extractLocalSignals($)
  const ctas = extractCTAs($)
  const trust = extractTrustSignals($)
  const images = extractImages($)
  const textStats = extractTextStats($)

  return {
    // Meta
    title: meta.title,
    metaDescription: meta.metaDescription,
    canonical: meta.canonical,
    noindex: meta.noindex,
    // Headings
    h1s: headings.h1s,
    h2s: headings.h2s,
    // Schema
    schemaTypes: schema.schemaTypes,
    // Contact
    phones: contact.phones,
    emails: contact.emails,
    hasAddress: contact.hasAddress,
    // Local
    hasMap: local.hasMap,
    hasHours: local.hasHours,
    // CTAs
    ctaTexts: ctas.ctaTexts,
    hasForm: ctas.hasForm,
    // Trust
    hasTrustSignals: trust.hasTrustSignals,
    testimonialCount: trust.testimonialCount,
    // Images
    imageCount: images.imageCount,
    missingAltCount: images.missingAltCount,
    // Text
    textContent: textStats.textContent,
    wordCount: textStats.wordCount,
  }
}

function emptySignals(): ExtractedSignals {
  return {
    title: '', metaDescription: '', canonical: '', noindex: false,
    h1s: [], h2s: [], schemaTypes: [],
    phones: [], emails: [], hasAddress: false,
    hasMap: false, hasHours: false,
    ctaTexts: [], hasForm: false,
    hasTrustSignals: false, testimonialCount: 0,
    imageCount: 0, missingAltCount: 0,
    textContent: '', wordCount: 0,
  }
}
