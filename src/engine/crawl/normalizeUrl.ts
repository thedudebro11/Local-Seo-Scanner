/**
 * Crawler-specific URL normalization.
 * Wraps domain.ts utilities with crawler-level skip rules.
 */

import { resolveUrl, stripTrackingParams } from '../utils/domain'

// File extensions the crawler should never visit
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|mov|zip|doc|docx|xls|xlsx|ppt|pptx|exe|dmg|css|js|json|xml|woff|woff2|ttf|eot)$/i

// Path segments the crawler should skip (auth, admin, cart, tracking)
const SKIP_PATH_SEGMENTS = [
  '/wp-admin',
  '/wp-json',
  '/wp-login',
  '/cart',
  '/checkout',
  '/account',
  '/login',
  '/logout',
  '/register',
  '/signin',
  '/signup',
  '/admin',
  '/feed',
  '/rss',
  '?replytocom',
  '/tag/',
  '/author/',
  '/page/',
]

/**
 * Resolve an href found on a page into an absolute, normalized URL suitable
 * for the crawler queue. Returns null if the URL should be skipped.
 */
export function normalizeCrawlerUrl(href: string, base: string): string | null {
  const resolved = resolveUrl(href, base)
  if (!resolved) return null

  // Strip tracking params
  const clean = stripTrackingParams(resolved)

  return clean
}

/**
 * Returns true if this URL should be excluded from crawling.
 */
export function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase()

  if (SKIP_EXTENSIONS.test(lower)) return true

  for (const segment of SKIP_PATH_SEGMENTS) {
    if (lower.includes(segment)) return true
  }

  return false
}
