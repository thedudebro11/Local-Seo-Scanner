/**
 * Extracts heading structure (H1, H2) from a page.
 */

import type { CheerioAPI } from 'cheerio'

export interface HeadingsSignals {
  h1s: string[]
  h2s: string[]
}

export function extractHeadings($: CheerioAPI): HeadingsSignals {
  const h1s: string[] = []
  $('h1').each((_, el) => {
    const text = $(el).text().trim()
    if (text) h1s.push(text)
  })

  const h2s: string[] = []
  $('h2').each((_, el) => {
    const text = $(el).text().trim()
    if (text) h2s.push(text)
  })

  return { h1s, h2s }
}
