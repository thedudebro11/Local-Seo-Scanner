/**
 * Domain normalization — Phase 14.
 *
 * Converts any URL or raw domain string to a canonical root-domain URL:
 *   http://www.goettl.com/services/ac  →  https://goettl.com
 *   goettl.com/                         →  https://goettl.com
 *   https://goettl.com                  →  https://goettl.com
 *
 * Returns null for inputs that cannot be parsed as a valid http/https URL
 * with at least one dot in the hostname.
 */

/**
 * Normalize any URL or bare domain to a canonical https root-domain URL.
 * Returns null for invalid or non-web input.
 */
export function normalizeToDomain(raw: string): string | null {
  if (!raw) return null

  let input = raw.trim()
  // Strip protocol-relative //
  if (input.startsWith('//')) input = `https:${input}`
  // Add scheme if missing
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  let hostname = parsed.hostname.toLowerCase()
  // Remove www.
  if (hostname.startsWith('www.')) hostname = hostname.slice(4)
  // Must have at least one dot (not "localhost", not bare IPs without dots)
  if (!hostname.includes('.')) return null
  // Must not be an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null

  return `https://${hostname}`
}

/**
 * Extract just the hostname from a canonical domain URL produced by
 * normalizeToDomain() (e.g. "https://goettl.com" → "goettl.com").
 */
export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
