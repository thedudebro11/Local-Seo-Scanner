/**
 * Shared types and page-selection helpers used by all analyzer modules.
 */

import type { CrawledPage, BusinessType, PageType } from '../types/audit'

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface AnalyzerInput {
  pages: CrawledPage[]
  domain: string
  robotsFound: boolean
  sitemapFound: boolean
  detectedBusinessType: BusinessType
}

// ─── Page selector helpers ────────────────────────────────────────────────────

/** The homepage (pageType === 'home'). Falls back to the first page if none found. */
export function homepage(pages: CrawledPage[]): CrawledPage | undefined {
  return pages.find((p) => p.pageType === 'home') ?? pages[0]
}

/** All pages whose type matches one of the provided types. */
export function pagesByType(pages: CrawledPage[], ...types: PageType[]): CrawledPage[] {
  return pages.filter((p) => types.includes(p.pageType))
}

/**
 * "Money pages" — the pages most important for ranking and converting.
 * Analyzed more strictly than blog/gallery pages.
 */
export function importantPages(pages: CrawledPage[]): CrawledPage[] {
  return pagesByType(pages, 'home', 'contact', 'service', 'location')
}
