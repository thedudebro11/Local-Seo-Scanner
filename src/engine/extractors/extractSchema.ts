/**
 * Extracts structured data signals from JSON-LD blocks and microdata attributes.
 * Reports which schema @types are present — important for local SEO scoring.
 */

import type { CheerioAPI } from 'cheerio'

export interface SchemaSignals {
  /** Unique list of schema @type values found on the page, e.g. ['LocalBusiness', 'FAQPage'] */
  schemaTypes: string[]
}

export function extractSchema($: CheerioAPI): SchemaSignals {
  const types = new Set<string>()

  // ── JSON-LD blocks ────────────────────────────────────────────────────────
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? ''
    try {
      const parsed: unknown = JSON.parse(raw)
      collectTypes(parsed, types)
    } catch {
      // Malformed JSON-LD — skip
    }
  })

  // ── Microdata itemtype attributes ─────────────────────────────────────────
  $('[itemtype]').each((_, el) => {
    const itemtype = $(el).attr('itemtype') ?? ''
    // itemtype is a URL like "https://schema.org/LocalBusiness"
    const schemaType = itemtype.split('/').pop()
    if (schemaType) types.add(schemaType)
  })

  return { schemaTypes: [...types] }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively collect @type values from a parsed JSON-LD object or array.
 */
function collectTypes(node: unknown, types: Set<string>): void {
  if (!node || typeof node !== 'object') return

  if (Array.isArray(node)) {
    node.forEach((child) => collectTypes(child, types))
    return
  }

  const obj = node as Record<string, unknown>

  if ('@type' in obj) {
    const t = obj['@type']
    if (typeof t === 'string') {
      types.add(normalizeType(t))
    } else if (Array.isArray(t)) {
      t.forEach((v) => {
        if (typeof v === 'string') types.add(normalizeType(v))
      })
    }
  }

  // Recurse into nested objects (@graph, mainEntity, etc.)
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      collectTypes(value, types)
    }
  }
}

/** Strip URL prefix if the @type is written as a full URL */
function normalizeType(t: string): string {
  return t.includes('/') ? (t.split('/').pop() ?? t) : t
}
