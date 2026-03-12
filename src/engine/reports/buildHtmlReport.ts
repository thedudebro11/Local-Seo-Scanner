/**
 * HTML report builder.
 * Generates a self-contained, print-friendly HTML report for the business owner.
 * No external CSS or JS dependencies — everything is inlined.
 */

import fs from 'fs-extra'
import path from 'path'
import type { AuditResult } from '../types/audit'
import { createLogger } from '../utils/logger'
import {
  scoreColor, renderScoreCard, renderFinding, renderBulletList,
  categoryLabel, escHtml, formatDate, renderVisualSection, renderCompetitorSection,
  renderImpactSummarySection,
} from './reportTemplates'
import { buildClientSummary } from './buildClientSummary'

const log = createLogger('buildHtmlReport')

export async function buildHtmlReport(result: AuditResult, htmlPath: string): Promise<string> {
  await fs.ensureDir(path.dirname(htmlPath))
  const html = generateHtml(result)
  await fs.writeFile(htmlPath, html, 'utf8')
  log.info(`HTML report written: ${htmlPath}`)
  return htmlPath
}

// ─── Generator ────────────────────────────────────────────────────────────────

function generateHtml(r: AuditResult): string {
  const overall = r.scores.overall
  const overallColor = scoreColor(overall.value)
  const summary = buildClientSummary(r)
  const date = formatDate(r.scannedAt)

  // Group findings by category order
  const categoryOrder = ['localSeo', 'technical', 'conversion', 'content', 'trust']
  const findingsByCategory = categoryOrder.map((cat) => ({
    cat,
    findings: r.findings.filter((f) => f.category === cat),
  })).filter((g) => g.findings.length > 0)

  const scoreCards = [
    renderScoreCard('Local SEO', r.scores.localSeo),
    renderScoreCard('Technical SEO', r.scores.technical),
    renderScoreCard('Conversion', r.scores.conversion),
    renderScoreCard('Content', r.scores.content),
    renderScoreCard('Trust', r.scores.trust),
  ].join('')

  const findingSections = findingsByCategory.map(({ cat, findings }) => `
    <div class="findings-group">
      <h3 class="category-heading">${categoryLabel(cat)} <span class="finding-count">${findings.length} issue${findings.length !== 1 ? 's' : ''}</span></h3>
      ${findings.map(renderFinding).join('')}
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit — ${escHtml(r.domain)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937; background: #f8fafc; }
    a { color: #2563eb; }
    code { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; word-break: break-all; }
    .container { max-width: 900px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .report-header { background: #0f172a; color: #fff; padding: 32px 40px; border-radius: 12px; margin-bottom: 32px; }
    .report-header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
    .report-domain { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
    .report-meta { font-size: 13px; color: #94a3b8; }

    /* Overall score */
    .overall-block { display: flex; align-items: center; gap: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px 32px; margin-bottom: 24px; }
    .overall-number { font-size: 72px; font-weight: 900; line-height: 1; }
    .overall-label { font-size: 24px; font-weight: 700; }
    .overall-sub { font-size: 14px; color: #6b7280; margin-top: 4px; }

    /* Score cards */
    .scores-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 32px; }
    .score-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 12px; text-align: center; }
    .score-card-value { font-size: 32px; font-weight: 800; }
    .score-card-label { font-size: 12px; color: #374151; font-weight: 600; margin: 2px 0; }
    .score-card-band { font-size: 11px; font-weight: 500; }

    /* Sections */
    .section { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px 28px; margin-bottom: 24px; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
    .section ul { padding-left: 20px; }
    .section li { margin-bottom: 8px; color: #374151; }
    .section .empty { color: #9ca3af; font-style: italic; }

    /* Money leaks */
    .money-leaks { border-color: #fecaca; }
    .money-leaks h2 { color: #dc2626; }

    /* Impact summary */
    .impact-summary { border-color: #ede9fe; }
    .impact-summary h2 { color: #7c3aed; }
    .impact-badge { font-size: 9px; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; margin-right: 6px; vertical-align: middle; }
    .finding-impact { font-size: 12px; }

    /* Quick wins */
    .quick-wins { border-color: #bbf7d0; }
    .quick-wins h2 { color: #16a34a; }

    /* Client summary */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .summary-col h3 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 10px; }
    .summary-col ul { padding-left: 18px; }
    .summary-col li { font-size: 14px; margin-bottom: 6px; }

    /* Findings */
    .findings-group { margin-bottom: 28px; }
    .category-heading { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #1f2937; }
    .finding-count { font-size: 12px; font-weight: 500; background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 20px; margin-left: 8px; }
    .finding { border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
    .finding-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .severity-badge { font-size: 10px; font-weight: 700; color: #fff; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; flex-shrink: 0; }
    .finding-title { font-weight: 600; font-size: 14px; }
    .finding-summary { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .finding-detail { font-size: 13px; color: #4b5563; }
    .finding-detail p { margin-bottom: 4px; }
    .affected-urls { font-size: 12px; color: #6b7280; margin-top: 6px; }

    /* Rationale table */
    .rationale-list { list-style: none; padding: 0; }
    .rationale-list li { font-size: 13px; padding: 4px 0; color: #374151; }
    .rationale-list li:before { content: "• "; color: #9ca3af; }

    /* Footer */
    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }

    /* Lighthouse pills */
    .lh-pill { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 20px; text-align: center; min-width: 110px; }
    .lh-pill-val { font-size: 36px; font-weight: 800; line-height: 1; }
    .lh-pill-label { font-size: 12px; font-weight: 600; color: #6b7280; margin-top: 4px; }

    /* Visual analysis screenshots */
    .screenshot-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .screenshot-card { flex: 1; min-width: 180px; max-width: 300px; }
    .screenshot-img { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; display: block; }
    .screenshot-missing { font-size: 12px; color: #9ca3af; font-style: italic; padding: 40px 0; text-align: center; border: 1px dashed #e5e7eb; border-radius: 6px; }
    .screenshot-label { font-size: 12px; font-weight: 600; color: #374151; margin-top: 6px; text-align: center; }

    @media print {
      body { background: #fff; }
      .container { padding: 16px; }
      .report-header { border-radius: 4px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="report-header">
    <h1>Local SEO Audit Report</h1>
    <div class="report-domain">${escHtml(r.domain)}</div>
    <div class="report-meta">Scanned ${date} · ${r.request.scanMode} scan · ${r.pages.length} page${r.pages.length !== 1 ? 's' : ''} crawled · ${escHtml(r.detectedBusinessType.replace('_', ' '))} business</div>
  </div>

  <!-- Overall score -->
  <div class="overall-block">
    <div class="overall-number" style="color:${overallColor}">${overall.value}</div>
    <div>
      <div class="overall-label" style="color:${overallColor}">${escHtml(overall.label)}</div>
      <div class="overall-sub">Overall Local SEO Score (out of 100)</div>
      <div class="overall-sub">${r.findings.length} issue${r.findings.length !== 1 ? 's' : ''} found — ${r.findings.filter(f => f.severity === 'high').length} high priority</div>
    </div>
  </div>

  <!-- Category scores -->
  <div class="scores-grid">
    ${scoreCards}
  </div>

  <!-- What's hurting the business -->
  ${(summary.whatIsHurtingVisibility.length > 0 || summary.whatMayBeHurtingLeads.length > 0) ? `
  <div class="section">
    <h2>What's Holding This Business Back</h2>
    <div class="summary-grid">
      <div class="summary-col">
        <h3>Hurting Google Visibility</h3>
        ${renderBulletList(summary.whatIsHurtingVisibility, 'No major visibility issues found.')}
      </div>
      <div class="summary-col">
        <h3>Hurting Lead Capture</h3>
        ${renderBulletList(summary.whatMayBeHurtingLeads, 'No major conversion issues found.')}
      </div>
    </div>
  </div>` : ''}

  <!-- Money leaks -->
  ${r.moneyLeaks.length > 0 ? `
  <div class="section money-leaks">
    <h2>🚨 Revenue-Impacting Issues</h2>
    ${renderBulletList(r.moneyLeaks)}
  </div>` : ''}

  <!-- Revenue Impact Summary -->
  ${renderImpactSummarySection(r.findings)}

  <!-- Quick wins -->
  ${r.quickWins.length > 0 ? `
  <div class="section quick-wins">
    <h2>✅ Quick Wins (Highest-Impact Actions)</h2>
    ${renderBulletList(r.quickWins)}
  </div>` : ''}

  <!-- Lighthouse / Core Web Vitals -->
  ${r.lighthouse && r.lighthouse.length > 0 ? (() => {
    const lh = r.lighthouse[0]
    const perfColor = scoreColor(lh.performanceScore)
    const seoColor  = scoreColor(lh.seoScore)
    const a11yColor = scoreColor(lh.accessibilityScore)
    const ms = (v?: number) => v !== undefined ? `${(v / 1000).toFixed(2)}s` : '—'
    const cls = (v?: number) => v !== undefined ? v.toFixed(3) : '—'
    const pill = (label: string, val: number, color: string) =>
      `<div class="lh-pill"><div class="lh-pill-val" style="color:${color}">${val}</div><div class="lh-pill-label">${label}</div></div>`
    return `
  <div class="section">
    <h2>⚡ Page Speed &amp; Core Web Vitals</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Measured on mobile · Powered by Lighthouse · URL: <code>${escHtml(lh.url)}</code></p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      ${pill('Performance', lh.performanceScore, perfColor)}
      ${pill('SEO', lh.seoScore, seoColor)}
      ${pill('Accessibility', lh.accessibilityScore, a11yColor)}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Metric</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Value</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Target</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">First Contentful Paint</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${ms(lh.firstContentfulPaint)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 1.8s</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Largest Contentful Paint</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${ms(lh.largestContentfulPaint)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 2.5s</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Total Blocking Time</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${lh.totalBlockingTime !== undefined ? lh.totalBlockingTime + 'ms' : '—'}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 200ms</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Cumulative Layout Shift</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${cls(lh.cumulativeLayoutShift)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 0.1</td></tr>
        <tr><td style="padding:8px 12px">Speed Index</td><td style="padding:8px 12px">${ms(lh.speedIndex)}</td><td style="padding:8px 12px;color:#6b7280">&lt; 3.4s</td></tr>
      </tbody>
    </table>
  </div>`
  })() : ''}

  <!-- Visual UX Analysis -->
  ${r.visual && r.visual.pagesAnalyzed.length > 0 ? renderVisualSection(r.visual) : ''}

  <!-- Competitor Gap Analysis -->
  ${r.competitor && r.competitor.competitors.length > 0 ? renderCompetitorSection(r.competitor) : ''}

  <!-- All findings -->
  <div class="section">
    <h2>All Issues Found (${r.findings.length} total)</h2>
    ${r.findings.length === 0
      ? '<p class="empty">No issues detected. Great job!</p>'
      : findingSections
    }
  </div>

  <!-- Score rationale -->
  <div class="section">
    <h2>Score Breakdown Detail</h2>
    ${(['technical', 'localSeo', 'conversion', 'content', 'trust'] as const).map(cat => {
      const score = r.scores[cat]
      const color = scoreColor(score.value)
      return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <span style="font-weight:700;font-size:24px;color:${color}">${score.value}</span>
          <div>
            <div style="font-weight:600">${categoryLabel(cat)}</div>
            <div style="font-size:12px;color:${color}">${escHtml(score.label)}</div>
          </div>
        </div>
        <ul class="rationale-list">
          ${score.rationale.map(r => `<li>${escHtml(r)}</li>`).join('')}
        </ul>
      </div>`
    }).join('')}
  </div>

  <div class="footer">
    Generated by Local SEO Scanner &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; Scan ID: ${escHtml(r.id)}
  </div>

</div>
</body>
</html>`
}
