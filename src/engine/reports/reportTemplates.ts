/**
 * HTML report helper formatters and section builders.
 * All functions return raw HTML strings — no external dependencies.
 */

import type { Finding, CategoryScore, ImpactLevel, VisualAnalysisResult, CompetitorAnalysisResult } from '../types/audit'

// ─── Score colors ─────────────────────────────────────────────────────────────

export function scoreColor(value: number): string {
  if (value >= 85) return '#16a34a'   // green  — Strong
  if (value >= 70) return '#2563eb'   // blue   — Solid
  if (value >= 55) return '#d97706'   // amber  — Needs Work
  return '#dc2626'                    // red    — Leaking Opportunity
}

export function severityColor(severity: Finding['severity']): string {
  if (severity === 'high')   return '#dc2626'
  if (severity === 'medium') return '#d97706'
  return '#6b7280'
}

export function severityBg(severity: Finding['severity']): string {
  if (severity === 'high')   return '#fef2f2'
  if (severity === 'medium') return '#fffbeb'
  return '#f9fafb'
}

export function impactColor(level: ImpactLevel): string {
  if (level === 'CRITICAL') return '#7c3aed'
  if (level === 'HIGH')     return '#dc2626'
  if (level === 'MEDIUM')   return '#d97706'
  return '#6b7280'
}

// ─── Section builders ─────────────────────────────────────────────────────────

export function renderScoreCard(label: string, score: CategoryScore): string {
  const color = scoreColor(score.value)
  return `
    <div class="score-card">
      <div class="score-card-value" style="color:${color}">${score.value}</div>
      <div class="score-card-label">${label}</div>
      <div class="score-card-band" style="color:${color}">${score.label}</div>
    </div>`
}

export function renderFinding(f: Finding): string {
  const color = severityColor(f.severity)
  const bg = severityBg(f.severity)
  const affectedHtml = f.affectedUrls && f.affectedUrls.length > 0
    ? `<div class="affected-urls"><strong>Affected:</strong> ${f.affectedUrls.slice(0, 3).map(u => `<code>${u}</code>`).join(', ')}${f.affectedUrls.length > 3 ? ` +${f.affectedUrls.length - 3} more` : ''}</div>`
    : ''
  const impactHtml = f.impactLevel
    ? `<div class="finding-impact" style="border-top:1px solid ${color}22;margin-top:8px;padding-top:8px">
        <span class="impact-badge" style="background:${impactColor(f.impactLevel)}">${f.impactLevel}</span>
        <span style="font-size:12px;color:#4b5563">${escHtml(f.impactReason ?? '')}</span>
        ${f.estimatedBusinessEffect ? `<div style="font-size:12px;color:#6b7280;margin-top:3px"><strong>Business effect:</strong> ${escHtml(f.estimatedBusinessEffect)}</div>` : ''}
      </div>`
    : ''
  return `
    <div class="finding" style="background:${bg};border-left:4px solid ${color}">
      <div class="finding-header">
        <span class="severity-badge" style="background:${color}">${f.severity.toUpperCase()}</span>
        <span class="finding-title">${escHtml(f.title)}</span>
      </div>
      <p class="finding-summary">${escHtml(f.summary)}</p>
      <div class="finding-detail">
        <p><strong>Why it matters:</strong> ${escHtml(f.whyItMatters)}</p>
        <p><strong>What to do:</strong> ${escHtml(f.recommendation)}</p>
      </div>
      ${affectedHtml}
      ${impactHtml}
    </div>`
}

