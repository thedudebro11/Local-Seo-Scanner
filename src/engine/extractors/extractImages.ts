/**
 * Extracts image signals: total count and missing alt text count.
 * Missing alt text is both an accessibility issue and an SEO signal.
 */

import type { CheerioAPI } from 'cheerio'

export interface ImageSignals {
  imageCount: number
  missingAltCount: number
}

export function extractImages($: CheerioAPI): ImageSignals {
  let imageCount = 0
  let missingAltCount = 0

  $('img').each((_, el) => {
    imageCount++
    const alt = $(el).attr('alt')
    // Missing = attribute absent OR empty string after trimming
    if (alt === undefined || alt.trim() === '') {
      missingAltCount++
    }
  })

  return { imageCount, missingAltCount }
}
