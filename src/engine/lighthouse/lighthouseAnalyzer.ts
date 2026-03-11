/**
 * Converts Lighthouse metrics into structured Findings.
 * These are wired into the main findings list so they affect the technical score.
 *
 * Thresholds are based on Google's Core Web Vitals and Lighthouse guidance.
 */

import type { Finding, LighthouseMetrics } from '../types/audit'

export function analyzeLighthouse(metrics: LighthouseMetrics): Finding[] {
  const findings: Finding[] = []

  // ── Performance score ─────────────────────────────────────────────────────
  if (metrics.performanceScore < 50) {
    findings.push({
      id: 'lh-performance-poor',
      category: 'technical',
      severity: 'high',
      title: `Page performance is poor (Lighthouse score: ${metrics.performanceScore}/100)`,
      summary: `The homepage scored ${metrics.performanceScore}/100 for performance — well below Google's recommended threshold of 90.`,
      whyItMatters:
        'Page speed is a direct Google ranking factor on mobile. A slow site also increases bounce rates — visitors leave before the page loads. For local businesses, most searches happen on mobile.',
      recommendation:
        'Work with a developer to address Core Web Vitals issues. Common fixes: optimize images (use WebP, add width/height), defer render-blocking JavaScript, enable browser caching, and use a CDN.',
      affectedUrls: [metrics.url],
    })
  } else if (metrics.performanceScore < 70) {
    findings.push({
      id: 'lh-performance-needs-work',
      category: 'technical',
      severity: 'medium',
      title: `Page performance needs improvement (Lighthouse score: ${metrics.performanceScore}/100)`,
      summary: `The homepage scored ${metrics.performanceScore}/100 for performance — below Google's recommended threshold.`,
      whyItMatters:
        'Every second of load time increases bounce rates by ~20%. Even a moderate improvement in speed improves both user experience and search rankings.',
      recommendation:
        'Review Lighthouse recommendations: compress images, minimize CSS/JS, and leverage browser caching. Tools like Google PageSpeed Insights provide specific file-level guidance.',
      affectedUrls: [metrics.url],
    })
  }

  // ── Largest Contentful Paint ──────────────────────────────────────────────
  if (metrics.largestContentfulPaint !== undefined) {
    const lcp = metrics.largestContentfulPaint
    if (lcp > 4000) {
      findings.push({
        id: 'lh-lcp-slow',
        category: 'technical',
        severity: 'high',
        title: `Largest Contentful Paint is slow (${(lcp / 1000).toFixed(1)}s)`,
        summary: `LCP is ${(lcp / 1000).toFixed(1)}s — Google's "Good" threshold is under 2.5s.`,
        whyItMatters:
          'LCP measures how long it takes for the main content to appear. Slow LCP signals a poor user experience and is penalized in Google\'s Core Web Vitals ranking.',
        recommendation:
          'Optimize your hero image: compress it, convert to WebP, and preload it with `<link rel="preload">`. Eliminate render-blocking resources above the fold.',
        affectedUrls: [metrics.url],
      })
    } else if (lcp > 2500) {
      findings.push({
        id: 'lh-lcp-needs-work',
        category: 'technical',
        severity: 'medium',
        title: `Largest Contentful Paint needs improvement (${(lcp / 1000).toFixed(1)}s)`,
        summary: `LCP is ${(lcp / 1000).toFixed(1)}s — target is under 2.5s.`,
        whyItMatters:
          'LCP is a Core Web Vitals metric used by Google for ranking. Reducing it improves both SEO and perceived load speed.',
        recommendation:
          'Compress the hero image, use next-gen formats (WebP/AVIF), and preload the LCP image element.',
        affectedUrls: [metrics.url],
      })
    }
  }

  // ── Total Blocking Time ───────────────────────────────────────────────────
  if (metrics.totalBlockingTime !== undefined) {
    const tbt = metrics.totalBlockingTime
    if (tbt > 600) {
      findings.push({
        id: 'lh-tbt-high',
        category: 'technical',
        severity: 'high',
        title: `Page has heavy JavaScript blocking (TBT: ${tbt}ms)`,
        summary: `Total Blocking Time is ${tbt}ms — Google's "Good" threshold is under 200ms.`,
        whyItMatters:
          'High TBT means the browser is busy executing JavaScript and can\'t respond to user input. This makes the page feel frozen and correlates strongly with poor Core Web Vitals scores.',
        recommendation:
          'Audit your JavaScript bundles. Remove unused scripts, split code by route, defer non-critical JS, and replace heavy tracking scripts with lightweight alternatives.',
        affectedUrls: [metrics.url],
      })
    } else if (tbt > 200) {
      findings.push({
        id: 'lh-tbt-medium',
        category: 'technical',
        severity: 'medium',
        title: `JavaScript is causing moderate blocking (TBT: ${tbt}ms)`,
        summary: `Total Blocking Time is ${tbt}ms — target is under 200ms.`,
        whyItMatters:
          'Elevated TBT degrades interactivity scores and user experience, especially on mobile devices.',
        recommendation:
          'Audit third-party scripts (chat widgets, analytics, tracking) and defer any that are not needed on page load.',
        affectedUrls: [metrics.url],
      })
    }
  }

  // ── Cumulative Layout Shift ───────────────────────────────────────────────
  if (metrics.cumulativeLayoutShift !== undefined) {
    const cls = metrics.cumulativeLayoutShift
    if (cls > 0.25) {
      findings.push({
        id: 'lh-cls-high',
        category: 'technical',
        severity: 'high',
        title: `Page has severe layout instability (CLS: ${cls.toFixed(3)})`,
        summary: `Cumulative Layout Shift is ${cls.toFixed(3)} — Google's "Good" threshold is under 0.1.`,
        whyItMatters:
          'CLS measures how much the page jumps around as it loads. A high score frustrates users (and causes mis-clicks) and is a negative Core Web Vitals ranking signal.',
        recommendation:
          'Add explicit width/height attributes to all images and iframes. Avoid inserting content above existing content. Reserve space for ads and embeds with CSS.',
        affectedUrls: [metrics.url],
      })
    } else if (cls > 0.1) {
      findings.push({
        id: 'lh-cls-medium',
        category: 'technical',
        severity: 'medium',
        title: `Page has moderate layout instability (CLS: ${cls.toFixed(3)})`,
        summary: `Cumulative Layout Shift is ${cls.toFixed(3)} — target is under 0.1.`,
        whyItMatters:
          'Layout shifts frustrate users and affect Core Web Vitals scoring.',
        recommendation:
          'Add width and height to images and embeds. Use CSS to reserve space for elements that load dynamically.',
        affectedUrls: [metrics.url],
      })
    }
  }

  // ── Lighthouse SEO score ──────────────────────────────────────────────────
  if (metrics.seoScore < 80) {
    findings.push({
      id: 'lh-seo-low',
      category: 'technical',
      severity: 'medium',
      title: `Lighthouse SEO score is low (${metrics.seoScore}/100)`,
      summary: `Lighthouse flagged technical SEO issues — score is ${metrics.seoScore}/100.`,
      whyItMatters:
        'Lighthouse\'s SEO category checks for crawlability, mobile-friendliness, and metadata correctness — basics that affect how Google indexes the site.',
      recommendation:
        'Run a full Lighthouse audit in Chrome DevTools (F12 → Lighthouse tab) to see the specific SEO issues flagged. Common fixes: add meta description, ensure text is readable without zooming, fix broken links.',
      affectedUrls: [metrics.url],
    })
  }

  return findings
}
