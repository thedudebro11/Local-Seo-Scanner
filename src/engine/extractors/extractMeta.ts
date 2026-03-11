/**
 * Extracts meta-level page signals: title, description, canonical, robots directives.
 */

import type { CheerioAPI } from 'cheerio'

export interface MetaSignals {
  title: string
  metaDescription: string
  canonical: string
  noindex: boolean
}

export function extractMeta($: CheerioAPI): MetaSignals {
  const title = $('title').first().text().trim()

  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ??
    $('meta[property="og:description"]').attr('content')?.trim() ??
    ''

  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? ''

  // Check both name="robots" and name="googlebot" meta tags
  const robotsContent = [
    $('meta[name="robots"]').attr('content') ?? '',
    $('meta[name="googlebot"]').attr('content') ?? '',
  ]
    .join(',')
    .toLowerCase()

  const noindex = robotsContent.includes('noindex')

  return { title, metaDescription, canonical, noindex }
}
