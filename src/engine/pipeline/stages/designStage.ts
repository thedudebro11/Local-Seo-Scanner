/**
 * Design analysis stage.
 *
 * Parses the homepage HTML for signals that indicate design quality,
 * modernity, and technical approach — without needing a visual screenshot
 * or external API. Produces a DesignSignals object stored in ctx.designResult.
 *
 * This runs before scoreStage so the blueprint has full data, but design
 * signals do NOT affect SEO category scores — they feed the blueprint only.
 */

import type { ScanJobContext, PipelineProgressEmitter } from '../types'
import type { DesignSignals, DesignEra } from '../../types/audit'
import { load } from 'cheerio/slim'
import { createLogger } from '../../utils/logger'

const log = createLogger('designStage')

export async function designStage(
  ctx: ScanJobContext,
  emit: PipelineProgressEmitter,
): Promise<void> {
  emit('Analyzing design signals…', 78)

  const homePage = ctx.pages.find((p) => p.pageType === 'home') ?? ctx.pages[0]
  if (!homePage?.html) {
    log.warn('No homepage HTML available for design analysis')
    return
  }

  const $ = load(homePage.html)
  const html = homePage.html

  // ── Responsive ───────────────────────────────────────────────────────────────
  const hasViewportMeta = $('meta[name="viewport"]').length > 0

  // ── Layout primitives ────────────────────────────────────────────────────────
  const tableCount = $('table').length
  const inlineStyleCount = (html.match(/\bstyle\s*=/gi) ?? []).length

  // ── Fonts ────────────────────────────────────────────────────────────────────
  const googleFontFamilies: string[] = []
  $('link[href*="fonts.google"], link[href*="fonts.googleapis"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const match = href.match(/family=([^&:]+)/)
    if (match) {
      match[1].split('|').forEach((f) => {
        const name = f.split(':')[0].replace(/\+/g, ' ').trim()
        if (name && !googleFontFamilies.includes(name)) googleFontFamilies.push(name)
      })
    }
  })

  // ── Icon libraries ───────────────────────────────────────────────────────────
  const hasIconLibrary =
    html.includes('font-awesome') ||
    html.includes('fontawesome') ||
    html.includes('material-icons') ||
    html.includes('ionicons') ||
    html.includes('feathericons') ||
    html.includes('heroicons') ||
    $('link[href*="font-awesome"], link[href*="fontawesome"]').length > 0

  // ── Animation libraries ──────────────────────────────────────────────────────
  const hasAnimationLibrary =
    html.includes('aos.js') ||
    html.includes('data-aos') ||
    html.includes('wow.js') ||
    html.includes('WOW.js') ||
    html.includes('gsap') ||
    html.includes('ScrollReveal') ||
    html.includes('animate.css') ||
    html.includes('data-wow')

  // ── SVG usage ────────────────────────────────────────────────────────────────
  const svgCount = $('svg').length

  // ── CSS files ────────────────────────────────────────────────────────────────
  const cssFileCount = $('link[rel="stylesheet"]').length

  // ── CSS custom properties ────────────────────────────────────────────────────
  const hasCustomProperties = html.includes('var(--') || html.includes(':root')

  // ── Framework / CMS detection ────────────────────────────────────────────────
  const frameworkHint = detectFramework(html, $)

  // ── Scoring ──────────────────────────────────────────────────────────────────
  const { designScore, designEra, issues, strengths } = scoreDesign({
    hasViewportMeta,
    tableCount,
    inlineStyleCount,
    googleFontFamilies,
    hasIconLibrary,
    hasAnimationLibrary,
    svgCount,
    cssFileCount,
    hasCustomProperties,
    frameworkHint,
    wordCount: homePage.wordCount ?? 0,
  })

  ctx.designResult = {
    hasViewportMeta,
    tableCount,
    inlineStyleCount,
    googleFontFamilies,
    hasIconLibrary,
    hasAnimationLibrary,
    frameworkHint,
    svgCount,
    cssFileCount,
    hasCustomProperties,
    designEra,
    designScore,
    issues,
    strengths,
  }

  log.info(
    `Design analysis: era=${designEra} score=${designScore} ` +
    `framework=${frameworkHint} issues=${issues.length}`,
  )
}

// ─── Framework / CMS fingerprinting ──────────────────────────────────────────

type FrameworkHint = DesignSignals['frameworkHint']

