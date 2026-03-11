/**
 * Extracts visible text content and word count from a page.
 * Strips scripts, styles, and hidden elements before measurement.
 */

import type { CheerioAPI } from 'cheerio'

export interface TextStats {
  textContent: string
  wordCount: number
}

export function extractTextStats($: CheerioAPI): TextStats {
  // Clone to avoid mutating the shared $ for other extractors
  const $clone = $.root().clone()

  // Remove non-visible / non-content elements
  $clone.find('script, style, noscript, [hidden], [aria-hidden="true"]').remove()

  const rawText = $clone.find('body').text()
  const textContent = rawText.replace(/\s+/g, ' ').trim()
  const wordCount = textContent ? textContent.split(/\s+/).length : 0

  return { textContent, wordCount }
}
