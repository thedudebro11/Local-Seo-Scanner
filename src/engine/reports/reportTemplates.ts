/**
 * HTML report helper formatters and section builders.
 * All functions return raw HTML strings — no external dependencies.
 */

import type { Finding, CategoryScore } from '../types/audit'

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
    local: 'Local SEO',
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
