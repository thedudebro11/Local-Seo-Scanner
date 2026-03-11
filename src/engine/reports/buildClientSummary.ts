/**
 * Builds owner-friendly summary strings for the client-facing report.
 * Translates technical findings into plain-language business impact statements.
 */

import type { AuditResult, Finding } from '../types/audit'

export interface ClientSummary {
  /** Issues most likely hurting Google visibility */
  whatIsHurtingVisibility: string[]
  /** Issues most likely hurting phone calls and lead capture */
  whatMayBeHurtingLeads: string[]
  /** Fastest changes that would have the most impact */
  fastestWins: string[]
}

const VISIBILITY_CATEGORIES = new Set(['technical', 'local', 'content'])
const LEADS_CATEGORIES = new Set(['conversion', 'trust'])

function toVisibilityStatement(f: Finding): string {
  return `${f.title} — ${f.summary}`
}

function toLeadStatement(f: Finding): string {
  return `${f.title} — ${f.summary}`
}

export function buildClientSummary(result: AuditResult): ClientSummary {
  const highMedium = result.findings.filter(
    (f) => f.severity === 'high' || f.severity === 'medium',
  )

  const whatIsHurtingVisibility = highMedium
    .filter((f) => VISIBILITY_CATEGORIES.has(f.category))
    .slice(0, 4)
    .map(toVisibilityStatement)

  const whatMayBeHurtingLeads = highMedium
    .filter((f) => LEADS_CATEGORIES.has(f.category))
    .slice(0, 4)
    .map(toLeadStatement)

  const fastestWins = result.quickWins.slice(0, 5)

  return { whatIsHurtingVisibility, whatMayBeHurtingLeads, fastestWins }
}
