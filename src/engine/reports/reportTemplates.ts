/**
 * HTML report helper formatters and section builders.
 * All functions return raw HTML strings — no external dependencies.
 */

import type { Finding, CategoryScore, VisualAnalysisResult } from '../types/audit'

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
