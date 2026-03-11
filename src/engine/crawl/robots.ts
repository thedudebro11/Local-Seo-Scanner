/**
 * Fetches and parses robots.txt.
 * Uses Node 18 global fetch (available in Electron 28 main process).
 */

import { createLogger } from '../utils/logger'

const log = createLogger('robots')

const FETCH_TIMEOUT_MS = 10_000

export interface RobotsResult {
  found: boolean
  /** All Disallow paths applicable to * or Googlebot */
  disallowedPaths: string[]
  /** Sitemap URLs declared in robots.txt */
  sitemapUrls: string[]
  /** False only if there's a `Disallow: /` for * or Googlebot */
  allowsGooglebot: boolean
}

/**
 * Fetch and parse robots.txt for the given site root URL.
 * Returns a safe default (found=false, allowsGooglebot=true) on any failure.
 */
export async function fetchRobots(siteUrl: string): Promise<RobotsResult> {
  let robotsUrl: string
  try {
    const parsed = new URL(siteUrl)
    robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`
  } catch {
    return emptyResult()
  }

  try {
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'LocalSEOScanner/1.0' },
    })

    if (!response.ok) {
      log.info(`robots.txt not found at ${robotsUrl} (${response.status})`)
      return emptyResult()
    }

    const text = await response.text()
    const result = parseRobots(text)
    log.info(
      `robots.txt found: disallowed=${result.disallowedPaths.length}, sitemaps=${result.sitemapUrls.length}`,
    )
    return result
  } catch (err) {
    log.warn(`Failed to fetch robots.txt: ${(err as Error).message}`)
    return emptyResult()
  }
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseRobots(text: string): RobotsResult {
  const lines = text.split('\n').map((l) => l.split('#')[0].trim()).filter(Boolean)

  const disallowedPaths: string[] = []
  const sitemapUrls: string[] = []
  let allowsGooglebot = true

  type AgentScope = 'all' | 'googlebot' | 'other'
  let currentScope: AgentScope = 'other'

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim().toLowerCase()
    const value = line.slice(colonIdx + 1).trim()

    if (key === 'user-agent') {
      const agent = value.toLowerCase()
      if (agent === '*') currentScope = 'all'
      else if (agent === 'googlebot') currentScope = 'googlebot'
      else currentScope = 'other'
      continue
    }

    if (key === 'sitemap' && value.startsWith('http')) {
      sitemapUrls.push(value)
      continue
    }

    if (key === 'disallow' && (currentScope === 'all' || currentScope === 'googlebot')) {
      if (value === '/') {
        allowsGooglebot = false
      }
      if (value) {
        disallowedPaths.push(value)
      }
    }
  }

  return {
    found: true,
    disallowedPaths: [...new Set(disallowedPaths)],
    sitemapUrls: [...new Set(sitemapUrls)],
    allowsGooglebot,
  }
}

function emptyResult(): RobotsResult {
  return { found: false, disallowedPaths: [], sitemapUrls: [], allowsGooglebot: true }
}