function detectFramework(html: string, $: ReturnType<typeof load>): FrameworkHint {
  // WordPress
  if (html.includes('wp-content') || html.includes('wp-includes')) return 'wordpress'

  // Squarespace
  if (html.includes('squarespace') || html.includes('sqsp')) return 'squarespace'

  // Wix
  if (html.includes('wix.com') || html.includes('wixsite')) return 'wix'

  // Tailwind — looks for utility class patterns
  const classAttr = (html.match(/class="[^"]*"/g) ?? []).join(' ')
  if (
    /\b(text-\w+-\d+|bg-\w+-\d+|flex|grid|p-\d+|m-\d+|px-\d+|py-\d+|rounded|shadow|font-bold)\b/.test(classAttr) &&
    classAttr.includes('flex') &&
    classAttr.includes('text-')
  ) return 'tailwind'

  // Bootstrap 5 (data-bs-* attributes)
  if (html.includes('data-bs-') || html.includes('bootstrap.min.css')) {
    if (html.includes('bootstrap@5') || html.includes('bootstrap/5')) return 'bootstrap5'
    if (html.includes('bootstrap@4') || html.includes('bootstrap/4')) return 'bootstrap4'
    return 'bootstrap5'
  }

  // Bootstrap 3 (glyphicon is BS3-specific)
  if (html.includes('glyphicon') || html.includes('bootstrap/3')) return 'bootstrap3'

  // Generic Bootstrap detection from class names
  if ($('.navbar').length || $('.container-fluid').length) {
    if (html.includes('data-toggle') && !html.includes('data-bs-')) return 'bootstrap4'
  }

  // Some form of CSS framework but not identified
  if (cssFileCount($) > 1 && !html.includes('inline') && !html.includes('style=')) return 'custom'

  return 'unknown'
}

function cssFileCount($: ReturnType<typeof load>): number {
  return $('link[rel="stylesheet"]').length
}

// ─── Design scoring ──────────────────────────────────────────────────────────

interface DesignInputs {
  hasViewportMeta: boolean
  tableCount: number
  inlineStyleCount: number
  googleFontFamilies: string[]
  hasIconLibrary: boolean
  hasAnimationLibrary: boolean
  svgCount: number
  cssFileCount: number
  hasCustomProperties: boolean
  frameworkHint: FrameworkHint
  wordCount: number
}

function scoreDesign(input: DesignInputs): {
  designScore: number
  designEra: DesignEra
  issues: string[]
  strengths: string[]
} {
  const issues: string[] = []
  const strengths: string[] = []
  let score = 100

  // Responsive viewport (major signal)
  if (!input.hasViewportMeta) {
    issues.push('No responsive viewport meta tag — site is not mobile-optimized')
    score -= 25
  } else {
    strengths.push('Mobile viewport configured')
  }

  // Table-based layout (dated signal)
  if (input.tableCount > 10) {
    issues.push(`Heavy table-based layout (${input.tableCount} tables) — strongly suggests pre-2015 design`)
    score -= 20
  } else if (input.tableCount > 4) {
    issues.push(`Some table-based layout detected (${input.tableCount} tables) — may indicate older template`)
    score -= 8
  }

  // Inline styles (messiness / dated signal)
  if (input.inlineStyleCount > 50) {
    issues.push(`Excessive inline styles (${input.inlineStyleCount}) — design is hard to maintain and likely inconsistent`)
    score -= 12
  } else if (input.inlineStyleCount > 20) {
    issues.push(`High inline style usage (${input.inlineStyleCount}) — suggests templated or builder-generated code`)
    score -= 5
  }

  // Fonts
  if (input.googleFontFamilies.length === 0) {
    issues.push('No Google Fonts detected — likely using default system or web-safe fonts')
    score -= 8
  } else if (input.googleFontFamilies.length === 1) {
    strengths.push(`Custom font loaded: ${input.googleFontFamilies[0]}`)
  } else if (input.googleFontFamilies.length <= 3) {
    strengths.push(`Custom fonts: ${input.googleFontFamilies.join(', ')}`)
  } else {
    issues.push(`Too many fonts loaded (${input.googleFontFamilies.length}) — slows page and creates visual noise`)
    score -= 5
  }

  // Icons
  if (input.hasIconLibrary) {
    strengths.push('Icon library in use — visual hierarchy supported')
  } else if (input.svgCount > 3) {
    strengths.push('Inline SVG icons in use')
  } else {
    issues.push('No icon library or SVG icons detected — design may lack visual hierarchy')
    score -= 5
  }

  // Animation / interactivity
  if (input.hasAnimationLibrary) {
    strengths.push('Animation library detected — site has interactive/dynamic feel')
  }

  // CSS custom properties
  if (input.hasCustomProperties) {
    strengths.push('CSS custom properties in use — modern, maintainable stylesheet')
  }

  // Framework
  if (input.frameworkHint === 'wix') {
    issues.push('Built on Wix — limited SEO control, slower performance, no custom code ownership')
    score -= 10
  } else if (input.frameworkHint === 'squarespace') {
    issues.push('Built on Squarespace — limited schema control, moderate SEO constraints')
    score -= 5
  } else if (input.frameworkHint === 'wordpress') {
    strengths.push('WordPress — good plugin ecosystem for SEO')
  } else if (input.frameworkHint === 'tailwind') {
    strengths.push('Tailwind CSS — modern utility-first framework')
  } else if (input.frameworkHint === 'bootstrap5') {
    strengths.push('Bootstrap 5 — modern responsive framework')
  } else if (input.frameworkHint === 'bootstrap3') {
    issues.push('Bootstrap 3 detected — outdated framework (2013–2019), consider upgrading')
    score -= 8
  }

  // No CSS files at all
  if (input.cssFileCount === 0) {
    issues.push('No external CSS files — design likely relies entirely on inline styles')
    score -= 10
  }

  const designScore = Math.max(0, Math.min(100, score))
  const designEra = classifyEra(designScore, input)

  return { designScore, designEra, issues, strengths }
}

function classifyEra(score: number, input: DesignInputs): DesignEra {
  if (input.tableCount > 8 || !input.hasViewportMeta) return 'old'
  if (score >= 75) return 'modern'
  if (score >= 50) return 'standard'
  if (score >= 30) return 'dated'
  return 'old'
}
