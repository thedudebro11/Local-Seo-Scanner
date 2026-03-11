/**
 * Deterministic above-the-fold checks using Playwright page.evaluate().
 *
 * Every function runs self-contained code inside the browser's JS context —
 * no Node.js closures can be referenced. Arguments are serialized via the
 * page.evaluate(fn, args) second parameter when needed.
 *
 * All functions are safe to call on any page: they catch errors and return
 * a graceful failure result rather than throwing.
 */

import type { Page } from 'playwright'
import type { VisualCheckResult } from './visualTypes'

// ─── CTA above the fold ───────────────────────────────────────────────────────

export async function checkAboveFoldCta(page: Page): Promise<VisualCheckResult> {
  try {
    return await page.evaluate((): { passed: boolean; detail?: string } => {
      const foldY = window.innerHeight
      const ctaRe =
        /\b(call now?|call today|book now?|book online|schedule|request (a )?quote|get (a )?(free )?quote|order now|contact us|get directions|get started|free estimate|speak to us|talk to us)\b/i

      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>('a[href], button, [role="button"]'),
      )

      for (const el of candidates) {
        const rect = el.getBoundingClientRect()
        if (rect.top >= foldY || rect.bottom <= 0) continue
        if (rect.width === 0 || rect.height === 0) continue
        const text = (el.innerText || el.textContent || '').trim()
        if (ctaRe.test(text)) {
          return { passed: true, detail: `CTA found: "${text.slice(0, 60)}"` }
        }
      }

      return { passed: false, detail: 'No strong CTA button or link above the fold' }
    })
  } catch {
    return { passed: false, detail: 'Check could not run' }
  }
}

// ─── Phone visible above the fold ────────────────────────────────────────────

export async function checkPhoneVisible(page: Page): Promise<VisualCheckResult> {
  try {
    return await page.evaluate((): { passed: boolean; detail?: string } => {
      const foldY = window.innerHeight
      const phoneRe = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/

      // Check tel: links first (most reliable signal)
      const telLinks = Array.from(document.querySelectorAll<HTMLElement>('a[href^="tel:"]'))
      for (const el of telLinks) {
        const rect = el.getBoundingClientRect()
        if (rect.top < foldY && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
          return { passed: true, detail: 'Phone tel: link visible above the fold' }
        }
      }

      // Check common header/banner containers for phone text
      const containers = Array.from(
        document.querySelectorAll<HTMLElement>(
          'header, [class*="header"], [class*="top-bar"], [class*="topbar"], [class*="banner"], nav',
        ),
      )
      for (const el of containers) {
        const rect = el.getBoundingClientRect()
        if (rect.top >= foldY || rect.bottom <= 0) continue
        const text = el.innerText || ''
        if (phoneRe.test(text)) {
          return { passed: true, detail: 'Phone number visible in header/nav area' }
        }
      }

      // Fallback: walk all visible elements above fold
      const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
      for (const el of all.slice(0, 300)) {
        if (el.children.length > 0) continue // skip containers
        const rect = el.getBoundingClientRect()
        if (rect.top >= foldY || rect.bottom <= 0) continue
        if (rect.width === 0 || rect.height === 0) continue
        const text = (el.innerText || el.textContent || '').trim()
        if (phoneRe.test(text) && text.length < 100) {
          return { passed: true, detail: 'Phone number text visible above the fold' }
        }
      }

      return { passed: false, detail: 'No phone number visible in first viewport' }
    })
  } catch {
    return { passed: false, detail: 'Check could not run' }
  }
}

// ─── Trust signals near top ───────────────────────────────────────────────────

export async function checkTrustSignals(page: Page): Promise<VisualCheckResult> {
  try {
    return await page.evaluate((): { passed: boolean; detail?: string } => {
      const cutoffY = window.innerHeight * 2.5
      const trustRe =
        /\b(review|testimonial|\d[\d,]*\s*star|rated\s+\d|licensed|insured|bonded|guarantee|family[- ]owned|\d+\s*years?\s*(of\s*)?experience|certified|award|trusted|bbb|accredited)\b/i

      // Walk a bounded set of elements (avoid O(n) on huge pages)
      const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
      for (const el of all.slice(0, 500)) {
        if (el.children.length > 2) continue // skip structural containers
        const rect = el.getBoundingClientRect()
        if (rect.top >= cutoffY || rect.bottom <= 0) continue
        if (rect.width === 0 || rect.height === 0) continue
        const text = (el.innerText || el.textContent || '').trim()
        if (text.length > 400 || text.length === 0) continue
        if (trustRe.test(text)) {
          const match = text.match(trustRe)
          return { passed: true, detail: `Trust signal found: "${match?.[0]}"` }
        }
      }

      return { passed: false, detail: 'No trust signal keywords near top of page' }
    })
  } catch {
    return { passed: false, detail: 'Check could not run' }
  }
}

// ─── Hero clarity ─────────────────────────────────────────────────────────────

export async function checkHeroClarity(page: Page): Promise<VisualCheckResult> {
  try {
    return await page.evaluate((): { passed: boolean; detail?: string } => {
      const foldY = window.innerHeight

      // Find the first H1 and check if it is above the fold with sufficient content
      const h1List = Array.from(document.querySelectorAll<HTMLElement>('h1'))
      for (const h of h1List) {
        const rect = h.getBoundingClientRect()
        if (rect.bottom <= 0 || rect.top >= foldY) continue
        const text = (h.innerText || h.textContent || '').trim()
        const words = text.split(/\s+/).filter(Boolean).length
        if (words >= 3) {
          return { passed: true, detail: `H1 above fold: "${text.slice(0, 80)}"` }
        }
        // H1 exists but is too short
        return {
          passed: false,
          detail: `H1 is too brief (${words} word${words === 1 ? '' : 's'}): "${text.slice(0, 60)}"`,
        }
      }

      // No H1 above the fold — check if any H1 exists at all
      if (h1List.length === 0) {
        return { passed: false, detail: 'No H1 heading found on page' }
      }

      // H1 exists but is below the fold
      const h1Text = (h1List[0].innerText || h1List[0].textContent || '').trim()
      const words = h1Text.split(/\s+/).filter(Boolean).length
      if (words >= 3) {
        return { passed: false, detail: `H1 exists but is below the fold: "${h1Text.slice(0, 60)}"` }
      }

      return { passed: false, detail: `H1 is below the fold and too brief: "${h1Text.slice(0, 60)}"` }
    })
  } catch {
    return { passed: false, detail: 'Check could not run' }
  }
}