export function renderBulletList(items: string[], emptyMsg = 'None detected.'): string {
  if (items.length === 0) return `<p class="empty">${emptyMsg}</p>`
  return `<ul>${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    technical: 'Technical SEO',
    localSeo: 'Local SEO',
    conversion: 'Conversion',
    content: 'Content',
    trust: 'Trust & Credibility',
  }
  return labels[cat] ?? cat
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Revenue Impact Summary section ───────────────────────────────────────────

const IMPACT_ORDER: ImpactLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  CRITICAL: '🚨 CRITICAL',
  HIGH:     '🔴 HIGH',
  MEDIUM:   '🟡 MEDIUM',
  LOW:      '🔵 LOW',
}

export function renderImpactSummarySection(findings: Finding[]): string {
  const withImpact = findings.filter((f) => f.impactLevel)
  if (withImpact.length === 0) return ''

  const counts = IMPACT_ORDER.reduce<Partial<Record<ImpactLevel, Finding[]>>>((acc, lvl) => {
    const group = withImpact.filter((f) => f.impactLevel === lvl)
    if (group.length > 0) acc[lvl] = group
    return acc
  }, {})

  const rows = IMPACT_ORDER.filter((lvl) => counts[lvl])
    .map((lvl) => {
      const group = counts[lvl]!
      const color = impactColor(lvl)
      const topFindings = group.slice(0, 3).map((f) =>
        `<li style="font-size:13px;color:#374151;margin-bottom:3px">${escHtml(f.title)}${f.estimatedBusinessEffect ? ` — <span style="color:#6b7280">${escHtml(f.estimatedBusinessEffect)}</span>` : ''}</li>`
      ).join('')
      const more = group.length > 3 ? `<li style="font-size:12px;color:#9ca3af">+${group.length - 3} more</li>` : ''
      return `
      <div style="display:flex;gap:16px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #f1f5f9">
        <div style="min-width:110px;text-align:center">
          <div style="font-size:22px;font-weight:900;color:${color};line-height:1">${group.length}</div>
          <div style="font-size:11px;font-weight:700;color:${color};margin-top:2px;letter-spacing:0.5px">${IMPACT_LABEL[lvl]}</div>
        </div>
        <ul style="list-style:none;padding:0;margin:0;flex:1">${topFindings}${more}</ul>
      </div>`
    }).join('')

  return `
  <div class="section impact-summary">
    <h2>🚨 Revenue Impact Summary</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Issues ranked by estimated business damage — fix CRITICAL and HIGH items first for the fastest return.</p>
    ${rows}
  </div>`
}

// ─── Competitor Gap Analysis section ──────────────────────────────────────────

export function renderCompetitorSection(comp: CompetitorAnalysisResult): string {
  const successfulSites = comp.competitors.filter((c) => !c.crawlError)

  const siteRows = comp.competitors.map((c) => {
    const status = c.crawlError
      ? `<span style="color:#dc2626">Error: ${escHtml(c.crawlError)}</span>`
      : `<span style="color:#16a34a">${c.pageCount} pages</span>`
    const boolCell = (v: boolean) => v
      ? `<span style="color:#16a34a;font-weight:700">✓</span>`
      : `<span style="color:#9ca3af">—</span>`
    return `
      <tr>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;font-family:monospace;word-break:break-all">${escHtml(c.domain)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center">${status}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${boolCell(c.hasLocalBusinessSchema)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${boolCell(c.hasPhone)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${boolCell(c.hasMap)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${boolCell(c.hasHours)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${boolCell(c.hasForm)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${c.servicePageCount}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${c.avgWordCount > 0 ? c.avgWordCount : '—'}</td>
      </tr>`
  }).join('')

  const gapItems = comp.gaps.length > 0
    ? comp.gaps.map((g) => `
      <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;padding:12px 16px;margin-bottom:10px">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escHtml(g.title)}</div>
        <p style="font-size:13px;color:#374151;margin-bottom:6px">${escHtml(g.description)}</p>
        <p style="font-size:13px;color:#374151"><strong>Action:</strong> ${escHtml(g.recommendation)}</p>
        <div style="font-size:11px;color:#6b7280;margin-top:4px">Competitors ahead: ${g.competitorDomains.map(escHtml).join(', ')}</div>
      </div>`).join('')
    : `<p style="color:#16a34a;font-size:14px">✓ No significant gaps found — you match or exceed competitors on all measured signals.</p>`

  return `
  <div class="section">
    <h2>🏆 Competitor Gap Analysis</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">${successfulSites.length} of ${comp.competitors.length} competitor site${comp.competitors.length !== 1 ? 's' : ''} crawled successfully. Gaps shown where ≥60% of competitors have an advantage.</p>

    <h3 style="font-size:14px;font-weight:700;margin-bottom:10px">Competitor Signal Summary</h3>
    <div style="overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f8fafc">
          <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Domain</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Status</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Schema</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Phone</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Map</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Hours</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Form</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Svc Pages</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Avg Words</th>
        </tr></thead>
        <tbody>${siteRows}</tbody>
      </table>
    </div>

    <h3 style="font-size:14px;font-weight:700;margin-bottom:10px">Gaps to Close</h3>
    ${gapItems}
  </div>`
}

// ─── Visual Analysis section ───────────────────────────────────────────────────

const VISUAL_CHECK_LABELS: Record<string, string> = {
  hasHeroClarity:           'Hero headline clarity',
  hasAboveFoldCta:          'CTA above the fold',
  hasPhoneVisible:          'Phone visible above fold',
  hasTrustSignalsVisible:   'Trust signals near top',
}

export function renderVisualSection(visual: VisualAnalysisResult): string {
  const homepage = visual.pagesAnalyzed.find((p) => p.pageType === 'homepage')

  const screenshotCards = visual.pagesAnalyzed
    .filter((p) => p.screenshotFile)
    .map((p) => {
      const label = p.pageType.charAt(0).toUpperCase() + p.pageType.slice(1)
      return `
      <div class="screenshot-card">
        <img class="screenshot-img" src="screenshots/${escHtml(p.screenshotFile!)}"
             alt="${label} screenshot"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="screenshot-missing" style="display:none">Screenshot unavailable</div>
        <div class="screenshot-label">${escHtml(label)}</div>
      </div>`
    })
    .join('')

  const checksRows = homepage
    ? Object.entries(homepage.checks)
        .map(([key, res]) => {
          const label = VISUAL_CHECK_LABELS[key] ?? key
          const icon  = res.passed ? '✓' : '✗'
          const color = res.passed ? '#16a34a' : '#dc2626'
          return `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${escHtml(label)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${color}">${icon} ${res.passed ? 'Pass' : 'Fail'}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#6b7280">${escHtml(res.detail ?? '')}</td>
        </tr>`
        })
        .join('')
    : ''

  return `
  <div class="section">
    <h2>🖥️ Visual UX Analysis</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Above-the-fold checks on the homepage at 1280×800px. Screenshots are saved alongside this report.</p>
    ${screenshotCards ? `<div class="screenshot-row">${screenshotCards}</div>` : ''}
    ${checksRows ? `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:${screenshotCards ? '20px' : '0'}">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Check</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Result</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Detail</th>
      </tr></thead>
      <tbody>${checksRows}</tbody>
    </table>` : ''}
  </div>`
}
