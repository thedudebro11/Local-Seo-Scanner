/**
 * URL / domain utilities used throughout the engine.
 * Uses the global URL constructor — available in both Node.js 10+ and all modern browsers.
 */

/**
 * Normalize a raw URL string entered by a user.
 * - Adds https:// if no protocol is provided
 * - Strips trailing slash
 * - Lowercases hostname
 */
export function normalizeInputUrl(raw: string): string {
  let url = raw.trim()

  // Add scheme if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  try {
    const parsed = new URL(url)
    parsed.hostname = parsed.hostname.toLowerCase()
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    return parsed.href
  } catch {
    throw new Error(`Invalid URL: "${raw}"`)
  }
}

/**
 * Extract the hostname (e.g. "example.com") from a URL string.
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Strip the leading "www." from a hostname so that example.com and
 * www.example.com are treated as the same site.
 */
export function stripWww(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}

/**
 * Check whether two URLs belong to the same domain.
 * Treats www.example.com and example.com as identical.
 */
export function isSameDomain(a: string, b: string): boolean {
  return stripWww(getDomain(a)) === stripWww(getDomain(b))
}

/**
 * Check if a URL uses HTTPS.
 */
export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Build an absolute URL from a relative href and a base URL.
 * Returns null if the result is not a valid http/https URL.
 */
export function resolveUrl(href: string, base: string): string | null {
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:') ||
      href.startsWith('javascript:') || href.startsWith('#')) {
    return null
  }

  try {
    const resolved = new URL(href, base)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null
    }
    // Strip fragment
    resolved.hash = ''
    return resolved.href
  } catch {
    return null
  }
}

/**
 * Strip common tracking query parameters from a URL.
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source', '_ga',
])

export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url)
    TRACKING_PARAMS.forEach((p) => parsed.searchParams.delete(p))
    return parsed.href
  } catch {
    return url
  }
}
