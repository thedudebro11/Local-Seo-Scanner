"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const scanRepository = require("./scanRepository-CxNMbKnN.js");
const fs = require("fs-extra");
const path = require("path");
const index = require("../index.js");
const cheerio = require("cheerio/slim");
require("electron");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const cheerio__namespace = /* @__PURE__ */ _interopNamespaceDefault(cheerio);
function createScanJobContext(request) {
  return {
    request,
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    // Populated by validateStage
    scanId: "",
    normalizedUrl: "",
    domain: "",
    // Populated by crawlStage
    rawPages: [],
    robotsFound: false,
    sitemapFound: false,
    screenshotPaths: {},
    // Populated by extractStage
    pages: [],
    detectedBusinessType: request.businessType !== "auto" ? request.businessType : "other",
    // Populated by analysisStage
    categoryFindings: { technical: [], localSeo: [], conversion: [], content: [], trust: [] },
    allFindings: [],
    // Populated by impactStage
    lighthouseMetrics: [],
    // Populated by scoreStage
    scores: buildPlaceholderScores(),
    quickWins: [],
    moneyLeaks: [],
    // Populated by reportStage
    artifacts: {}
  };
}
function buildPlaceholderScores() {
  const make = () => ({ value: 0, label: "Leaking Opportunity", rationale: [] });
  return {
    technical: make(),
    localSeo: make(),
    conversion: make(),
    content: make(),
    trust: make(),
    overall: make()
  };
}
const log$n = scanRepository.createLogger("buildJsonReport");
async function buildJsonReport(result, jsonPath) {
  await fs.ensureDir(path.dirname(jsonPath));
  const slim = {
    ...result,
    pages: result.pages.map(({ html: _html, textContent: _tc, ...rest }) => rest)
  };
  await fs.writeJson(jsonPath, slim, { spaces: 2 });
  log$n.info(`JSON report written: ${jsonPath}`);
  return jsonPath;
}
function scoreColor(value) {
  if (value >= 85) return "#16a34a";
  if (value >= 70) return "#2563eb";
  if (value >= 55) return "#d97706";
  return "#dc2626";
}
function severityColor(severity) {
  if (severity === "high") return "#dc2626";
  if (severity === "medium") return "#d97706";
  return "#6b7280";
}
function severityBg(severity) {
  if (severity === "high") return "#fef2f2";
  if (severity === "medium") return "#fffbeb";
  return "#f9fafb";
}
function impactColor(level) {
  if (level === "CRITICAL") return "#7c3aed";
  if (level === "HIGH") return "#dc2626";
  if (level === "MEDIUM") return "#d97706";
  return "#6b7280";
}
function renderScoreCard(label, score) {
  const color = scoreColor(score.value);
  return `
    <div class="score-card">
      <div class="score-card-value" style="color:${color}">${score.value}</div>
      <div class="score-card-label">${label}</div>
      <div class="score-card-band" style="color:${color}">${score.label}</div>
    </div>`;
}
function renderFinding(f) {
  const color = severityColor(f.severity);
  const bg = severityBg(f.severity);
  const affectedHtml = f.affectedUrls && f.affectedUrls.length > 0 ? `<div class="affected-urls"><strong>Affected:</strong> ${f.affectedUrls.slice(0, 3).map((u) => `<code>${u}</code>`).join(", ")}${f.affectedUrls.length > 3 ? ` +${f.affectedUrls.length - 3} more` : ""}</div>` : "";
  const impactHtml = f.impactLevel ? `<div class="finding-impact" style="border-top:1px solid ${color}22;margin-top:8px;padding-top:8px">
        <span class="impact-badge" style="background:${impactColor(f.impactLevel)}">${f.impactLevel}</span>
        <span style="font-size:12px;color:#4b5563">${escHtml(f.impactReason ?? "")}</span>
        ${f.estimatedBusinessEffect ? `<div style="font-size:12px;color:#6b7280;margin-top:3px"><strong>Business effect:</strong> ${escHtml(f.estimatedBusinessEffect)}</div>` : ""}
      </div>` : "";
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
    </div>`;
}
function renderBulletList(items, emptyMsg = "None detected.") {
  if (items.length === 0) return `<p class="empty">${emptyMsg}</p>`;
  return `<ul>${items.map((i) => `<li>${escHtml(i)}</li>`).join("")}</ul>`;
}
function categoryLabel(cat) {
  const labels = {
    technical: "Technical SEO",
    localSeo: "Local SEO",
    conversion: "Conversion",
    content: "Content",
    trust: "Trust & Credibility"
  };
  return labels[cat] ?? cat;
}
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return iso;
  }
}
const IMPACT_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const IMPACT_LABEL = {
  CRITICAL: "🚨 CRITICAL",
  HIGH: "🔴 HIGH",
  MEDIUM: "🟡 MEDIUM",
  LOW: "🔵 LOW"
};
function renderImpactSummarySection(findings) {
  const withImpact = findings.filter((f) => f.impactLevel);
  if (withImpact.length === 0) return "";
  const counts = IMPACT_ORDER.reduce((acc, lvl) => {
    const group = withImpact.filter((f) => f.impactLevel === lvl);
    if (group.length > 0) acc[lvl] = group;
    return acc;
  }, {});
  const rows = IMPACT_ORDER.filter((lvl) => counts[lvl]).map((lvl) => {
    const group = counts[lvl];
    const color = impactColor(lvl);
    const topFindings = group.slice(0, 3).map(
      (f) => `<li style="font-size:13px;color:#374151;margin-bottom:3px">${escHtml(f.title)}${f.estimatedBusinessEffect ? ` — <span style="color:#6b7280">${escHtml(f.estimatedBusinessEffect)}</span>` : ""}</li>`
    ).join("");
    const more = group.length > 3 ? `<li style="font-size:12px;color:#9ca3af">+${group.length - 3} more</li>` : "";
    return `
      <div style="display:flex;gap:16px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #f1f5f9">
        <div style="min-width:110px;text-align:center">
          <div style="font-size:22px;font-weight:900;color:${color};line-height:1">${group.length}</div>
          <div style="font-size:11px;font-weight:700;color:${color};margin-top:2px;letter-spacing:0.5px">${IMPACT_LABEL[lvl]}</div>
        </div>
        <ul style="list-style:none;padding:0;margin:0;flex:1">${topFindings}${more}</ul>
      </div>`;
  }).join("");
  return `
  <div class="section impact-summary">
    <h2>🚨 Revenue Impact Summary</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Issues ranked by estimated business damage — fix CRITICAL and HIGH items first for the fastest return.</p>
    ${rows}
  </div>`;
}
function renderCompetitorSection(comp) {
  const successfulSites = comp.competitors.filter((c) => !c.crawlError);
  const siteRows = comp.competitors.map((c) => {
    const status = c.crawlError ? `<span style="color:#dc2626">Error: ${escHtml(c.crawlError)}</span>` : `<span style="color:#16a34a">${c.pageCount} pages</span>`;
    const boolCell = (v) => v ? `<span style="color:#16a34a;font-weight:700">✓</span>` : `<span style="color:#9ca3af">—</span>`;
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
        <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${c.avgWordCount > 0 ? c.avgWordCount : "—"}</td>
      </tr>`;
  }).join("");
  const gapItems = comp.gaps.length > 0 ? comp.gaps.map((g) => `
      <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;padding:12px 16px;margin-bottom:10px">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escHtml(g.title)}</div>
        <p style="font-size:13px;color:#374151;margin-bottom:6px">${escHtml(g.description)}</p>
        <p style="font-size:13px;color:#374151"><strong>Action:</strong> ${escHtml(g.recommendation)}</p>
        <div style="font-size:11px;color:#6b7280;margin-top:4px">Competitors ahead: ${g.competitorDomains.map(escHtml).join(", ")}</div>
      </div>`).join("") : `<p style="color:#16a34a;font-size:14px">✓ No significant gaps found — you match or exceed competitors on all measured signals.</p>`;
  return `
  <div class="section">
    <h2>🏆 Competitor Gap Analysis</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">${successfulSites.length} of ${comp.competitors.length} competitor site${comp.competitors.length !== 1 ? "s" : ""} crawled successfully. Gaps shown where ≥60% of competitors have an advantage.</p>

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
  </div>`;
}
const VISUAL_CHECK_LABELS = {
  hasHeroClarity: "Hero headline clarity",
  hasAboveFoldCta: "CTA above the fold",
  hasPhoneVisible: "Phone visible above fold",
  hasTrustSignalsVisible: "Trust signals near top"
};
function renderVisualSection(visual) {
  const homepage2 = visual.pagesAnalyzed.find((p) => p.pageType === "homepage");
  const screenshotCards = visual.pagesAnalyzed.filter((p) => p.screenshotFile).map((p) => {
    const label = p.pageType.charAt(0).toUpperCase() + p.pageType.slice(1);
    return `
      <div class="screenshot-card">
        <img class="screenshot-img" src="screenshots/${escHtml(p.screenshotFile)}"
             alt="${label} screenshot"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="screenshot-missing" style="display:none">Screenshot unavailable</div>
        <div class="screenshot-label">${escHtml(label)}</div>
      </div>`;
  }).join("");
  const checksRows = homepage2 ? Object.entries(homepage2.checks).map(([key, res]) => {
    const label = VISUAL_CHECK_LABELS[key] ?? key;
    const icon = res.passed ? "✓" : "✗";
    const color = res.passed ? "#16a34a" : "#dc2626";
    return `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${escHtml(label)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${color}">${icon} ${res.passed ? "Pass" : "Fail"}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#6b7280">${escHtml(res.detail ?? "")}</td>
        </tr>`;
  }).join("") : "";
  return `
  <div class="section">
    <h2>🖥️ Visual UX Analysis</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Above-the-fold checks on the homepage at 1280×800px. Screenshots are saved alongside this report.</p>
    ${screenshotCards ? `<div class="screenshot-row">${screenshotCards}</div>` : ""}
    ${checksRows ? `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:${screenshotCards ? "20px" : "0"}">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Check</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Result</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">Detail</th>
      </tr></thead>
      <tbody>${checksRows}</tbody>
    </table>` : ""}
  </div>`;
}
const VISIBILITY_CATEGORIES = /* @__PURE__ */ new Set(["technical", "localSeo", "content"]);
const LEADS_CATEGORIES = /* @__PURE__ */ new Set(["conversion", "trust"]);
function toVisibilityStatement(f) {
  return `${f.title} — ${f.summary}`;
}
function toLeadStatement(f) {
  return `${f.title} — ${f.summary}`;
}
function buildClientSummary(result) {
  const highMedium = result.findings.filter(
    (f) => f.severity === "high" || f.severity === "medium"
  );
  const whatIsHurtingVisibility = highMedium.filter((f) => VISIBILITY_CATEGORIES.has(f.category)).slice(0, 4).map(toVisibilityStatement);
  const whatMayBeHurtingLeads = highMedium.filter((f) => LEADS_CATEGORIES.has(f.category)).slice(0, 4).map(toLeadStatement);
  const fastestWins = result.quickWins.slice(0, 5);
  return { whatIsHurtingVisibility, whatMayBeHurtingLeads, fastestWins };
}
const log$m = scanRepository.createLogger("buildHtmlReport");
async function buildHtmlReport(result, htmlPath) {
  await fs.ensureDir(path.dirname(htmlPath));
  const html = generateHtml(result);
  await fs.writeFile(htmlPath, html, "utf8");
  log$m.info(`HTML report written: ${htmlPath}`);
  return htmlPath;
}
function renderRevenueImpact(ri) {
  const fmt = (n) => `$${n.toLocaleString()}`;
  const confKey = ri.confidence.toLowerCase();
  const revenueCard = ri.estimatedRevenueLossRange ? `
    <div class="rev-range-card">
      <div class="rev-range-label">Est. Revenue Loss / Month</div>
      <div class="rev-range-value">${fmt(ri.estimatedRevenueLossRange.low)}–${fmt(ri.estimatedRevenueLossRange.high)}</div>
      <div class="rev-range-sub">estimated range</div>
    </div>` : "";
  const driversHtml = ri.impactDrivers.map(
    (d) => `<div class="rev-driver"><span class="rev-driver-dot">▸</span><span>${escHtml(d)}</span></div>`
  ).join("");
  const assumptionsHtml = ri.assumptions.map((a) => `<div>• ${escHtml(a)}</div>`).join("");
  return `
  <div class="section rev-impact">
    <h2>Estimated Business Impact</h2>
    <div class="rev-ranges">
      <div class="rev-range-card">
        <div class="rev-range-label">Est. Lead Loss / Month</div>
        <div class="rev-range-value">${ri.estimatedLeadLossRange.low}–${ri.estimatedLeadLossRange.high} leads</div>
        <div class="rev-range-sub">estimated range</div>
      </div>
      ${revenueCard}
    </div>
    <p class="rev-explanation">${escHtml(ri.explanation)}</p>
    <div class="rev-drivers">
      <h3>Main contributing issues</h3>
      ${driversHtml}
    </div>
    <details class="rev-assumptions">
      <summary>Assumptions &amp; methodology</summary>
      <div style="margin-top:8px">${assumptionsHtml}</div>
    </details>
    <div class="rev-confidence">
      Estimate confidence:
      <span class="rev-confidence-pill rev-conf-${confKey}">${escHtml(ri.confidence)}</span>
    </div>
  </div>`;
}
function renderRoadmapItem(item) {
  const impactKey = item.impact.toLowerCase();
  const effortKey = item.effort.toLowerCase();
  const urlsHtml = item.affectedUrls && item.affectedUrls.length > 0 ? `<div class="roadmap-urls">Affects: ${item.affectedUrls.map(escHtml).join(" · ")}</div>` : "";
  return `
  <div class="roadmap-item">
    <div class="roadmap-item-header">
      <div class="roadmap-priority">${item.priority}</div>
      <div>
        <div class="roadmap-title">${escHtml(item.title)}</div>
        <div class="roadmap-badges">
          <span class="roadmap-badge roadmap-impact-${impactKey}">Impact: ${escHtml(item.impact)}</span>
          <span class="roadmap-badge roadmap-effort-${effortKey}">Effort: ${escHtml(item.effort)}</span>
        </div>
      </div>
    </div>
    <div class="roadmap-why">${escHtml(item.whyItMatters)}</div>
    <div class="roadmap-fix">
      <div class="roadmap-fix-label">How to fix it</div>
      ${escHtml(item.plainEnglishFix)}
    </div>
    ${urlsHtml}
  </div>`;
}
function generateHtml(r) {
  const overall = r.scores.overall;
  const overallColor = scoreColor(overall.value);
  const summary = buildClientSummary(r);
  const date = formatDate(r.scannedAt);
  const categoryOrder = ["localSeo", "technical", "conversion", "content", "trust"];
  const findingsByCategory = categoryOrder.map((cat) => ({
    cat,
    findings: r.findings.filter((f) => f.category === cat)
  })).filter((g) => g.findings.length > 0);
  const scoreCards = [
    renderScoreCard("Local SEO", r.scores.localSeo),
    renderScoreCard("Technical SEO", r.scores.technical),
    renderScoreCard("Conversion", r.scores.conversion),
    renderScoreCard("Content", r.scores.content),
    renderScoreCard("Trust", r.scores.trust)
  ].join("");
  const findingSections = findingsByCategory.map(({ cat, findings }) => `
    <div class="findings-group">
      <h3 class="category-heading">${categoryLabel(cat)} <span class="finding-count">${findings.length} issue${findings.length !== 1 ? "s" : ""}</span></h3>
      ${findings.map(renderFinding).join("")}
    </div>`).join("");
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

    /* Revenue impact estimate */
    .rev-impact { border-color: #fde68a; }
    .rev-impact h2 { color: #92400e; }
    .rev-ranges { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .rev-range-card { flex: 1; min-width: 160px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; }
    .rev-range-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; margin-bottom: 4px; }
    .rev-range-value { font-size: 22px; font-weight: 800; color: #78350f; line-height: 1.2; }
    .rev-range-sub { font-size: 11px; color: #a16207; margin-top: 2px; }
    .rev-explanation { font-size: 14px; color: #374151; margin-bottom: 14px; line-height: 1.6; }
    .rev-drivers { margin-bottom: 14px; }
    .rev-drivers h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 8px; }
    .rev-driver { font-size: 13px; color: #374151; padding: 5px 0; border-bottom: 1px solid #f9fafb; display: flex; gap: 8px; align-items: flex-start; }
    .rev-driver:last-child { border-bottom: none; }
    .rev-driver-dot { color: #d97706; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
    .rev-assumptions { font-size: 12px; color: #9ca3af; line-height: 1.6; }
    .rev-assumptions summary { cursor: pointer; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .rev-confidence { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-top: 10px; }
    .rev-confidence-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    .rev-conf-low    { background: #fee2e2; color: #b91c1c; }
    .rev-conf-medium { background: #fef9c3; color: #a16207; }
    .rev-conf-high   { background: #dcfce7; color: #15803d; }

    /* Fix Roadmap */
    .roadmap { border-color: #dbeafe; }
    .roadmap h2 { color: #1d4ed8; }
    .roadmap-item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; background: #fff; }
    .roadmap-item-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px; }
    .roadmap-priority { font-size: 13px; font-weight: 800; color: #fff; background: #1d4ed8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .roadmap-title { font-size: 15px; font-weight: 700; color: #111827; line-height: 1.3; }
    .roadmap-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
    .roadmap-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.4px; }
    .roadmap-impact-critical { background: #ede9fe; color: #6d28d9; }
    .roadmap-impact-high     { background: #fee2e2; color: #b91c1c; }
    .roadmap-impact-medium   { background: #fef9c3; color: #92400e; }
    .roadmap-impact-low      { background: #f3f4f6; color: #374151; }
    .roadmap-effort-low    { background: #dcfce7; color: #15803d; }
    .roadmap-effort-medium { background: #fef3c7; color: #92400e; }
    .roadmap-effort-high   { background: #fee2e2; color: #b91c1c; }
    .roadmap-why { font-size: 13px; color: #374151; margin-bottom: 8px; line-height: 1.55; }
    .roadmap-fix { font-size: 13px; color: #1f2937; background: #f0fdf4; border-left: 3px solid #22c55e; padding: 10px 14px; border-radius: 4px; line-height: 1.55; }
    .roadmap-fix-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a; margin-bottom: 4px; }
    .roadmap-urls { font-size: 11px; color: #9ca3af; margin-top: 8px; }

    /* Score confidence */
    .confidence-block { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
    .confidence-pill { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
    .confidence-high  { background: #dcfce7; color: #15803d; }
    .confidence-medium { background: #fef9c3; color: #a16207; }
    .confidence-low   { background: #fee2e2; color: #b91c1c; }
    .confidence-reason { font-size: 13px; color: #6b7280; }

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
    <div class="report-meta">Scanned ${date} · ${r.request.scanMode} scan · ${r.pages.length} page${r.pages.length !== 1 ? "s" : ""} crawled · ${escHtml(r.detectedBusinessType.replace("_", " "))} business</div>
  </div>

  <!-- Overall score -->
  <div class="overall-block">
    <div class="overall-number" style="color:${overallColor}">${overall.value}</div>
    <div style="flex:1">
      <div class="overall-label" style="color:${overallColor}">${escHtml(overall.label)}</div>
      <div class="overall-sub">Overall Local SEO Score (out of 100)</div>
      <div class="overall-sub">${r.findings.length} issue${r.findings.length !== 1 ? "s" : ""} found — ${r.findings.filter((f) => f.severity === "high").length} high priority</div>
      ${r.scoreConfidence ? `
      <div class="confidence-block">
        <span class="confidence-pill confidence-${r.scoreConfidence.level.toLowerCase()}">Confidence: ${escHtml(r.scoreConfidence.level)}</span>
        <span class="confidence-reason">${escHtml(r.scoreConfidence.reason)}</span>
      </div>` : ""}
    </div>
  </div>

  <!-- Category scores -->
  <div class="scores-grid">
    ${scoreCards}
  </div>

  <!-- What's hurting the business -->
  ${summary.whatIsHurtingVisibility.length > 0 || summary.whatMayBeHurtingLeads.length > 0 ? `
  <div class="section">
    <h2>What's Holding This Business Back</h2>
    <div class="summary-grid">
      <div class="summary-col">
        <h3>Hurting Google Visibility</h3>
        ${renderBulletList(summary.whatIsHurtingVisibility, "No major visibility issues found.")}
      </div>
      <div class="summary-col">
        <h3>Hurting Lead Capture</h3>
        ${renderBulletList(summary.whatMayBeHurtingLeads, "No major conversion issues found.")}
      </div>
    </div>
  </div>` : ""}

  <!-- Money leaks -->
  ${r.moneyLeaks.length > 0 ? `
  <div class="section money-leaks">
    <h2>🚨 Revenue-Impacting Issues</h2>
    ${renderBulletList(r.moneyLeaks)}
  </div>` : ""}

  <!-- Revenue Impact Summary -->
  ${renderImpactSummarySection(r.findings)}

  <!-- Estimated Business Impact -->
  ${r.revenueImpact ? renderRevenueImpact(r.revenueImpact) : ""}

  <!-- Priority Fix Roadmap -->
  ${r.roadmap && r.roadmap.length > 0 ? `
  <div class="section roadmap">
    <h2>Priority Fix Roadmap</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:20px">A step-by-step action plan ordered by business impact. Start at the top.</p>
    ${r.roadmap.map(renderRoadmapItem).join("")}
  </div>` : ""}

  <!-- Quick wins -->
  ${r.quickWins.length > 0 ? `
  <div class="section quick-wins">
    <h2>✅ Quick Wins (Highest-Impact Actions)</h2>
    ${renderBulletList(r.quickWins)}
  </div>` : ""}

  <!-- Lighthouse / Core Web Vitals -->
  ${r.lighthouse && r.lighthouse.length > 0 ? (() => {
    const lh = r.lighthouse[0];
    const perfColor = scoreColor(lh.performanceScore);
    const seoColor = scoreColor(lh.seoScore);
    const a11yColor = scoreColor(lh.accessibilityScore);
    const ms = (v) => v !== void 0 ? `${(v / 1e3).toFixed(2)}s` : "—";
    const cls = (v) => v !== void 0 ? v.toFixed(3) : "—";
    const pill = (label, val, color) => `<div class="lh-pill"><div class="lh-pill-val" style="color:${color}">${val}</div><div class="lh-pill-label">${label}</div></div>`;
    return `
  <div class="section">
    <h2>⚡ Page Speed &amp; Core Web Vitals</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Measured on mobile · Powered by Lighthouse · URL: <code>${escHtml(lh.url)}</code></p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      ${pill("Performance", lh.performanceScore, perfColor)}
      ${pill("SEO", lh.seoScore, seoColor)}
      ${pill("Accessibility", lh.accessibilityScore, a11yColor)}
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
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Total Blocking Time</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${lh.totalBlockingTime !== void 0 ? lh.totalBlockingTime + "ms" : "—"}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 200ms</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Cumulative Layout Shift</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${cls(lh.cumulativeLayoutShift)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">&lt; 0.1</td></tr>
        <tr><td style="padding:8px 12px">Speed Index</td><td style="padding:8px 12px">${ms(lh.speedIndex)}</td><td style="padding:8px 12px;color:#6b7280">&lt; 3.4s</td></tr>
      </tbody>
    </table>
  </div>`;
  })() : ""}

  <!-- Visual UX Analysis -->
  ${r.visual && r.visual.pagesAnalyzed.length > 0 ? renderVisualSection(r.visual) : ""}

  <!-- Competitor Gap Analysis -->
  ${r.competitor && r.competitor.competitors.length > 0 ? renderCompetitorSection(r.competitor) : ""}

  <!-- All findings -->
  <div class="section">
    <h2>All Issues Found (${r.findings.length} total)</h2>
    ${r.findings.length === 0 ? '<p class="empty">No issues detected. Great job!</p>' : findingSections}
  </div>

  <!-- Score rationale -->
  <div class="section">
    <h2>Score Breakdown Detail</h2>
    ${["technical", "localSeo", "conversion", "content", "trust"].map((cat) => {
    const score = r.scores[cat];
    const color = scoreColor(score.value);
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
          ${score.rationale.map((r2) => `<li>${escHtml(r2)}</li>`).join("")}
        </ul>
      </div>`;
  }).join("")}
  </div>

  <div class="footer">
    Generated by Local SEO Scanner &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; Scan ID: ${escHtml(r.id)}
  </div>

</div>
</body>
</html>`;
}
const log$l = scanRepository.createLogger("reportStage");
async function reportStage(ctx, emit) {
  emit("Building reports…", 97);
  const jsonPath = index.buildJsonPath(ctx.scanId);
  const htmlPath = index.buildHtmlPath(ctx.scanId);
  const result = buildAuditResult(ctx, jsonPath, htmlPath);
  await Promise.all([
    buildJsonReport(result, jsonPath),
    buildHtmlReport(result, htmlPath)
  ]);
  await scanRepository.saveScan(result);
  ctx.artifacts = {
    jsonPath,
    htmlPath,
    screenshotPaths: Object.keys(ctx.screenshotPaths).length > 0 ? ctx.screenshotPaths : void 0
  };
  log$l.info(`Reports saved: ${jsonPath}`);
}
function buildAuditResult(ctx, jsonPath, htmlPath) {
  return {
    id: ctx.scanId,
    request: ctx.request,
    scannedAt: ctx.startedAt,
    domain: ctx.domain,
    detectedBusinessType: ctx.detectedBusinessType,
    pages: ctx.pages,
    findings: ctx.allFindings,
    scores: ctx.scores,
    quickWins: ctx.quickWins,
    moneyLeaks: ctx.moneyLeaks,
    lighthouse: ctx.lighthouseMetrics.length > 0 ? ctx.lighthouseMetrics : void 0,
    visual: ctx.visualResult,
    competitor: ctx.competitorResult,
    scoreConfidence: ctx.scoreConfidence,
    revenueImpact: ctx.revenueImpact,
    roadmap: ctx.roadmap,
    artifacts: {
      jsonPath,
      htmlPath,
      screenshotPaths: Object.keys(ctx.screenshotPaths).length > 0 ? ctx.screenshotPaths : void 0
    }
  };
}
function normalizeInputUrl(raw) {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL: "${raw}"`);
  }
}
function getDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function stripWww(hostname) {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
function isSameDomain(a, b) {
  return stripWww(getDomain(a)) === stripWww(getDomain(b));
}
function isHttps(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
function resolveUrl(href, base) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("#")) {
    return null;
  }
  try {
    const resolved = new URL(href, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}
const TRACKING_PARAMS = /* @__PURE__ */ new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
  "source",
  "_ga"
]);
function stripTrackingParams(url) {
  try {
    const parsed = new URL(url);
    TRACKING_PARAMS.forEach((p) => parsed.searchParams.delete(p));
    return parsed.href;
  } catch {
    return url;
  }
}
const log$k = scanRepository.createLogger("validateStage");
async function validateStage(ctx, emit) {
  emit("Validating URL…", 2);
  ctx.normalizedUrl = normalizeInputUrl(ctx.request.url);
  ctx.domain = getDomain(ctx.normalizedUrl);
  ctx.scanId = index.generateScanId(ctx.domain);
  log$k.info(`Normalized: ${ctx.normalizedUrl} | domain: ${ctx.domain} | id: ${ctx.scanId}`);
}
const log$j = scanRepository.createLogger("robots");
const FETCH_TIMEOUT_MS$1 = 1e4;
async function fetchRobots(siteUrl) {
  let robotsUrl;
  try {
    const parsed = new URL(siteUrl);
    robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
  } catch {
    return emptyResult();
  }
  try {
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS$1),
      headers: { "User-Agent": "LocalSEOScanner/1.0" }
    });
    if (!response.ok) {
      log$j.info(`robots.txt not found at ${robotsUrl} (${response.status})`);
      return emptyResult();
    }
    const text = await response.text();
    const result = parseRobots(text);
    log$j.info(
      `robots.txt found: disallowed=${result.disallowedPaths.length}, sitemaps=${result.sitemapUrls.length}`
    );
    return result;
  } catch (err) {
    log$j.warn(`Failed to fetch robots.txt: ${err.message}`);
    return emptyResult();
  }
}
function parseRobots(text) {
  const lines = text.split("\n").map((l) => l.split("#")[0].trim()).filter(Boolean);
  const disallowedPaths = [];
  const sitemapUrls = [];
  let allowsGooglebot = true;
  let currentScope = "other";
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (key === "user-agent") {
      const agent = value.toLowerCase();
      if (agent === "*") currentScope = "all";
      else if (agent === "googlebot") currentScope = "googlebot";
      else currentScope = "other";
      continue;
    }
    if (key === "sitemap" && value.startsWith("http")) {
      sitemapUrls.push(value);
      continue;
    }
    if (key === "disallow" && (currentScope === "all" || currentScope === "googlebot")) {
      if (value === "/") {
        allowsGooglebot = false;
      }
      if (value) {
        disallowedPaths.push(value);
      }
    }
  }
  return {
    found: true,
    disallowedPaths: [...new Set(disallowedPaths)],
    sitemapUrls: [...new Set(sitemapUrls)],
    allowsGooglebot
  };
}
function emptyResult() {
  return { found: false, disallowedPaths: [], sitemapUrls: [], allowsGooglebot: true };
}
const log$i = scanRepository.createLogger("sitemap");
const FETCH_TIMEOUT_MS = 1e4;
const CANDIDATE_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap.php",
  "/wp-sitemap.xml",
  "/sitemap-index.xml"
];
async function fetchSitemap(siteUrl, robotsSitemapUrls = []) {
  let base;
  try {
    const parsed = new URL(siteUrl);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return { found: false, urls: [] };
  }
  const candidates = [
    ...robotsSitemapUrls,
    ...CANDIDATE_PATHS.map((p) => `${base}${p}`)
  ];
  for (const url of candidates) {
    try {
      const result = await trySitemap(url);
      if (result.found) return result;
    } catch {
    }
  }
  log$i.info("No sitemap found");
  return { found: false, urls: [] };
}
async function trySitemap(sitemapUrl) {
  const response = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "LocalSEOScanner/1.0" }
  });
  if (!response.ok) return { found: false, urls: [] };
  const text = await response.text();
  if (!text.trim().startsWith("<")) return { found: false, urls: [] };
  const urls = parseSitemapXml(text);
  log$i.info(`Sitemap found at ${sitemapUrl}: ${urls.length} URLs`);
  return { found: true, urls, sitemapUrl };
}
function parseSitemapXml(xml) {
  const $ = cheerio__namespace.load(xml, { xmlMode: true });
  const urls = [];
  $("urlset url loc, url loc").each((_, el) => {
    const url = $(el).text().trim();
    if (url.startsWith("http")) urls.push(url);
  });
  if (urls.length === 0) {
    $("sitemapindex sitemap loc, sitemap loc").each((_, el) => {
      const url = $(el).text().trim();
      if (url.startsWith("http")) urls.push(url);
    });
  }
  return [...new Set(urls)];
}
const log$h = scanRepository.createLogger("fetchHtml");
const PAGE_TIMEOUT_MS = 3e4;
async function fetchHtml(url, context) {
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      timeout: PAGE_TIMEOUT_MS,
      waitUntil: "domcontentloaded"
    });
    const statusCode = response?.status() ?? 0;
    const finalUrl = page.url();
    const html = await page.content();
    log$h.info(`Fetched ${url} → ${finalUrl} [${statusCode}]`);
    return { requestedUrl: url, finalUrl, statusCode, html };
  } catch (err) {
    log$h.warn(`Failed to fetch ${url}: ${err.message}`);
    return { requestedUrl: url, finalUrl: url, statusCode: 0, html: "" };
  } finally {
    await page.close();
  }
}
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|mov|zip|doc|docx|xls|xlsx|ppt|pptx|exe|dmg|css|js|json|xml|woff|woff2|ttf|eot)$/i;
const SKIP_PATH_SEGMENTS = [
  "/wp-admin",
  "/wp-json",
  "/wp-login",
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/logout",
  "/register",
  "/signin",
  "/signup",
  "/admin",
  "/feed",
  "/rss",
  "?replytocom",
  "/tag/",
  "/author/",
  "/page/"
];
function normalizeCrawlerUrl(href, base) {
  const resolved = resolveUrl(href, base);
  if (!resolved) return null;
  const clean = stripTrackingParams(resolved);
  return clean;
}
function shouldSkipUrl(url) {
  const lower = url.toLowerCase();
  if (SKIP_EXTENSIONS.test(lower)) return true;
  for (const segment of SKIP_PATH_SEGMENTS) {
    if (lower.includes(segment)) return true;
  }
  return false;
}
const log$g = scanRepository.createLogger("discoverUrls");
const CRAWLER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0";
async function discoverUrls(startUrl, browser, maxPages, domain, onProgress) {
  const context = await browser.newContext({
    userAgent: CRAWLER_USER_AGENT,
    ignoreHTTPSErrors: true,
    // Disable media/font loading for speed
    extraHTTPHeaders: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }
  });
  const visited = /* @__PURE__ */ new Set();
  const queue = [startUrl];
  const fetchedPages = [];
  const internalLinkGraph = {};
  log$g.info(`Starting BFS crawl from ${startUrl} (maxPages=${maxPages}, domain=${domain})`);
  try {
    while (queue.length > 0 && fetchedPages.length < maxPages) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const result = await fetchHtml(url, context);
      if (result.statusCode === 0 && result.html === "") {
        log$g.warn(`Skipping failed fetch: ${url}`);
        continue;
      }
      if (result.html.trim() && !result.html.trim().startsWith("<")) {
        log$g.warn(`Skipping non-HTML response: ${url}`);
        continue;
      }
      fetchedPages.push(result);
      onProgress?.(fetchedPages.length, fetchedPages.length + queue.length);
      if (fetchedPages.length < maxPages && result.html) {
        const links = extractInternalLinks(result.html, result.finalUrl, domain);
        internalLinkGraph[result.finalUrl] = links;
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    }
  } finally {
    await context.close();
  }
  log$g.info(
    `Crawl complete: ${fetchedPages.length} pages fetched, ${Object.keys(internalLinkGraph).length} nodes in link graph`
  );
  return { fetchedPages, internalLinkGraph };
}
function extractInternalLinks(html, baseUrl, domain) {
  const $ = cheerio__namespace.load(html);
  const seen = /* @__PURE__ */ new Set();
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const normalized = normalizeCrawlerUrl(href, baseUrl);
    if (!normalized) return;
    if (!isSameDomain(normalized, `https://${domain}`)) return;
    if (shouldSkipUrl(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    links.push(normalized);
  });
  return links;
}
const log$f = scanRepository.createLogger("crawlStage");
async function crawlStage(ctx, emit) {
  emit("Launching browser…", 5);
  const { chromium } = await import("playwright");
  ctx.browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  ctx.chromiumPath = chromium.executablePath();
  emit("Loading robots.txt…", 8);
  const robotsResult = await fetchRobots(ctx.normalizedUrl);
  ctx.robotsFound = robotsResult.found;
  log$f.info(`robots.txt: found=${ctx.robotsFound}, sitemaps=${robotsResult.sitemapUrls.length}`);
  emit("Loading sitemap…", 12);
  const sitemapResult = await fetchSitemap(ctx.normalizedUrl, robotsResult.sitemapUrls);
  ctx.sitemapFound = sitemapResult.found;
  log$f.info(`sitemap: found=${ctx.sitemapFound}, urls=${sitemapResult.urls.length}`);
  emit("Fetching homepage…", 16);
  const { fetchedPages } = await discoverUrls(
    ctx.normalizedUrl,
    ctx.browser,
    ctx.request.maxPages,
    ctx.domain,
    (fetched, queued) => {
      const ratio = Math.min(fetched / Math.max(ctx.request.maxPages, 1), 1);
      const pct = Math.round(16 + ratio * 49);
      emit(`Crawling pages… (${fetched} fetched, ${queued} queued)`, pct);
    }
  );
  ctx.rawPages = fetchedPages;
  log$f.info(`Crawl complete: ${fetchedPages.length} pages fetched`);
}
function extractMeta($) {
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  const robotsContent = [
    $('meta[name="robots"]').attr("content") ?? "",
    $('meta[name="googlebot"]').attr("content") ?? ""
  ].join(",").toLowerCase();
  const noindex = robotsContent.includes("noindex");
  return { title, metaDescription, canonical, noindex };
}
function extractHeadings($) {
  const h1s = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1s.push(text);
  });
  const h2s = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });
  return { h1s, h2s };
}
function extractSchema($) {
  const types = /* @__PURE__ */ new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? "";
    try {
      const parsed = JSON.parse(raw);
      collectTypes(parsed, types);
    } catch {
    }
  });
  $("[itemtype]").each((_, el) => {
    const itemtype = $(el).attr("itemtype") ?? "";
    const schemaType = itemtype.split("/").pop();
    if (schemaType) types.add(schemaType);
  });
  return { schemaTypes: [...types] };
}
function collectTypes(node, types) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => collectTypes(child, types));
    return;
  }
  const obj = node;
  if ("@type" in obj) {
    const t = obj["@type"];
    if (typeof t === "string") {
      types.add(normalizeType(t));
    } else if (Array.isArray(t)) {
      t.forEach((v) => {
        if (typeof v === "string") types.add(normalizeType(v));
      });
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      collectTypes(value, types);
    }
  }
}
function normalizeType(t) {
  return t.includes("/") ? t.split("/").pop() ?? t : t;
}
const PHONE_REGEX = /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const STREET_ADDRESS_REGEX = /\d{1,5}\s+[A-Z][a-zA-Z\s]{2,40}\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Way|Ct|Court|Ln|Lane|Pl|Place|Pkwy|Parkway|Hwy|Highway)\b/i;
function extractContactSignals($) {
  const phones = /* @__PURE__ */ new Set();
  const emails = /* @__PURE__ */ new Set();
  let hasAddress = false;
  $('a[href^="tel:"]').each((_, el) => {
    const raw = $(el).attr("href") ?? "";
    const digits = raw.replace("tel:", "").replace(/\s/g, "");
    if (digits) phones.add(digits);
  });
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = ($(el).attr("href") ?? "").replace("mailto:", "");
    const addr = raw.split("?")[0].trim().toLowerCase();
    if (addr && EMAIL_REGEX.test(addr)) emails.add(addr);
  });
  const schemaAddress = $('[itemprop="address"]').length > 0 || $('[itemprop="streetAddress"]').length > 0 || $('[typeof="PostalAddress"]').length > 0;
  const searchSelectors = ["main", "article", "section", ".contact", "#contact", "footer", "body"];
  let bodyText = "";
  for (const sel of searchSelectors) {
    const el = $(sel).first();
    if (el.length) {
      bodyText = el.text();
      break;
    }
  }
  const phoneMatches = bodyText.match(PHONE_REGEX) ?? [];
  phoneMatches.forEach((p) => phones.add(p.trim()));
  const emailMatches = bodyText.match(EMAIL_REGEX) ?? [];
  emailMatches.filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg")).forEach((e) => emails.add(e.toLowerCase()));
  hasAddress = schemaAddress || STREET_ADDRESS_REGEX.test(bodyText) || $("address").length > 0;
  return {
    phones: [...phones].slice(0, 10),
    // cap at 10 to avoid runaway matches
    emails: [...emails].slice(0, 10),
    hasAddress
  };
}
const DAYS_PATTERN = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s:.-]/i;
const TIME_PATTERN = /\b\d{1,2}(:\d{2})?\s*([ap]\.?m\.?|[AP]M)\b/i;
const HOURS_KEYWORDS = /\b(hours|open|closed|open\s+daily|24\s*hours|open\s+now)\b/i;
const US_STATES = /* @__PURE__ */ new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
]);
const STATE_ABBR_PATTERN = /,\s*([A-Z]{2})\b/g;
const STATE_FULL_PATTERN = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)\b/gi;
const SERVICE_AREA_PATTERN = /\b(serving|we\s+serve|service\s+area|areas?\s+we\s+serve|proudly\s+serving|serving\s+the|available\s+in|serving\s+all\s+of)\b/i;
const MAPS_HREF_PATTERN = /maps\.google\.|google\.com\/maps|goo\.gl\/maps|maps\.apple\.|bing\.com\/maps/i;
const MAPS_IFRAME_PATTERN = /maps\.google\.|google\.com\/maps/i;
function extractLocalSignals($) {
  let hasMap = false;
  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (MAPS_IFRAME_PATTERN.test(src)) hasMap = true;
  });
  if (!hasMap) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().toLowerCase();
      if (MAPS_HREF_PATTERN.test(href) || text.includes("directions") || text.includes("get directions")) {
        hasMap = true;
      }
    });
  }
  const bodyText = $("body").text();
  const hasHours = DAYS_PATTERN.test(bodyText) || HOURS_KEYWORDS.test(bodyText) && TIME_PATTERN.test(bodyText);
  const cityMentions = [];
  const stateMentions = /* @__PURE__ */ new Set();
  const abbrMatches = [...bodyText.matchAll(STATE_ABBR_PATTERN)];
  abbrMatches.forEach((m) => {
    const abbr = m[1].toUpperCase();
    if (US_STATES.has(abbr)) stateMentions.add(abbr);
  });
  const fullMatches = [...bodyText.matchAll(STATE_FULL_PATTERN)];
  fullMatches.forEach((m) => stateMentions.add(m[0].trim()));
  const titleText = $("title").text();
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const cityPattern = /([A-Z][a-zA-Z\s]{2,20}),\s*[A-Z]{2}\b/g;
  const citySearchText = `${titleText} ${metaDesc}`;
  const cityMatches = [...citySearchText.matchAll(cityPattern)];
  cityMatches.forEach((m) => {
    const city = m[1].trim();
    if (city.length > 2 && city.length < 30) cityMentions.push(city);
  });
  const hasServiceAreaText = SERVICE_AREA_PATTERN.test(bodyText);
  return {
    hasMap,
    hasHours,
    cityMentions: [...new Set(cityMentions)].slice(0, 10),
    stateMentions: [...stateMentions].slice(0, 5),
    hasServiceAreaText
  };
}
const CTA_PATTERNS = [
  /call\s*(us|now|today)/i,
  /book\s*(now|online|an?\s*appointment|a\s*table|today)/i,
  /schedule\s*(an?\s*appointment|now|online|today|a\s*(call|consultation))/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate|consultation|inspection)/i,
  /request\s*(a\s*)?(quote|estimate|callback|appointment|consultation)/i,
  /contact\s*us/i,
  /order\s*(now|online|today)/i,
  /reserve\s*(a\s*(table|spot)|now|online)/i,
  /free\s*(estimate|inspection|consultation|quote|assessment)/i,
  /get\s*started/i,
  /claim\s*(your\s*)?(offer|discount|deal)/i,
  /speak\s*(with|to)\s*(an?\s*)?(expert|specialist|agent|us)/i,
  /send\s*(us\s*)?a\s*message/i,
  /directions/i
];
const CTA_SELECTORS = [
  "a[href]",
  "button",
  '[role="button"]',
  'input[type="submit"]',
  'input[type="button"]'
];
function extractCTAs($) {
  const ctaTexts = /* @__PURE__ */ new Set();
  CTA_SELECTORS.forEach((selector) => {
    $(selector).each((_, el) => {
      const rawText = $(el).attr("value") ?? $(el).attr("aria-label") ?? $(el).text();
      const text = rawText.trim();
      if (!text || text.length > 80) return;
      if (CTA_PATTERNS.some((pattern) => pattern.test(text))) {
        ctaTexts.add(text);
      }
    });
  });
  let hasForm = false;
  $("form").each((_, formEl) => {
    const inputCount = $(formEl).find('input:not([type="hidden"]):not([type="search"])').length;
    const textareaCount = $(formEl).find("textarea").length;
    if (inputCount > 1 || textareaCount > 0) {
      hasForm = true;
    }
  });
  return {
    ctaTexts: [...ctaTexts].slice(0, 20),
    hasForm
  };
}
const TESTIMONIAL_SELECTORS = [
  '[class*="testimonial"]',
  '[class*="review"]',
  '[class*="rating"]',
  '[class*="feedback"]',
  '[id*="testimonial"]',
  '[id*="review"]',
  '[itemtype*="Review"]',
  '[itemscope][itemtype*="Review"]',
  "blockquote"
];
const STAR_SELECTORS = [
  '[class*="star"]',
  '[class*="stars"]',
  '[aria-label*="star"]',
  '[aria-label*="rating"]'
];
const TRUST_KEYWORDS = [
  /\blicensed\b/i,
  /\binsured\b/i,
  /\bbonded\b/i,
  /\bcertified\b/i,
  /\baccredited\b/i,
  /\bBBB\b/,
  // Better Business Bureau
  /\bA\+\s*rated\b/i,
  /\byears?\s+(of\s+)?(experience|in\s+business|serving)\b/i,
  /\bsince\s+1[89]\d{2}\b/i,
  // "since 1987" — established business
  /\bfamily[\s-]owned\b/i,
  /\bsatisfaction\s+guarantee\b/i,
  /\bmoney[\s-]back\b/i,
  /\bwarranty\b/i,
  /\bguarantee\b/i,
  /\b5[\s-]star\b/i,
  /\baward[\s-]winning\b/i,
  /\btop[\s-]rated\b/i,
  /\bhighly\s+recommended\b/i
];
function extractTrustSignals($) {
  let testimonialCount = 0;
  TESTIMONIAL_SELECTORS.forEach((selector) => {
    try {
      testimonialCount += $(selector).length;
    } catch {
    }
  });
  let starCount = 0;
  STAR_SELECTORS.forEach((selector) => {
    try {
      starCount += $(selector).length;
    } catch {
    }
  });
  const bodyText = $("body").text();
  const hasTrustKeyword = TRUST_KEYWORDS.some((pattern) => pattern.test(bodyText));
  const hasTrustSignals = testimonialCount > 0 || starCount > 0 || hasTrustKeyword;
  return {
    hasTrustSignals,
    // Cap count to avoid inflated numbers from CSS-class-heavy sites
    testimonialCount: Math.min(testimonialCount + starCount, 50)
  };
}
function extractImages($) {
  let imageCount = 0;
  let missingAltCount = 0;
  $("img").each((_, el) => {
    imageCount++;
    const alt = $(el).attr("alt");
    if (alt === void 0 || alt.trim() === "") {
      missingAltCount++;
    }
  });
  return { imageCount, missingAltCount };
}
function extractTextStats($) {
  const $clone = $.root().clone();
  $clone.find('script, style, noscript, [hidden], [aria-hidden="true"]').remove();
  const rawText = $clone.find("body").text();
  const textContent = rawText.replace(/\s+/g, " ").trim();
  const wordCount = textContent ? textContent.split(/\s+/).length : 0;
  return { textContent, wordCount };
}
function extractAllSignals(html, pageUrl) {
  if (!html) return emptySignals();
  const $ = cheerio__namespace.load(html);
  const meta = extractMeta($);
  const headings = extractHeadings($);
  const schema = extractSchema($);
  const contact = extractContactSignals($);
  const local = extractLocalSignals($);
  const ctas = extractCTAs($);
  const trust = extractTrustSignals($);
  const images = extractImages($);
  const textStats = extractTextStats($);
  return {
    // Meta
    title: meta.title,
    metaDescription: meta.metaDescription,
    canonical: meta.canonical,
    noindex: meta.noindex,
    // Headings
    h1s: headings.h1s,
    h2s: headings.h2s,
    // Schema
    schemaTypes: schema.schemaTypes,
    // Contact
    phones: contact.phones,
    emails: contact.emails,
    hasAddress: contact.hasAddress,
    // Local
    hasMap: local.hasMap,
    hasHours: local.hasHours,
    // CTAs
    ctaTexts: ctas.ctaTexts,
    hasForm: ctas.hasForm,
    // Trust
    hasTrustSignals: trust.hasTrustSignals,
    testimonialCount: trust.testimonialCount,
    // Images
    imageCount: images.imageCount,
    missingAltCount: images.missingAltCount,
    // Text
    textContent: textStats.textContent,
    wordCount: textStats.wordCount
  };
}
function emptySignals() {
  return {
    title: "",
    metaDescription: "",
    canonical: "",
    noindex: false,
    h1s: [],
    h2s: [],
    schemaTypes: [],
    phones: [],
    emails: [],
    hasAddress: false,
    hasMap: false,
    hasHours: false,
    ctaTexts: [],
    hasForm: false,
    hasTrustSignals: false,
    testimonialCount: 0,
    imageCount: 0,
    missingAltCount: 0,
    textContent: "",
    wordCount: 0
  };
}
const PATH_RULES = [
  [/\/(contact|contact-us|reach-us|get-in-touch|find-us)/i, "contact"],
  [/\/(book|booking|appointments?|schedule|reserve|reservations?)/i, "booking"],
  [/\/(menu|food|drinks|cuisine|order-online|our-menu)/i, "menu"],
  [/\/(gallery|photos?|portfolio|our-work|projects?)/i, "gallery"],
  [/\/(about|about-us|our-story|our-team|who-we-are|company)/i, "about"],
  [/\/(locations?|areas?|cities|city|serve|coverage|service-area)/i, "location"],
  [/\/(services?|what-we-do|our-services|solutions?|offerings?)/i, "service"],
  [/\/(blog|news|articles?|posts?|updates?|resources?)/i, "blog"]
];
const HEADING_RULES = [
  [/book\s*(now|an?\s*appointment|online)|schedule\s*(an?\s*appointment|now)/i, "booking"],
  [/contact\s*us|get\s*in\s*touch|reach\s*us|call\s*us\s*today/i, "contact"],
  [/our\s*menu|view\s*(the\s*)?menu|food\s*&\s*drinks/i, "menu"],
  [/photo\s*gallery|our\s*(gallery|portfolio|work|projects?)/i, "gallery"],
  [/about\s*us|our\s*(story|team|company|mission|history)/i, "about"],
  [/service\s*area|areas?\s*we\s*serve|serving\s*(the\s*)?\w+/i, "location"],
  [/our\s*services?|what\s*we\s*(do|offer)|services?\s*(we\s*)?provide/i, "service"],
  [/latest\s*(news|posts?|articles?)|from\s*the\s*blog/i, "blog"]
];
function classifyPage(url, title, h1s, h2s) {
  let pathname;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return "other";
  }
  if (pathname === "/" || pathname === "") return "home";
  for (const [pattern, type] of PATH_RULES) {
    if (pattern.test(pathname)) return type;
  }
  const headingText = [...h1s, ...h2s, title].join(" ");
  for (const [pattern, type] of HEADING_RULES) {
    if (pattern.test(headingText)) return type;
  }
  return "other";
}
const RULES = [
  {
    pattern: /\b(restaurant|menu|dining|cuisine|cafe|bistro|diner|eatery|food|pizza|sushi|burger|steak|seafood|takeout|takeaway|delivery)\b/i,
    type: "restaurant"
  },
  {
    pattern: /\b(salon|hair\s*(salon|studio|cut)|nail\s*(salon|studio)|spa|beauty\s*(salon|studio)|barber|stylist|wax|lash|brow|blowout)\b/i,
    type: "salon"
  },
  {
    pattern: /\b(roofer|roofing|roof\s*(repair|replacement|installation)|shingles|gutters|siding|metal\s*roof|flat\s*roof)\b/i,
    type: "roofer"
  },
  {
    pattern: /\b(auto\s*(repair|shop|service|mechanic)|car\s*(repair|service|mechanic)|oil\s*change|tire\s*(shop|service)|transmission|brake\s*(service|repair))\b/i,
    type: "auto_shop"
  },
  {
    pattern: /\b(contractor|construction|remodel|renovation|home\s*(improvement|remodel)|general\s*contractor|handyman|plumber|plumbing|electrician|hvac|landscap)\b/i,
    type: "contractor"
  },
  {
    pattern: /\b(dental|dentist|tooth|teeth|orthodont|implant|crown|braces|invisalign|cosmetic\s*dentistry|oral\s*(health|care|surgery))\b/i,
    type: "dentist"
  }
];
function detectBusinessType(pages, requested) {
  if (requested !== "auto") return requested;
  const signals = buildSignalCorpus(pages);
  for (const { pattern, type } of RULES) {
    if (pattern.test(signals)) return type;
  }
  return "other";
}
function buildSignalCorpus(pages) {
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const parts = [];
  if (home) {
    parts.push(home.title ?? "", ...home.h1s, home.url);
    parts.push(home.title ?? "", ...home.h1s);
  }
  for (const page of pages) {
    parts.push(page.title ?? "", ...page.h1s);
    parts.push(page.url);
  }
  if (home?.textContent) {
    parts.push(home.textContent.slice(0, 1e3));
  }
  return parts.join(" ");
}
const log$e = scanRepository.createLogger("extractStage");
async function extractStage(ctx, emit) {
  emit("Extracting signals…", 66);
  ctx.pages = ctx.rawPages.map((raw) => {
    const signals = extractAllSignals(raw.html, raw.finalUrl);
    const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s);
    return {
      url: raw.requestedUrl,
      finalUrl: raw.finalUrl,
      statusCode: raw.statusCode,
      pageType,
      title: signals.title,
      metaDescription: signals.metaDescription,
      h1s: signals.h1s,
      h2s: signals.h2s,
      canonical: signals.canonical,
      noindex: signals.noindex,
      html: raw.html,
      textContent: signals.textContent,
      wordCount: signals.wordCount,
      imageCount: signals.imageCount,
      missingAltCount: signals.missingAltCount,
      phones: signals.phones,
      emails: signals.emails,
      hasAddress: signals.hasAddress,
      hasMap: signals.hasMap,
      hasHours: signals.hasHours,
      hasForm: signals.hasForm,
      ctaTexts: signals.ctaTexts,
      schemaTypes: signals.schemaTypes,
      hasTrustSignals: signals.hasTrustSignals,
      testimonialCount: signals.testimonialCount
    };
  });
  emit("Detecting business type…", 72);
  ctx.detectedBusinessType = detectBusinessType(
    ctx.pages,
    ctx.request.businessType
  );
  log$e.info(
    `Extraction complete: ${ctx.pages.length} pages | business type: ${ctx.detectedBusinessType}`
  );
}
function homepage(pages) {
  return pages.find((p) => p.pageType === "home") ?? pages[0];
}
function pagesByType(pages, ...types) {
  return pages.filter((p) => types.includes(p.pageType));
}
function importantPages(pages) {
  return pagesByType(pages, "home", "contact", "service", "location");
}
const TITLE_MIN = 20;
const TITLE_MAX = 70;
const DESC_MIN = 50;
const DESC_MAX = 160;
const ALT_POOR_THRESHOLD = 0.3;
function analyzeTechnical(input) {
  const { pages, domain, robotsFound, sitemapFound } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  if (!robotsFound) {
    findings.push({
      id: "technical-no-robots",
      category: "technical",
      severity: "low",
      title: "No robots.txt file found",
      summary: `${domain} is missing a robots.txt file.`,
      whyItMatters: "robots.txt guides search engine crawlers. Its absence is a minor signal but indicates incomplete technical setup. A Sitemap: directive inside robots.txt also speeds up indexing.",
      recommendation: "Create a robots.txt at the site root. At minimum include: `Sitemap: https://yourdomain.com/sitemap.xml`"
    });
  }
  if (!sitemapFound) {
    findings.push({
      id: "technical-no-sitemap",
      category: "technical",
      severity: "medium",
      title: "No XML sitemap found",
      summary: `No sitemap.xml was detected for ${domain}.`,
      whyItMatters: "A sitemap helps Google discover every page on your site. Without one, service pages and location pages may never be indexed.",
      recommendation: "Generate and submit an XML sitemap. Most CMS platforms have built-in options: WordPress (Yoast/RankMath), Squarespace, and Wix all auto-generate sitemaps."
    });
  }
  const broken = pages.filter((p) => p.statusCode >= 400);
  if (broken.length > 0) {
    findings.push({
      id: "technical-broken-pages",
      category: "technical",
      severity: broken.length > 3 ? "high" : "medium",
      title: `${broken.length} broken page${broken.length > 1 ? "s" : ""} (4xx/5xx)`,
      summary: `${broken.length} URL(s) returned error status codes during the crawl.`,
      whyItMatters: "Broken pages hurt crawl budget, lose any inbound link equity, and instantly damage trust when visitors land on them.",
      recommendation: "Fix or 301-redirect all broken URLs. Check for typos in internal links. Use Google Search Console to identify any externally-linked broken pages.",
      affectedUrls: broken.map((p) => p.url)
    });
  }
  const noindexed = pages.filter(
    (p) => p.noindex && ["service", "location", "contact"].includes(p.pageType)
  );
  if (noindexed.length > 0) {
    findings.push({
      id: "technical-noindex-money-pages",
      category: "technical",
      severity: "high",
      title: `${noindexed.length} money page${noindexed.length > 1 ? "s" : ""} blocked from Google`,
      summary: `${noindexed.length} service/location/contact page(s) have a noindex directive.`,
      whyItMatters: "These pages are completely invisible to Google. If no one can find your service pages, you lose every organic lead they would have generated.",
      recommendation: "Remove the noindex meta tag from these pages immediately. Check both the HTML meta tag and any X-Robots-Tag HTTP headers.",
      affectedUrls: noindexed.map((p) => p.url)
    });
  }
  const noTitle = keyPages.filter((p) => !p.title || p.title.trim() === "");
  if (noTitle.length > 0) {
    findings.push({
      id: "technical-missing-title",
      category: "technical",
      severity: "high",
      title: `${noTitle.length} key page${noTitle.length > 1 ? "s" : ""} missing a title tag`,
      summary: `${noTitle.length} important page(s) have no <title> tag.`,
      whyItMatters: "The title tag is one of the strongest on-page SEO signals. Pages without titles are effectively invisible in search results and receive no ranking credit.",
      recommendation: 'Add a descriptive title to every page. Format: "Primary Keyword | Business Name | City, State". Keep it under 60 characters.',
      affectedUrls: noTitle.map((p) => p.url)
    });
  }
  const shortTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > 0 && p.title.trim().length < TITLE_MIN
  );
  if (shortTitle.length > 0) {
    findings.push({
      id: "technical-short-title",
      category: "technical",
      severity: "low",
      title: `${shortTitle.length} page${shortTitle.length > 1 ? "s" : ""} with very short title tags`,
      summary: `${shortTitle.length} page(s) have titles under ${TITLE_MIN} characters.`,
      whyItMatters: "Short titles miss the opportunity to include your city, service, and business name — all signals that help Google understand what you do and where.",
      recommendation: `Expand these titles to ${TITLE_MIN}–${TITLE_MAX} characters. Include the primary service, city/state, and brand name.`,
      affectedUrls: shortTitle.map((p) => p.url)
    });
  }
  const longTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > TITLE_MAX
  );
  if (longTitle.length > 0) {
    findings.push({
      id: "technical-long-title",
      category: "technical",
      severity: "low",
      title: `${longTitle.length} page${longTitle.length > 1 ? "s" : ""} with titles that will be truncated in search`,
      summary: `${longTitle.length} page(s) have titles over ${TITLE_MAX} characters.`,
      whyItMatters: "Google truncates titles longer than ~60–70 characters in search results, cutting off important keywords or your brand name.",
      recommendation: `Shorten these titles to under ${TITLE_MAX} characters. Lead with the most important keyword.`,
      affectedUrls: longTitle.map((p) => p.url)
    });
  }
  const noDesc = keyPages.filter((p) => !p.metaDescription || p.metaDescription.trim() === "");
  if (noDesc.length > 0) {
    findings.push({
      id: "technical-missing-meta-desc",
      category: "technical",
      severity: "medium",
      title: `${noDesc.length} key page${noDesc.length > 1 ? "s" : ""} missing meta descriptions`,
      summary: `${noDesc.length} important page(s) have no meta description.`,
      whyItMatters: "Without a meta description, Google auto-generates one — often pulling an irrelevant sentence. A well-written description directly impacts click-through rates from search results.",
      recommendation: `Write a ${DESC_MIN}–${DESC_MAX} character meta description for each page. Include a CTA: "Call us for a free estimate today."`,
      affectedUrls: noDesc.map((p) => p.url)
    });
  }
  const noH1 = pages.filter((p) => p.h1s.length === 0);
  if (noH1.length > 0) {
    findings.push({
      id: "technical-missing-h1",
      category: "technical",
      severity: "medium",
      title: `${noH1.length} page${noH1.length > 1 ? "s" : ""} missing an H1 heading`,
      summary: `${noH1.length} page(s) have no H1 tag.`,
      whyItMatters: "The H1 is the primary on-page heading — it tells both Google and visitors what the page is about. Pages without an H1 miss a key ranking signal.",
      recommendation: 'Add a single, descriptive H1 to each page. For a service page it should name the service and ideally the location: "Roof Replacement in Austin, TX".',
      affectedUrls: noH1.map((p) => p.url)
    });
  }
  const multiH1 = pages.filter((p) => p.h1s.length > 1);
  if (multiH1.length > 0) {
    findings.push({
      id: "technical-multiple-h1",
      category: "technical",
      severity: "low",
      title: `${multiH1.length} page${multiH1.length > 1 ? "s" : ""} with multiple H1 headings`,
      summary: `${multiH1.length} page(s) have more than one H1 tag.`,
      whyItMatters: "Multiple H1s dilute the page's topical focus signal. Google prefers one clear H1 per page.",
      recommendation: "Keep exactly one H1 per page. Downgrade additional H1s to H2 or H3.",
      affectedUrls: multiH1.map((p) => p.url)
    });
  }
  const noCanonical = keyPages.filter((p) => !p.canonical || p.canonical.trim() === "");
  if (noCanonical.length > 0) {
    findings.push({
      id: "technical-missing-canonical",
      category: "technical",
      severity: "low",
      title: `${noCanonical.length} key page${noCanonical.length > 1 ? "s" : ""} missing canonical tags`,
      summary: `${noCanonical.length} important page(s) have no canonical link element.`,
      whyItMatters: "Canonical tags prevent duplicate content issues (e.g., http vs https, trailing slash variants). Without them, link equity can be split across URL variations.",
      recommendation: 'Add a self-referencing canonical tag to every page: `<link rel="canonical" href="https://yourdomain.com/page/" />`',
      affectedUrls: noCanonical.map((p) => p.url)
    });
  }
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0);
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0);
  if (totalImages > 0) {
    const missingRatio = missingAlt / totalImages;
    if (missingRatio > ALT_POOR_THRESHOLD) {
      const pct = Math.round(missingRatio * 100);
      findings.push({
        id: "technical-poor-image-alt",
        category: "technical",
        severity: missingRatio > 0.6 ? "medium" : "low",
        title: `${pct}% of images are missing alt text`,
        summary: `${missingAlt} of ${totalImages} images across the site have no alt attribute.`,
        whyItMatters: "Alt text helps Google understand image content — contributing to Google Image Search visibility and overall page relevance. It's also an accessibility requirement (ADA).",
        recommendation: 'Add descriptive alt text to all images. For local businesses: include the service and location in alt text for hero images (e.g., "roof replacement Austin TX").'
      });
    }
  }
  if (home) {
    notes.push(`Homepage: "${home.title ?? "no title"}" | H1s: ${home.h1s.length} | Words: ${home.wordCount ?? 0}`);
  }
  notes.push(
    `Pages scanned: ${pages.length} | Key pages: ${keyPages.length} | Broken: ${broken.length}`,
    `Robots: ${robotsFound ? "found" : "missing"} | Sitemap: ${sitemapFound ? "found" : "missing"}`,
    `Images: ${totalImages} total, ${missingAlt} missing alt (${totalImages > 0 ? Math.round(missingAlt / totalImages * 100) : 0}%)`
  );
  return { findings, notes };
}
function analyzeLocalSeo(input) {
  const { pages, domain } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  const contactPages = pagesByType(pages, "contact");
  if (home && home.phones.length === 0) {
    findings.push({
      id: "local-no-phone-homepage",
      category: "localSeo",
      severity: "high",
      title: "No phone number found on homepage",
      summary: `The homepage for ${domain} has no detectable phone number.`,
      whyItMatters: "Google uses phone number presence as a local relevance signal. More importantly, visitors who arrive via local search expect to see a phone number immediately — especially on mobile.",
      recommendation: 'Add a click-to-call phone number in the site header and prominently on the homepage. Use a tel: href: `<a href="tel:+15555551234">(555) 555-1234</a>`'
    });
  }
  const contactWithNoPhone = contactPages.filter((p) => p.phones.length === 0);
  if (contactPages.length > 0 && contactWithNoPhone.length > 0) {
    findings.push({
      id: "local-no-phone-contact",
      category: "localSeo",
      severity: "high",
      title: "Contact page missing phone number",
      summary: "The contact page has no visible phone number.",
      whyItMatters: "When a prospect visits your contact page they are ready to act. Missing a phone number at this moment is a direct lead loss.",
      recommendation: "Place the phone number at the top of the contact page in large, tap-friendly text with a tel: link.",
      affectedUrls: contactWithNoPhone.map((p) => p.url)
    });
  }
  if (home && !home.hasAddress) {
    findings.push({
      id: "local-no-address-homepage",
      category: "localSeo",
      severity: "medium",
      title: "No physical address detected on homepage",
      summary: `${domain} homepage does not appear to display a business address.`,
      whyItMatters: "NAP (Name, Address, Phone) consistency is a core local SEO signal. Google uses address presence to confirm local relevance and to match you with map listings.",
      recommendation: "Display your full business address in the site footer and on the homepage. Mark it up with LocalBusiness schema for extra credit."
    });
  }
  const hasLocalBusinessSchema = pages.some(
    (p) => p.schemaTypes.some(
      (t) => [
        "LocalBusiness",
        "ProfessionalService",
        "HomeAndConstructionBusiness",
        "FoodEstablishment",
        "HealthAndBeautyBusiness",
        "MedicalOrganization",
        "AutoRepair",
        "Restaurant"
      ].includes(t)
    )
  );
  if (!hasLocalBusinessSchema) {
    findings.push({
      id: "local-no-localbusiness-schema",
      category: "localSeo",
      severity: "high",
      title: "No LocalBusiness structured data found",
      summary: "The site has no LocalBusiness (or equivalent) JSON-LD schema markup.",
      whyItMatters: 'LocalBusiness schema is how you formally tell Google: "This is a local business, here is our address, phone, hours, and category." It directly powers your Google Business Profile integration and Knowledge Panel data.',
      recommendation: "Add a LocalBusiness JSON-LD block to the homepage. Include: name, address, phone, url, openingHours, and geo coordinates. Use schema.org/LocalBusiness as the base type and a more specific subtype if applicable."
    });
  }
  const hasAnyMap = pages.some((p) => p.hasMap);
  if (!hasAnyMap) {
    findings.push({
      id: "local-no-map",
      category: "localSeo",
      severity: "medium",
      title: "No map embed or directions link found",
      summary: 'No Google Maps embed or "Get Directions" link was detected anywhere on the site.',
      whyItMatters: "A map embed reinforces physical location signals, helps mobile users get directions instantly, and contributes to local relevance signals for Google.",
      recommendation: 'Embed a Google Maps iframe on the contact page. Also add a "Get Directions" button linked to your Google Maps listing.'
    });
  }
  const hasAnyHours = pages.some((p) => p.hasHours);
  if (!hasAnyHours) {
    findings.push({
      id: "local-no-hours",
      category: "localSeo",
      severity: "medium",
      title: "No business hours found on the site",
      summary: "No business hours information was detected across all scanned pages.",
      whyItMatters: "Hours are a core conversion signal — users need to know if you're open before they call. Google also uses hours from your site to cross-validate Google Business Profile data.",
      recommendation: "Display your hours on the homepage, contact page, and in the footer. Add `openingHoursSpecification` to your LocalBusiness schema."
    });
  }
  const locationPages = pagesByType(pages, "location");
  if (pages.length >= 5 && locationPages.length === 0) {
    findings.push({
      id: "local-no-location-pages",
      category: "localSeo",
      severity: "medium",
      title: "No location or service-area pages found",
      summary: "The site appears to have no pages targeting specific cities or service areas.",
      whyItMatters: 'Without location-specific pages, the site cannot rank for "[service] in [city]" searches. These are the highest-value local SEO searches for most service businesses.',
      recommendation: 'Create dedicated pages for each primary service area (e.g., "/plumber-austin-tx/"). Each page should mention the city prominently and include NAP for that location.'
    });
  }
  const phonePagesCount = keyPages.filter((p) => p.phones.length > 0).length;
  notes.push(
    `LocalBusiness schema: ${hasLocalBusinessSchema ? "found" : "missing"}`,
    `Map present: ${hasAnyMap ? "yes" : "no"} | Hours present: ${hasAnyHours ? "yes" : "no"}`,
    `Phone on key pages: ${phonePagesCount}/${keyPages.length} | Location pages: ${locationPages.length}`
  );
  return { findings, notes };
}
const MIN_CTA_COVERAGE = 0.5;
const BOOKING_PATTERNS$1 = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i
];
function analyzeConversion(input) {
  const { pages } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  const contactPages = pagesByType(pages, "contact");
  if (home && home.ctaTexts.length === 0) {
    findings.push({
      id: "conversion-no-cta-homepage",
      category: "conversion",
      severity: "high",
      title: "Homepage has no clear call-to-action",
      summary: "No CTA buttons or action links were detected on the homepage.",
      whyItMatters: "The homepage is most visitors' first impression. Without a clear CTA (Call Now, Get a Quote, Book Online), most visitors leave without taking action — turning traffic into wasted potential.",
      recommendation: 'Add at least two prominent CTAs to the homepage: one above the fold (e.g., "Call Now") and one mid-page (e.g., "Get a Free Estimate"). Make them visually distinct — colored buttons, not just text links.'
    });
  }
  if (home && home.phones.length === 0) {
    findings.push({
      id: "conversion-no-phone-homepage",
      category: "conversion",
      severity: "high",
      title: "Phone number missing from homepage",
      summary: "No phone number is visible on the homepage.",
      whyItMatters: "For local service businesses, the phone call is often the highest-value conversion. Hiding the phone number costs you direct leads — especially from mobile visitors who want to call immediately.",
      recommendation: 'Place the phone number in the site header (visible on all pages) and prominently on the homepage. Use a tap-to-call link for mobile: `<a href="tel:+1XXXXXXXXXX">`. Make it large and visible without scrolling.'
    });
  }
  const pagesWithForm = pages.filter((p) => p.hasForm);
  if (pagesWithForm.length === 0) {
    findings.push({
      id: "conversion-no-form",
      category: "conversion",
      severity: "medium",
      title: "No contact form found on the site",
      summary: "No lead capture form was detected on any page.",
      whyItMatters: "Not every visitor is ready to call. A contact form captures leads from visitors who prefer to inquire by email, who are outside business hours, or who want to provide details before calling.",
      recommendation: "Add a contact/inquiry form to the contact page and ideally the homepage. Keep it short: name, phone, service needed, preferred callback time."
    });
  } else if (contactPages.length > 0 && contactPages.every((p) => !p.hasForm)) {
    findings.push({
      id: "conversion-no-form-contact-page",
      category: "conversion",
      severity: "medium",
      title: "Contact page has no form",
      summary: "The contact page exists but has no lead capture form.",
      whyItMatters: "A visitor on the contact page is high-intent. Without a form, their only option is to call — which many won't do if they're browsing after hours or prefer written communication.",
      recommendation: "Add a simple inquiry form to the contact page. At minimum: name, phone or email, message.",
      affectedUrls: contactPages.map((p) => p.url)
    });
  }
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0);
    const ctaCoverage = pagesWithCTA.length / keyPages.length;
    if (ctaCoverage < MIN_CTA_COVERAGE) {
      const missing = keyPages.filter((p) => p.ctaTexts.length === 0);
      findings.push({
        id: "conversion-low-cta-coverage",
        category: "conversion",
        severity: "medium",
        title: `Only ${Math.round(ctaCoverage * 100)}% of key pages have CTAs`,
        summary: `${missing.length} of ${keyPages.length} important pages have no detectable call-to-action.`,
        whyItMatters: "Every page a visitor lands on is a conversion opportunity. Service pages, location pages, and about pages should all push visitors toward contacting you.",
        recommendation: 'Add a CTA section to every key page — at minimum a "Call us" button and a brief lead form. Think of every page as a landing page.',
        affectedUrls: missing.map((p) => p.url)
      });
    }
  }
  const hasBookingCTA = pages.some(
    (p) => p.ctaTexts.some((cta) => BOOKING_PATTERNS$1.some((pat) => pat.test(cta)))
  );
  if (!hasBookingCTA && pages.length >= 3) {
    findings.push({
      id: "conversion-no-booking-cta",
      category: "conversion",
      severity: "medium",
      title: "No booking or quote CTA found",
      summary: 'No "Get a Quote", "Book Now", or "Schedule" action was detected anywhere on the site.',
      whyItMatters: "For most local service businesses, the quote or booking request is the primary micro-conversion. Without prompting visitors to take this step, you leave revenue on the table.",
      recommendation: 'Add a clear "Get a Free Estimate" or "Request a Quote" button to the homepage and service pages. Link it to a short form or booking tool.'
    });
  }
  const totalCTAs = pages.reduce((n, p) => n + p.ctaTexts.length, 0);
  notes.push(
    `Homepage CTAs: ${home?.ctaTexts.length ?? 0}`,
    `Total CTAs site-wide: ${totalCTAs} | Pages with forms: ${pagesWithForm.length}`,
    `Booking CTA present: ${hasBookingCTA ? "yes" : "no"}`
  );
  return { findings, notes };
}
const HOME_WORD_MIN = 300;
const SERVICE_WORD_MIN = 200;
const THIN_PAGE_WORD_MIN = 150;
function analyzeContent(input) {
  const { pages } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const servicePages = pagesByType(pages, "service");
  const locationPages = pagesByType(pages, "location");
  const blogPages = pagesByType(pages, "blog");
  if (home) {
    const homeWords = home.wordCount ?? 0;
    if (homeWords < HOME_WORD_MIN && homeWords > 0) {
      findings.push({
        id: "content-thin-homepage",
        category: "content",
        severity: "medium",
        title: `Homepage content is thin (${homeWords} words)`,
        summary: `The homepage has only ${homeWords} words — below the recommended minimum of ${HOME_WORD_MIN}.`,
        whyItMatters: "Google uses content volume and depth to gauge topical relevance. A thin homepage signals low investment and limits your ability to rank for competitive local keywords.",
        recommendation: `Expand the homepage to at least ${HOME_WORD_MIN} words. Add sections covering: what you do, why choose you, service areas, testimonials, and a clear CTA. Quality matters more than quantity — every sentence should serve the visitor.`,
        affectedUrls: [home.url]
      });
    }
  }
  if (servicePages.length === 0 && pages.length >= 4) {
    findings.push({
      id: "content-no-service-pages",
      category: "content",
      severity: "high",
      title: "No dedicated service pages found",
      summary: "The site appears to have no pages dedicated to individual services.",
      whyItMatters: `A single "Services" page can't rank for every specific service. Individual service pages (e.g., "/roof-replacement/", "/gutter-cleaning/") each have a chance to rank for their own keyword and capture a different segment of searchers.`,
      recommendation: "Create one page per core service. Each page should: target a specific keyword, mention the service area, include a CTA, and have at least 300 words of genuine content."
    });
  } else if (servicePages.length === 1 && pages.length >= 6) {
    findings.push({
      id: "content-too-few-service-pages",
      category: "content",
      severity: "medium",
      title: "Only one service page found",
      summary: "The site has only one page classifiable as a service page.",
      whyItMatters: "Each unique service you offer deserves its own page. A single service page limits your Google footprint and forces all keywords to compete on one URL.",
      recommendation: "Create individual pages for each service you offer. Use a clear URL structure: /service-name/ or /service-name-city/.",
      affectedUrls: servicePages.map((p) => p.url)
    });
  }
  const thinServicePages = servicePages.filter(
    (p) => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < SERVICE_WORD_MIN
  );
  if (thinServicePages.length > 0) {
    findings.push({
      id: "content-thin-service-pages",
      category: "content",
      severity: "medium",
      title: `${thinServicePages.length} service page${thinServicePages.length > 1 ? "s are" : " is"} thin on content`,
      summary: `${thinServicePages.length} service page(s) have under ${SERVICE_WORD_MIN} words.`,
      whyItMatters: "Thin service pages are hard to rank. Google looks for content depth to confirm the page genuinely covers the topic. Thin pages also fail to build confidence with potential customers.",
      recommendation: `Expand each service page to at least ${SERVICE_WORD_MIN} words. Cover: what the service is, how it works, why choose you, what areas you serve, FAQs, and a strong CTA.`,
      affectedUrls: thinServicePages.map((p) => p.url)
    });
  }
  if (locationPages.length === 0 && pages.length >= 5) {
    findings.push({
      id: "content-no-location-pages",
      category: "content",
      severity: "medium",
      title: "No location or service-area pages found",
      summary: "No pages targeting specific cities or service areas were detected.",
      whyItMatters: `"Plumber near me" and "[service] in [city]" are among the most valuable search queries for local businesses. Without location pages, you can't rank for these unless your domain authority is very high.`,
      recommendation: "Create city/area pages for every location you serve. URL format: /[service]-[city]-[state]/. Each must have unique, helpful content — not just the same text with the city name swapped."
    });
  }
  const allThinPages = pages.filter(
    (p) => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < THIN_PAGE_WORD_MIN && !["gallery", "blog", "other"].includes(p.pageType)
  );
  if (allThinPages.length > pages.length * 0.4 && allThinPages.length >= 3) {
    findings.push({
      id: "content-widespread-thin-pages",
      category: "content",
      severity: "medium",
      title: `${allThinPages.length} pages have very thin content (under ${THIN_PAGE_WORD_MIN} words)`,
      summary: `More than 40% of scanned pages have under ${THIN_PAGE_WORD_MIN} words.`,
      whyItMatters: `A pattern of thin pages across a site can trigger a "thin content" quality signal in Google's algorithms, reducing the rankings of all pages — including well-written ones.`,
      recommendation: "Audit all thin pages. Either expand their content meaningfully, consolidate similar thin pages into one comprehensive page, or add a noindex tag to pages that genuinely have no ranking value (e.g., login pages).",
      affectedUrls: allThinPages.map((p) => p.url)
    });
  }
  const avgWords = pages.length > 0 ? Math.round(pages.reduce((n, p) => n + (p.wordCount ?? 0), 0) / pages.length) : 0;
  notes.push(
    `Service pages: ${servicePages.length} | Location pages: ${locationPages.length} | Blog pages: ${blogPages.length}`,
    `Average word count: ${avgWords} | Thin pages (<${THIN_PAGE_WORD_MIN}w): ${allThinPages.length}`,
    `Homepage words: ${home?.wordCount ?? "N/A"}`
  );
  return { findings, notes };
}
function analyzeTrust(input) {
  const { pages, domain } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const aboutPages = pagesByType(pages, "about");
  const galleryPages = pagesByType(pages, "gallery");
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`;
  if (!isHttps(homeUrl)) {
    findings.push({
      id: "trust-no-https",
      category: "trust",
      severity: "high",
      title: "Site is not using HTTPS",
      summary: `${domain} appears to be serving pages over HTTP instead of HTTPS.`,
      whyItMatters: 'Google explicitly uses HTTPS as a ranking signal. More importantly, Chrome displays "Not Secure" warnings to visitors on HTTP sites — which kills conversion rates and trust instantly.',
      recommendation: "Install an SSL certificate and force HTTPS across the site. Most hosts offer free SSL via Let's Encrypt. Redirect all HTTP traffic to HTTPS with a 301 redirect."
    });
  }
  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0);
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals);
  if (totalTestimonials === 0 && !hasTrustOnAnyPage) {
    findings.push({
      id: "trust-no-testimonials",
      category: "trust",
      severity: "high",
      title: "No testimonials or reviews found on the site",
      summary: "No customer testimonials, star ratings, or review widgets were detected.",
      whyItMatters: 'For local service businesses, social proof is often the deciding factor. Visitors ask: "Has anyone else used this business and been happy?" Without testimonials, many prospects move to a competitor who shows proof.',
      recommendation: "Add 3–5 real customer testimonials to the homepage. Include the customer's first name, location, and service. Also embed your Google Business Profile reviews using a review widget."
    });
  } else if (!hasTrustOnAnyPage && totalTestimonials === 0) ;
  else if (!hasTrustOnAnyPage) {
    findings.push({
      id: "trust-weak-trust-signals",
      category: "trust",
      severity: "medium",
      title: "Trust signals are weak or limited",
      summary: "Some trust elements exist but no licensing, certification, or guarantee language was found.",
      whyItMatters: 'Trust signals help overcome purchase anxiety. Phrases like "Licensed & Insured", "5-Star Rated", "Satisfaction Guaranteed" increase conversion rates significantly for service businesses.',
      recommendation: "Add trust badges and copy to the homepage: license numbers, insurance statements, guarantee language, award logos, and years in business. Place them above the fold if possible."
    });
  }
  if (aboutPages.length === 0) {
    findings.push({
      id: "trust-no-about-page",
      category: "trust",
      severity: "medium",
      title: "No About or Team page found",
      summary: 'No "About Us" or team page was detected on the site.',
      whyItMatters: "Local customers often want to know who they're inviting into their home or trusting with their business. An About page humanizes your brand and builds credibility.",
      recommendation: "Add an About page that tells your story: how long you've been in business, who your team is, what makes you different, and why you care about the work you do. Include real photos of your team."
    });
  }
  if (galleryPages.length === 0 && pages.length >= 4) {
    findings.push({
      id: "trust-no-gallery",
      category: "trust",
      severity: "medium",
      title: "No gallery or portfolio page found",
      summary: "No gallery, portfolio, or before/after page was detected.",
      whyItMatters: `For trade businesses (roofers, remodelers, landscapers, etc.) and beauty services, showing your work is one of the strongest trust signals available. "Show, don't tell."`,
      recommendation: 'Add a gallery, portfolio, or "Our Work" page with photos of real completed jobs. For each image, add a descriptive alt text (e.g., "roof replacement Austin TX") for SEO benefit.'
    });
  }
  if (home && !home.hasTrustSignals && aboutPages.length > 0) {
    findings.push({
      id: "trust-homepage-no-trust-content",
      category: "trust",
      severity: "low",
      title: "Homepage has no visible trust signals",
      summary: "The homepage has no detectable testimonials, certifications, or guarantee language.",
      whyItMatters: "The homepage is the highest-traffic page on most sites. If trust signals only appear on inner pages, most visitors never see them.",
      recommendation: "Move your strongest trust signals to the homepage: one star-rated testimonial, your license/insurance statement, and any guarantee you offer.",
      affectedUrls: [home.url]
    });
  }
  notes.push(
    `HTTPS: ${isHttps(homeUrl) ? "yes" : "NO"}`,
    `Testimonials found: ${totalTestimonials} | Trust signals on any page: ${hasTrustOnAnyPage ? "yes" : "no"}`,
    `About pages: ${aboutPages.length} | Gallery pages: ${galleryPages.length}`
  );
  return { findings, notes };
}
const log$d = scanRepository.createLogger("analysisStage");
async function analysisStage(ctx, emit) {
  emit("Analyzing technical SEO…", 76);
  const input = {
    pages: ctx.pages,
    domain: ctx.domain,
    robotsFound: ctx.robotsFound,
    sitemapFound: ctx.sitemapFound,
    detectedBusinessType: ctx.detectedBusinessType
  };
  const technical = analyzeTechnical(input);
  const localSeo = analyzeLocalSeo(input);
  const conversion = analyzeConversion(input);
  emit("Analyzing local SEO…", 80);
  emit("Analyzing conversions…", 84);
  const content = analyzeContent(input);
  const trust = analyzeTrust(input);
  emit("Analyzing content & trust…", 88);
  ctx.categoryFindings = {
    technical: technical.findings,
    localSeo: localSeo.findings,
    conversion: conversion.findings,
    content: content.findings,
    trust: trust.findings
  };
  ctx.allFindings = [
    ...technical.findings,
    ...localSeo.findings,
    ...conversion.findings,
    ...content.findings,
    ...trust.findings
  ];
  log$d.info(
    `Analysis complete: ${ctx.allFindings.length} findings (tech=${technical.findings.length}, local=${localSeo.findings.length}, conv=${conversion.findings.length}, content=${content.findings.length}, trust=${trust.findings.length})`
  );
}
const log$c = scanRepository.createLogger("captureScreenshots");
async function takeScreenshot(page, screenshotDir, label) {
  try {
    await fs.ensureDir(screenshotDir);
    const filename = `${label}.png`;
    const filepath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    log$c.info(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (err) {
    log$c.warn(`Screenshot failed (${label}): ${err.message}`);
    return void 0;
  }
}
async function checkAboveFoldCta(page) {
  try {
    return await page.evaluate(() => {
      const foldY = window.innerHeight;
      const ctaRe = /\b(call now?|call today|book now?|book online|schedule|request (a )?quote|get (a )?(free )?quote|order now|contact us|get directions|get started|free estimate|speak to us|talk to us)\b/i;
      const candidates = Array.from(
        document.querySelectorAll('a[href], button, [role="button"]')
      );
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= foldY || rect.bottom <= 0) continue;
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (el.innerText || el.textContent || "").trim();
        if (ctaRe.test(text)) {
          return { passed: true, detail: `CTA found: "${text.slice(0, 60)}"` };
        }
      }
      return { passed: false, detail: "No strong CTA button or link above the fold" };
    });
  } catch {
    return { passed: false, detail: "Check could not run" };
  }
}
async function checkPhoneVisible(page) {
  try {
    return await page.evaluate(() => {
      const foldY = window.innerHeight;
      const phoneRe = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
      const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
      for (const el of telLinks) {
        const rect = el.getBoundingClientRect();
        if (rect.top < foldY && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
          return { passed: true, detail: "Phone tel: link visible above the fold" };
        }
      }
      const containers = Array.from(
        document.querySelectorAll(
          'header, [class*="header"], [class*="top-bar"], [class*="topbar"], [class*="banner"], nav'
        )
      );
      for (const el of containers) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= foldY || rect.bottom <= 0) continue;
        const text = el.innerText || "";
        if (phoneRe.test(text)) {
          return { passed: true, detail: "Phone number visible in header/nav area" };
        }
      }
      const all = Array.from(document.querySelectorAll("*"));
      for (const el of all.slice(0, 300)) {
        if (el.children.length > 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top >= foldY || rect.bottom <= 0) continue;
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (el.innerText || el.textContent || "").trim();
        if (phoneRe.test(text) && text.length < 100) {
          return { passed: true, detail: "Phone number text visible above the fold" };
        }
      }
      return { passed: false, detail: "No phone number visible in first viewport" };
    });
  } catch {
    return { passed: false, detail: "Check could not run" };
  }
}
async function checkTrustSignals(page) {
  try {
    return await page.evaluate(() => {
      const cutoffY = window.innerHeight * 2.5;
      const trustRe = /\b(review|testimonial|\d[\d,]*\s*star|rated\s+\d|licensed|insured|bonded|guarantee|family[- ]owned|\d+\s*years?\s*(of\s*)?experience|certified|award|trusted|bbb|accredited)\b/i;
      const all = Array.from(document.querySelectorAll("*"));
      for (const el of all.slice(0, 500)) {
        if (el.children.length > 2) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top >= cutoffY || rect.bottom <= 0) continue;
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (el.innerText || el.textContent || "").trim();
        if (text.length > 400 || text.length === 0) continue;
        if (trustRe.test(text)) {
          const match = text.match(trustRe);
          return { passed: true, detail: `Trust signal found: "${match?.[0]}"` };
        }
      }
      return { passed: false, detail: "No trust signal keywords near top of page" };
    });
  } catch {
    return { passed: false, detail: "Check could not run" };
  }
}
async function checkHeroClarity(page) {
  try {
    return await page.evaluate(() => {
      const foldY = window.innerHeight;
      const h1List = Array.from(document.querySelectorAll("h1"));
      for (const h of h1List) {
        const rect = h.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= foldY) continue;
        const text = (h.innerText || h.textContent || "").trim();
        const words2 = text.split(/\s+/).filter(Boolean).length;
        if (words2 >= 3) {
          return { passed: true, detail: `H1 above fold: "${text.slice(0, 80)}"` };
        }
        return {
          passed: false,
          detail: `H1 is too brief (${words2} word${words2 === 1 ? "" : "s"}): "${text.slice(0, 60)}"`
        };
      }
      if (h1List.length === 0) {
        return { passed: false, detail: "No H1 heading found on page" };
      }
      const h1Text = (h1List[0].innerText || h1List[0].textContent || "").trim();
      const words = h1Text.split(/\s+/).filter(Boolean).length;
      if (words >= 3) {
        return { passed: false, detail: `H1 exists but is below the fold: "${h1Text.slice(0, 60)}"` };
      }
      return { passed: false, detail: `H1 is below the fold and too brief: "${h1Text.slice(0, 60)}"` };
    });
  } catch {
    return { passed: false, detail: "Check could not run" };
  }
}
const log$b = scanRepository.createLogger("visualAnalyzer");
const NAVIGATE_TIMEOUT = 15e3;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0";
async function runVisualAnalysis(browser, crawledPages, screenshotDir) {
  const pagesAnalyzed = [];
  const findings = [];
  const homepage2 = crawledPages.find((p) => p.pageType === "home") ?? crawledPages[0];
  const contactPage = crawledPages.find((p) => p.pageType === "contact");
  const servicePage = crawledPages.find(
    (p) => ["service", "menu", "location"].includes(p.pageType)
  );
  const targets = [];
  if (homepage2) targets.push({ crawledPage: homepage2, label: "homepage", runChecks: true });
  if (contactPage) targets.push({ crawledPage: contactPage, label: "contact", runChecks: false });
  if (servicePage) targets.push({ crawledPage: servicePage, label: "service", runChecks: false });
  if (targets.length === 0) {
    log$b.warn("No pages available for visual analysis");
    return { result: { pagesAnalyzed: [] }, findings: [] };
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: USER_AGENT,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }
  });
  try {
    for (const { crawledPage, label, runChecks } of targets) {
      const url = crawledPage.finalUrl;
      try {
        const page = await context.newPage();
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATE_TIMEOUT });
          const screenshotPath = await takeScreenshot(page, screenshotDir, label);
          const screenshotFile = screenshotPath ? path.basename(screenshotPath) : void 0;
          let checks;
          if (runChecks) {
            const [cta, phone, trust, hero] = await Promise.all([
              checkAboveFoldCta(page),
              checkPhoneVisible(page),
              checkTrustSignals(page),
              checkHeroClarity(page)
            ]);
            checks = {
              hasAboveFoldCta: cta,
              hasPhoneVisible: phone,
              hasTrustSignalsVisible: trust,
              hasHeroClarity: hero
            };
            log$b.info(
              `Visual checks [${label}]: cta=${cta.passed} phone=${phone.passed} trust=${trust.passed} hero=${hero.passed}`
            );
          } else {
            checks = {
              hasAboveFoldCta: { passed: true, detail: "Not checked (homepage only)" },
              hasPhoneVisible: { passed: true, detail: "Not checked (homepage only)" },
              hasTrustSignalsVisible: { passed: true, detail: "Not checked (homepage only)" },
              hasHeroClarity: { passed: true, detail: "Not checked (homepage only)" }
            };
          }
          const analysis = {
            url,
            pageType: label,
            screenshotPath,
            screenshotFile,
            checks
          };
          pagesAnalyzed.push(analysis);
          if (runChecks) {
            findings.push(...buildFindings(analysis));
          }
        } finally {
          await page.close();
        }
      } catch (err) {
        log$b.warn(`Visual analysis failed for ${label} (${url}): ${err.message}`);
      }
    }
  } finally {
    await context.close();
  }
  log$b.info(
    `Visual analysis complete: ${pagesAnalyzed.length} page(s) analyzed, ${findings.length} finding(s)`
  );
  return { result: { pagesAnalyzed }, findings };
}
function buildFindings(analysis) {
  const out = [];
  const { checks, url } = analysis;
  if (!checks.hasHeroClarity.passed) {
    out.push({
      id: "visual-no-hero-clarity",
      category: "conversion",
      severity: "medium",
      title: "Hero section does not clearly communicate what the business offers",
      summary: checks.hasHeroClarity.detail ?? "The above-the-fold headline is missing or too vague to tell visitors what to expect.",
      whyItMatters: "Visitors decide whether to stay or leave within seconds. A clear H1 headline stating what you do, where you do it, and what to do next dramatically reduces bounce rates from local searches.",
      recommendation: 'Write an H1 that answers three questions: What do you do? Where do you serve? What should the visitor do? Example: "Expert Roof Repairs in Dallas, TX — Call for a Free Estimate."',
      affectedUrls: [url]
    });
  }
  if (!checks.hasAboveFoldCta.passed) {
    out.push({
      id: "visual-no-above-fold-cta",
      category: "conversion",
      severity: "medium",
      title: "No clear call-to-action visible above the fold",
      summary: checks.hasAboveFoldCta.detail ?? "No prominent CTA button or link was detected in the first viewport.",
      whyItMatters: "Visitors from local search are ready to act immediately. Without a visible CTA above the fold they must scroll or hunt for a way to contact you — most won't.",
      recommendation: 'Place a high-contrast "Call Now" or "Book Online" button in the hero section, visible without scrolling. On mobile it should be large, tap-friendly, and linked to a tel: number.',
      affectedUrls: [url]
    });
  }
  if (!checks.hasPhoneVisible.passed) {
    out.push({
      id: "visual-no-phone-above-fold",
      category: "conversion",
      severity: "medium",
      title: "Phone number not visible in the initial viewport",
      summary: checks.hasPhoneVisible.detail ?? "No phone number was detected in the first screenful of the homepage.",
      whyItMatters: "Mobile searchers expect to see a phone number immediately. If they have to scroll to find it, many will hit back and call a competitor.",
      recommendation: "Add your phone number to the site header so it is always visible. Use a `tel:` link so mobile visitors can tap to call directly.",
      affectedUrls: [url]
    });
  }
  if (!checks.hasTrustSignalsVisible.passed) {
    out.push({
      id: "visual-no-trust-signals-visible",
      category: "trust",
      severity: "medium",
      title: "No visible trust signals near the top of the homepage",
      summary: checks.hasTrustSignalsVisible.detail ?? "No reviews, ratings, or credibility indicators were detected near the top of the page.",
      whyItMatters: 'Trust signals (star ratings, review counts, "Licensed & Insured") reduce hesitation for first-time visitors. Their absence makes the site feel less credible than competitors who display them prominently.',
      recommendation: "Add a trust bar below the hero section: number of Google reviews + star rating, years in business, license/insurance status, and any industry certifications.",
      affectedUrls: [url]
    });
  }
  return out;
}
const log$a = scanRepository.createLogger("visualStage");
async function visualStage(ctx, emit) {
  if (!ctx.browser) {
    log$a.warn("Visual stage skipped — no browser in context");
    return;
  }
  emit("Capturing visual screenshots…", 89);
  const screenshotDir = index.getScreenshotsDir(ctx.scanId);
  const { result: vResult, findings: vFindings } = await runVisualAnalysis(
    ctx.browser,
    ctx.pages,
    screenshotDir
  );
  ctx.visualResult = vResult;
  ctx.allFindings = [...ctx.allFindings, ...vFindings];
  for (const p of vResult.pagesAnalyzed) {
    if (p.screenshotPath) {
      ctx.screenshotPaths[p.pageType] = p.screenshotPath;
    }
  }
  log$a.info(
    `Visual analysis: ${vResult.pagesAnalyzed.length} page(s), ${vFindings.length} finding(s)`
  );
}
const log$9 = scanRepository.createLogger("lighthouse");
const CHROME_FLAGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage"
];
async function runLighthouse(url, fallbackChromiumPath) {
  const { launch } = await import("chrome-launcher");
  const { default: lighthouse } = await import("lighthouse");
  let chrome = null;
  try {
    try {
      chrome = await launch({ chromeFlags: CHROME_FLAGS, logLevel: "silent" });
    } catch {
      if (!fallbackChromiumPath) {
        log$9.warn("System Chrome not found and no fallback path provided — skipping Lighthouse");
        return null;
      }
      log$9.info(`System Chrome not found, using Playwright Chromium: ${fallbackChromiumPath}`);
      chrome = await launch({
        chromePath: fallbackChromiumPath,
        chromeFlags: CHROME_FLAGS,
        logLevel: "silent"
      });
    }
    if (!chrome) return null;
    log$9.info(`Chrome launched on port ${chrome.port}, running Lighthouse on ${url}`);
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "silent",
      onlyCategories: ["performance", "seo", "accessibility"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false
      }
    });
    if (!runnerResult?.lhr) {
      log$9.warn("Lighthouse returned no result");
      return null;
    }
    const { lhr } = runnerResult;
    const score = (cat) => Math.round((lhr.categories[cat]?.score ?? 0) * 100);
    const audit = (key) => {
      const val = lhr.audits?.[key]?.numericValue;
      return typeof val === "number" ? Math.round(val) : void 0;
    };
    const metrics = {
      url,
      performanceScore: score("performance"),
      seoScore: score("seo"),
      accessibilityScore: score("accessibility"),
      firstContentfulPaint: audit("first-contentful-paint"),
      largestContentfulPaint: audit("largest-contentful-paint"),
      totalBlockingTime: audit("total-blocking-time"),
      cumulativeLayoutShift: lhr.audits?.["cumulative-layout-shift"]?.numericValue,
      speedIndex: audit("speed-index")
    };
    log$9.info(
      `Lighthouse complete: perf=${metrics.performanceScore} seo=${metrics.seoScore} a11y=${metrics.accessibilityScore}`
    );
    return metrics;
  } catch (err) {
    log$9.warn(`Lighthouse run failed: ${err.message}`);
    return null;
  } finally {
    if (chrome) {
      try {
        chrome.kill();
      } catch {
      }
    }
  }
}
function analyzeLighthouse(metrics) {
  const findings = [];
  if (metrics.performanceScore < 50) {
    findings.push({
      id: "lh-performance-poor",
      category: "technical",
      severity: "high",
      title: `Page performance is poor (Lighthouse score: ${metrics.performanceScore}/100)`,
      summary: `The homepage scored ${metrics.performanceScore}/100 for performance — well below Google's recommended threshold of 90.`,
      whyItMatters: "Page speed is a direct Google ranking factor on mobile. A slow site also increases bounce rates — visitors leave before the page loads. For local businesses, most searches happen on mobile.",
      recommendation: "Work with a developer to address Core Web Vitals issues. Common fixes: optimize images (use WebP, add width/height), defer render-blocking JavaScript, enable browser caching, and use a CDN.",
      affectedUrls: [metrics.url]
    });
  } else if (metrics.performanceScore < 70) {
    findings.push({
      id: "lh-performance-needs-work",
      category: "technical",
      severity: "medium",
      title: `Page performance needs improvement (Lighthouse score: ${metrics.performanceScore}/100)`,
      summary: `The homepage scored ${metrics.performanceScore}/100 for performance — below Google's recommended threshold.`,
      whyItMatters: "Every second of load time increases bounce rates by ~20%. Even a moderate improvement in speed improves both user experience and search rankings.",
      recommendation: "Review Lighthouse recommendations: compress images, minimize CSS/JS, and leverage browser caching. Tools like Google PageSpeed Insights provide specific file-level guidance.",
      affectedUrls: [metrics.url]
    });
  }
  if (metrics.largestContentfulPaint !== void 0) {
    const lcp = metrics.largestContentfulPaint;
    if (lcp > 4e3) {
      findings.push({
        id: "lh-lcp-slow",
        category: "technical",
        severity: "high",
        title: `Largest Contentful Paint is slow (${(lcp / 1e3).toFixed(1)}s)`,
        summary: `LCP is ${(lcp / 1e3).toFixed(1)}s — Google's "Good" threshold is under 2.5s.`,
        whyItMatters: "LCP measures how long it takes for the main content to appear. Slow LCP signals a poor user experience and is penalized in Google's Core Web Vitals ranking.",
        recommendation: 'Optimize your hero image: compress it, convert to WebP, and preload it with `<link rel="preload">`. Eliminate render-blocking resources above the fold.',
        affectedUrls: [metrics.url]
      });
    } else if (lcp > 2500) {
      findings.push({
        id: "lh-lcp-needs-work",
        category: "technical",
        severity: "medium",
        title: `Largest Contentful Paint needs improvement (${(lcp / 1e3).toFixed(1)}s)`,
        summary: `LCP is ${(lcp / 1e3).toFixed(1)}s — target is under 2.5s.`,
        whyItMatters: "LCP is a Core Web Vitals metric used by Google for ranking. Reducing it improves both SEO and perceived load speed.",
        recommendation: "Compress the hero image, use next-gen formats (WebP/AVIF), and preload the LCP image element.",
        affectedUrls: [metrics.url]
      });
    }
  }
  if (metrics.totalBlockingTime !== void 0) {
    const tbt = metrics.totalBlockingTime;
    if (tbt > 600) {
      findings.push({
        id: "lh-tbt-high",
        category: "technical",
        severity: "high",
        title: `Page has heavy JavaScript blocking (TBT: ${tbt}ms)`,
        summary: `Total Blocking Time is ${tbt}ms — Google's "Good" threshold is under 200ms.`,
        whyItMatters: "High TBT means the browser is busy executing JavaScript and can't respond to user input. This makes the page feel frozen and correlates strongly with poor Core Web Vitals scores.",
        recommendation: "Audit your JavaScript bundles. Remove unused scripts, split code by route, defer non-critical JS, and replace heavy tracking scripts with lightweight alternatives.",
        affectedUrls: [metrics.url]
      });
    } else if (tbt > 200) {
      findings.push({
        id: "lh-tbt-medium",
        category: "technical",
        severity: "medium",
        title: `JavaScript is causing moderate blocking (TBT: ${tbt}ms)`,
        summary: `Total Blocking Time is ${tbt}ms — target is under 200ms.`,
        whyItMatters: "Elevated TBT degrades interactivity scores and user experience, especially on mobile devices.",
        recommendation: "Audit third-party scripts (chat widgets, analytics, tracking) and defer any that are not needed on page load.",
        affectedUrls: [metrics.url]
      });
    }
  }
  if (metrics.cumulativeLayoutShift !== void 0) {
    const cls = metrics.cumulativeLayoutShift;
    if (cls > 0.25) {
      findings.push({
        id: "lh-cls-high",
        category: "technical",
        severity: "high",
        title: `Page has severe layout instability (CLS: ${cls.toFixed(3)})`,
        summary: `Cumulative Layout Shift is ${cls.toFixed(3)} — Google's "Good" threshold is under 0.1.`,
        whyItMatters: "CLS measures how much the page jumps around as it loads. A high score frustrates users (and causes mis-clicks) and is a negative Core Web Vitals ranking signal.",
        recommendation: "Add explicit width/height attributes to all images and iframes. Avoid inserting content above existing content. Reserve space for ads and embeds with CSS.",
        affectedUrls: [metrics.url]
      });
    } else if (cls > 0.1) {
      findings.push({
        id: "lh-cls-medium",
        category: "technical",
        severity: "medium",
        title: `Page has moderate layout instability (CLS: ${cls.toFixed(3)})`,
        summary: `Cumulative Layout Shift is ${cls.toFixed(3)} — target is under 0.1.`,
        whyItMatters: "Layout shifts frustrate users and affect Core Web Vitals scoring.",
        recommendation: "Add width and height to images and embeds. Use CSS to reserve space for elements that load dynamically.",
        affectedUrls: [metrics.url]
      });
    }
  }
  if (metrics.seoScore < 80) {
    findings.push({
      id: "lh-seo-low",
      category: "technical",
      severity: "medium",
      title: `Lighthouse SEO score is low (${metrics.seoScore}/100)`,
      summary: `Lighthouse flagged technical SEO issues — score is ${metrics.seoScore}/100.`,
      whyItMatters: "Lighthouse's SEO category checks for crawlability, mobile-friendliness, and metadata correctness — basics that affect how Google indexes the site.",
      recommendation: "Run a full Lighthouse audit in Chrome DevTools (F12 → Lighthouse tab) to see the specific SEO issues flagged. Common fixes: add meta description, ensure text is readable without zooming, fix broken links.",
      affectedUrls: [metrics.url]
    });
  }
  return findings;
}
const IMPACT_RULES = {
  // ── CRITICAL ────────────────────────────────────────────────────────────────
  "local-no-phone-contact": {
    impactLevel: "CRITICAL",
    impactReason: "User intent is highest on contact pages — visitors are ready to call right now",
    estimatedBusinessEffect: "Direct lead loss: every contact-page visitor who can't find a number likely leaves for a competitor"
  },
  "conversion-no-form-contact-page": {
    impactLevel: "CRITICAL",
    impactReason: "Contact page exists but offers no way to submit an inquiry",
    estimatedBusinessEffect: "Direct lead loss: async conversion path is broken for visitors who prefer not to call"
  },
  "trust-no-https": {
    impactLevel: "CRITICAL",
    impactReason: 'Browser marks the site "Not Secure" before the page loads — trust is destroyed immediately',
    estimatedBusinessEffect: "Immediate trust destruction and Google ranking penalty; many users bounce without reading"
  },
  "technical-noindex-money-pages": {
    impactLevel: "CRITICAL",
    impactReason: "Revenue-generating pages are blocked from Google indexing",
    estimatedBusinessEffect: "Zero organic traffic to key pages; completely invisible to prospects searching for these services"
  },
  // ── HIGH ────────────────────────────────────────────────────────────────────
  "local-no-phone-homepage": {
    impactLevel: "HIGH",
    impactReason: "Homepage is the most-visited page; no phone number eliminates the easiest conversion action",
    estimatedBusinessEffect: "Significant missed calls from mobile visitors who expect one-tap dialing"
  },
  "conversion-no-cta-homepage": {
    impactLevel: "HIGH",
    impactReason: "Homepage is the primary conversion entry point — no CTA means visitors have no clear next step",
    estimatedBusinessEffect: "Elevated bounce rate; leads leave without engaging"
  },
  "conversion-no-phone-homepage": {
    impactLevel: "HIGH",
    impactReason: "Phone is the #1 contact method for local service businesses",
    estimatedBusinessEffect: "Missed calls from high-intent mobile visitors scanning the homepage"
  },
  "lh-performance-poor": {
    impactLevel: "HIGH",
    impactReason: "Google uses Core Web Vitals as a ranking signal; critically slow sites rank lower and lose mobile users",
    estimatedBusinessEffect: "Lost search visibility + higher bounce rate (53% of mobile users leave after 3s)"
  },
  "lh-lcp-slow": {
    impactLevel: "HIGH",
    impactReason: "LCP > 4s signals a poor user experience to Google and causes mobile abandonment",
    estimatedBusinessEffect: "Lower rankings + significant mobile visitor drop-off before the page is usable"
  },
  "technical-broken-pages": {
    impactLevel: "HIGH",
    impactReason: "Broken pages waste crawl budget, break internal link equity, and frustrate users",
    estimatedBusinessEffect: "Lost link equity to service pages + negative UX signals sent to Google"
  },
  "local-no-localbusiness-schema": {
    impactLevel: "HIGH",
    impactReason: "LocalBusiness schema is a key signal for Google Local Pack placement",
    estimatedBusinessEffect: "Reduced local pack visibility and fewer rich result features in Google Search"
  },
  "content-no-service-pages": {
    impactLevel: "HIGH",
    impactReason: "No dedicated service pages means no targeted landing pages for high-intent searches",
    estimatedBusinessEffect: 'Organic traffic from "service + location" queries goes entirely to competitors'
  },
  "local-no-location-pages": {
    impactLevel: "HIGH",
    impactReason: "Location-specific pages are critical for ranking in nearby cities and suburbs",
    estimatedBusinessEffect: "Zero geo-specific organic visibility outside the primary city"
  },
  "visual-no-above-fold-cta": {
    impactLevel: "HIGH",
    impactReason: "Visitors who don't see a CTA above the fold rarely scroll to find one",
    estimatedBusinessEffect: "Conversion rate drops significantly; leads disengage before taking action"
  },
  "visual-no-phone-above-fold": {
    impactLevel: "HIGH",
    impactReason: "Mobile users expect a tap-to-call number without scrolling",
    estimatedBusinessEffect: "Missed inbound calls from mobile visitors; friction increases drop-off"
  },
  "conversion-no-booking-cta": {
    impactLevel: "HIGH",
    impactReason: "For appointment-driven businesses, booking friction translates directly to lost reservations",
    estimatedBusinessEffect: "Prospective customers book with competitors who make it one click easier"
  },
  // ── MEDIUM ──────────────────────────────────────────────────────────────────
  "technical-missing-meta-desc": {
    impactLevel: "MEDIUM",
    impactReason: "Google may auto-generate poor descriptions, reducing SERP click-through rate",
    estimatedBusinessEffect: "Fewer clicks from search results despite good ranking position"
  },
  "technical-missing-title": {
    impactLevel: "MEDIUM",
    impactReason: "Missing title forces Google to generate its own, weakening SERP presence and keyword targeting",
    estimatedBusinessEffect: "Lower click-through rate and weaker keyword relevance in search results"
  },
  "technical-missing-h1": {
    impactLevel: "MEDIUM",
    impactReason: "H1 is a primary on-page signal for topic relevance",
    estimatedBusinessEffect: "Minor ranking signal loss; pages may underperform for target keywords"
  },
  "local-no-address-homepage": {
    impactLevel: "MEDIUM",
    impactReason: "NAP consistency across the web and homepage is a local ranking factor",
    estimatedBusinessEffect: "Weaker local pack signals; users can't confirm the business location"
  },
  "local-no-map": {
    impactLevel: "MEDIUM",
    impactReason: "Embedded maps reduce friction for customers who want to visit in person",
    estimatedBusinessEffect: "Increased drop-off from intent-to-visit users; lost foot traffic"
  },
  "local-no-hours": {
    impactLevel: "MEDIUM",
    impactReason: "Users can't determine if the business is open before calling or visiting",
    estimatedBusinessEffect: "Lost leads who move to a competitor that shows hours clearly"
  },
  "trust-no-testimonials": {
    impactLevel: "MEDIUM",
    impactReason: "Social proof is a primary conversion driver for local services",
    estimatedBusinessEffect: "Lower conversion rate from undecided visitors who need reassurance before contacting"
  },
  "trust-weak-trust-signals": {
    impactLevel: "MEDIUM",
    impactReason: "Site lacks visible trust indicators (certifications, awards, affiliations)",
    estimatedBusinessEffect: "Reduced conversion rate; prospects choose a competitor with more visible credibility"
  },
  "trust-homepage-no-trust-content": {
    impactLevel: "MEDIUM",
    impactReason: "Homepage is the first impression; missing trust content reduces immediate engagement",
    estimatedBusinessEffect: "Higher bounce rate from skeptical visitors who don't see proof of quality"
  },
  "conversion-no-form": {
    impactLevel: "MEDIUM",
    impactReason: "No site-wide forms means there is no async lead capture path",
    estimatedBusinessEffect: "All leads must call or email directly; visitors who prefer forms are lost"
  },
  "conversion-low-cta-coverage": {
    impactLevel: "MEDIUM",
    impactReason: "Visitors landing on inner pages have no clear action to take",
    estimatedBusinessEffect: "Missed conversion opportunities from service, about, and blog page visitors"
  },
  "lh-tbt-high": {
    impactLevel: "MEDIUM",
    impactReason: "High total blocking time degrades interactivity and frustrates mobile users",
    estimatedBusinessEffect: "Increased bounce rate; users leave before they can interact with the page"
  },
  "lh-cls-high": {
    impactLevel: "MEDIUM",
    impactReason: "Severe layout shifts cause accidental taps and a jarring experience",
    estimatedBusinessEffect: "Reduced engagement; users who tap wrong elements leave in frustration"
  },
  "lh-seo-low": {
    impactLevel: "MEDIUM",
    impactReason: "Lighthouse SEO score reflects multiple on-page SEO deficiencies",
    estimatedBusinessEffect: "Broad ranking signal loss across technical and on-page SEO factors"
  },
  "visual-no-hero-clarity": {
    impactLevel: "MEDIUM",
    impactReason: "An unclear hero message means visitors don't immediately know what the business offers",
    estimatedBusinessEffect: "Higher bounce rate from confused first-time visitors"
  },
  "visual-no-trust-signals-visible": {
    impactLevel: "MEDIUM",
    impactReason: "Trust signals hidden below the fold are rarely seen before users decide to leave",
    estimatedBusinessEffect: "Trust content is not doing its job; conversion rate is lower than it should be"
  },
  "content-thin-homepage": {
    impactLevel: "MEDIUM",
    impactReason: "Thin homepage content gives Google less topical authority to work with",
    estimatedBusinessEffect: "Weaker broad keyword rankings; homepage underperforms as an organic landing page"
  },
  "content-no-location-pages": {
    impactLevel: "MEDIUM",
    impactReason: "No location-specific content means no foothold in nearby city searches",
    estimatedBusinessEffect: 'Missed organic traffic from high-intent "near me" and suburb-specific queries'
  },
  // ── LOW ─────────────────────────────────────────────────────────────────────
  "technical-no-robots": {
    impactLevel: "LOW",
    impactReason: "Missing robots.txt means no crawl guidance; Googlebot defaults to crawling everything",
    estimatedBusinessEffect: "Minor crawl inefficiency; low direct ranking impact for most sites"
  },
  "technical-no-sitemap": {
    impactLevel: "LOW",
    impactReason: "Sitemap speeds up content discovery but is not required for indexing",
    estimatedBusinessEffect: "Slightly slower discovery of new or updated pages"
  },
  "technical-short-title": {
    impactLevel: "LOW",
    impactReason: "Short titles miss keyword opportunities but don't actively harm rankings",
    estimatedBusinessEffect: "Minor reduction in keyword coverage in search results"
  },
  "technical-long-title": {
    impactLevel: "LOW",
    impactReason: "Long titles get truncated in SERPs but the page still ranks",
    estimatedBusinessEffect: "Truncated SERP titles may marginally reduce click-through rate"
  },
  "technical-multiple-h1": {
    impactLevel: "LOW",
    impactReason: "Multiple H1s send mixed topical signals but rarely cause significant ranking drops",
    estimatedBusinessEffect: "Minor on-page optimization loss; easy to fix for small gains"
  },
  "technical-missing-canonical": {
    impactLevel: "LOW",
    impactReason: "Without canonical tags, duplicate content risk exists if URL variations are present",
    estimatedBusinessEffect: "Potential link equity dilution if the same content appears at multiple URLs"
  },
  "technical-poor-image-alt": {
    impactLevel: "LOW",
    impactReason: "Missing alt text limits image search visibility and accessibility",
    estimatedBusinessEffect: "Missed image search traffic; minor accessibility barrier"
  },
  "trust-no-about-page": {
    impactLevel: "LOW",
    impactReason: "About pages build credibility but are not critical to direct conversion",
    estimatedBusinessEffect: "Marginally lower trust for prospects who research the business before contacting"
  },
  "trust-no-gallery": {
    impactLevel: "LOW",
    impactReason: "Gallery pages help visual businesses but are not a universal conversion factor",
    estimatedBusinessEffect: "Missed opportunity to showcase work quality; affects visually-driven decisions"
  },
  "content-too-few-service-pages": {
    impactLevel: "LOW",
    impactReason: "Some service pages exist but don't cover all offered services",
    estimatedBusinessEffect: "Partial keyword coverage; some high-intent searches go unanswered"
  },
  "content-thin-service-pages": {
    impactLevel: "LOW",
    impactReason: "Service pages exist but lack depth to outperform competitors in rankings",
    estimatedBusinessEffect: "Weak keyword relevance on service pages; ranking potential is limited"
  },
  "content-widespread-thin-pages": {
    impactLevel: "LOW",
    impactReason: "Many pages with low word counts signal lower overall content quality to Google",
    estimatedBusinessEffect: "Possible crawl quality reduction; pages compete weakly for long-tail searches"
  },
  "lh-performance-needs-work": {
    impactLevel: "LOW",
    impactReason: "Performance is below ideal but not critically slow",
    estimatedBusinessEffect: "Some mobile user friction; borderline effect on rankings"
  },
  "lh-lcp-needs-work": {
    impactLevel: "LOW",
    impactReason: "LCP is slightly above target but not severely slow",
    estimatedBusinessEffect: "Minor mobile user experience degradation"
  },
  "lh-tbt-medium": {
    impactLevel: "LOW",
    impactReason: "Some blocking time that may cause minor input delay on slower devices",
    estimatedBusinessEffect: "Slight interactivity lag on lower-end mobile devices"
  },
  "lh-cls-medium": {
    impactLevel: "LOW",
    impactReason: "Moderate layout shift: annoying but not severe",
    estimatedBusinessEffect: "Minor user experience friction; occasional accidental taps"
  }
};
const FALLBACK = {
  conversion: {
    high: { impactLevel: "HIGH", impactReason: "Conversion issues directly prevent leads from contacting the business", estimatedBusinessEffect: "Direct reduction in lead generation rate" },
    medium: { impactLevel: "MEDIUM", impactReason: "Conversion friction reduces the rate at which visitors become leads", estimatedBusinessEffect: "Moderately lower lead conversion rate" },
    low: { impactLevel: "LOW", impactReason: "Minor conversion optimisation opportunity", estimatedBusinessEffect: "Small improvement possible with minimal effort" }
  },
  localSeo: {
    high: { impactLevel: "HIGH", impactReason: "Critical local SEO signals missing; affects local pack ranking", estimatedBusinessEffect: "Reduced local search visibility" },
    medium: { impactLevel: "MEDIUM", impactReason: "Local SEO signals incomplete; moderate ranking impact", estimatedBusinessEffect: "Weaker local pack presence" },
    low: { impactLevel: "LOW", impactReason: "Minor local SEO optimisation opportunity", estimatedBusinessEffect: "Small local ranking improvement possible" }
  },
  technical: {
    high: { impactLevel: "HIGH", impactReason: "Technical issues preventing proper crawling or indexing", estimatedBusinessEffect: "Reduced search visibility for affected pages" },
    medium: { impactLevel: "MEDIUM", impactReason: "Technical issues reducing search performance", estimatedBusinessEffect: "Moderate ranking signal loss" },
    low: { impactLevel: "LOW", impactReason: "Minor technical improvement opportunity", estimatedBusinessEffect: "Small ranking or crawl efficiency gain" }
  },
  content: {
    high: { impactLevel: "HIGH", impactReason: "Severe content gaps prevent ranking for key service queries", estimatedBusinessEffect: "Significant organic traffic loss" },
    medium: { impactLevel: "MEDIUM", impactReason: "Content quality or depth issues limit keyword targeting", estimatedBusinessEffect: "Moderate reduction in organic reach" },
    low: { impactLevel: "LOW", impactReason: "Content improvement opportunity for incremental gains", estimatedBusinessEffect: "Minor keyword coverage improvement" }
  },
  trust: {
    high: { impactLevel: "HIGH", impactReason: "Significant trust deficiency affecting visitor confidence", estimatedBusinessEffect: "Lower conversion rate from first-time visitors" },
    medium: { impactLevel: "MEDIUM", impactReason: "Moderate trust gap reducing conversion confidence", estimatedBusinessEffect: "Some visitors choose a competitor with more visible credibility" },
    low: { impactLevel: "LOW", impactReason: "Minor trust enhancement opportunity", estimatedBusinessEffect: "Marginal conversion rate improvement" }
  }
};
function analyzeIssueImpact(issue, _businessType) {
  return IMPACT_RULES[issue.id] ?? FALLBACK[issue.category]?.[issue.severity] ?? {
    impactLevel: "LOW",
    impactReason: "Minor improvement opportunity",
    estimatedBusinessEffect: "Small incremental gain"
  };
}
function enrichFindingsWithImpact(findings, businessType) {
  return findings.map((f) => ({ ...f, ...analyzeIssueImpact(f) }));
}
const CATEGORY_WEIGHT = {
  localSeo: 0.3,
  technical: 0.25,
  conversion: 0.25,
  content: 0.1,
  trust: 0.1
};
const SEVERITY_WEIGHT = {
  high: 20,
  medium: 10,
  low: 4
};
function impactScore(f) {
  return (CATEGORY_WEIGHT[f.category] ?? 0.1) * SEVERITY_WEIGHT[f.severity];
}
function prioritizeFindings(findings) {
  return [...findings].sort((a, b) => impactScore(b) - impactScore(a));
}
function buildQuickWins(findings) {
  return prioritizeFindings(findings).filter((f) => f.severity === "high" || f.severity === "medium").slice(0, 5).map((f) => f.recommendation);
}
function buildMoneyLeaks(findings) {
  return prioritizeFindings(findings).filter((f) => f.severity === "high").slice(0, 5).map((f) => f.summary);
}
const log$8 = scanRepository.createLogger("impactStage");
async function impactStage(ctx, emit) {
  emit("Running performance audit…", 90);
  if (ctx.chromiumPath) {
    try {
      const lhMetric = await runLighthouse(ctx.normalizedUrl, ctx.chromiumPath);
      if (lhMetric) {
        ctx.lighthouseMetrics = [lhMetric];
        const lhFindings = analyzeLighthouse(lhMetric);
        ctx.allFindings = [...ctx.allFindings, ...lhFindings];
        log$8.info(
          `Lighthouse: perf=${lhMetric.performanceScore} seo=${lhMetric.seoScore} findings=${lhFindings.length}`
        );
      }
    } catch (lhErr) {
      log$8.warn(`Lighthouse skipped: ${lhErr.message}`);
    }
  }
  ctx.allFindings = prioritizeFindings(
    enrichFindingsWithImpact(ctx.allFindings, ctx.detectedBusinessType)
  );
  log$8.info(`Impact enrichment complete: ${ctx.allFindings.length} findings`);
}
const PENALTY = {
  high: 20,
  medium: 10,
  low: 4
};
function computeScore(findings) {
  const total = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
  return Math.max(0, 100 - total);
}
function scoreBand(value) {
  if (value >= 85) return "Strong";
  if (value >= 70) return "Solid";
  if (value >= 55) return "Needs Work";
  return "Leaking Opportunity";
}
function buildNegativeRationale(findings) {
  return findings.map((f) => {
    const tag = f.severity === "high" ? "[High]" : f.severity === "medium" ? "[Medium]" : "[Low]";
    return `${tag} ${f.title}`;
  });
}
function makeScore(findings, positives = []) {
  const value = computeScore(findings);
  const negatives = buildNegativeRationale(findings);
  const rationale = negatives.length === 0 && positives.length === 0 ? ["No issues detected in this category."] : [...negatives, ...positives];
  return { value, label: scoreBand(value), rationale };
}
function scoreTechnical(input) {
  const { findings, pages, robotsFound, sitemapFound } = input;
  const positives = [];
  if (robotsFound) {
    positives.push("[+] robots.txt is present");
  }
  if (sitemapFound) {
    positives.push("[+] XML sitemap found");
  }
  const keyPages = pages.filter(
    (p) => ["home", "contact", "service", "location"].includes(p.pageType)
  );
  const allHaveTitles = keyPages.every((p) => p.title && p.title.trim().length > 0);
  if (allHaveTitles && keyPages.length > 0) {
    positives.push("[+] All key pages have title tags");
  }
  const allHaveDesc = keyPages.every(
    (p) => p.metaDescription && p.metaDescription.trim().length > 0
  );
  if (allHaveDesc && keyPages.length > 0) {
    positives.push("[+] All key pages have meta descriptions");
  }
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0);
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0);
  if (totalImages > 0 && missingAlt / totalImages <= 0.1) {
    positives.push("[+] Strong image alt text coverage (>90%)");
  }
  const nobroken = pages.every((p) => p.statusCode < 400 || p.statusCode === 0);
  if (nobroken && pages.length > 0) {
    positives.push("[+] No broken pages found");
  }
  return makeScore(findings, positives);
}
function scoreLocalSeo(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  if (home?.phones && home.phones.length > 0) {
    positives.push("[+] Phone number present on homepage");
  }
  if (home?.hasAddress) {
    positives.push("[+] Business address found on homepage");
  }
  const hasLocalSchema = pages.some(
    (p) => p.schemaTypes.some(
      (t) => [
        "LocalBusiness",
        "ProfessionalService",
        "HomeAndConstructionBusiness",
        "FoodEstablishment",
        "HealthAndBeautyBusiness",
        "MedicalOrganization",
        "AutoRepair",
        "Restaurant"
      ].includes(t)
    )
  );
  if (hasLocalSchema) {
    positives.push("[+] LocalBusiness structured data is present");
  }
  if (pages.some((p) => p.hasMap)) {
    positives.push("[+] Map or directions embed found");
  }
  if (pages.some((p) => p.hasHours)) {
    positives.push("[+] Business hours found on site");
  }
  const locationPages = pages.filter((p) => p.pageType === "location");
  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`);
  }
  return makeScore(findings, positives);
}
const BOOKING_PATTERNS = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i
];
function scoreConversion(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  if (home?.ctaTexts && home.ctaTexts.length > 0) {
    positives.push(`[+] Homepage has ${home.ctaTexts.length} call-to-action(s)`);
  }
  if (home?.phones && home.phones.length > 0) {
    positives.push("[+] Phone number present on homepage");
  }
  const pagesWithForm = pages.filter((p) => p.hasForm);
  if (pagesWithForm.length > 0) {
    positives.push(`[+] Contact/lead form found on ${pagesWithForm.length} page(s)`);
  }
  const hasBookingCTA = pages.some(
    (p) => p.ctaTexts.some((cta) => BOOKING_PATTERNS.some((pat) => pat.test(cta)))
  );
  if (hasBookingCTA) {
    positives.push("[+] Booking or quote CTA detected");
  }
  const keyPages = pages.filter(
    (p) => ["home", "service", "location", "contact"].includes(p.pageType)
  );
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0);
    const coverage = Math.round(pagesWithCTA.length / keyPages.length * 100);
    if (coverage >= 75) {
      positives.push(`[+] ${coverage}% of key pages have CTAs`);
    }
  }
  return makeScore(findings, positives);
}
const HOME_WORD_STRONG = 500;
const AVG_WORD_GOOD = 300;
function scoreContent(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const servicePages = pages.filter((p) => p.pageType === "service");
  const locationPages = pages.filter((p) => p.pageType === "location");
  const blogPages = pages.filter((p) => p.pageType === "blog");
  if (home && (home.wordCount ?? 0) >= HOME_WORD_STRONG) {
    positives.push(`[+] Homepage has strong content depth (${home.wordCount} words)`);
  }
  if (servicePages.length >= 3) {
    positives.push(`[+] ${servicePages.length} dedicated service pages found`);
  } else if (servicePages.length >= 1) {
    positives.push(`[+] ${servicePages.length} service page(s) found`);
  }
  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`);
  }
  if (blogPages.length > 0) {
    positives.push(`[+] Blog or resource content found (${blogPages.length} page(s))`);
  }
  const totalWords = pages.reduce((n, p) => n + (p.wordCount ?? 0), 0);
  const avgWords = pages.length > 0 ? Math.round(totalWords / pages.length) : 0;
  if (avgWords >= AVG_WORD_GOOD) {
    positives.push(`[+] Average page content is solid (${avgWords} words/page)`);
  }
  return makeScore(findings, positives);
}
function scoreTrust(input) {
  const { findings, pages, domain } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`;
  if (isHttps(homeUrl)) {
    positives.push("[+] Site is served over HTTPS");
  }
  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0);
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals);
  if (totalTestimonials >= 3) {
    positives.push(`[+] ${totalTestimonials} testimonials or reviews found`);
  } else if (totalTestimonials > 0) {
    positives.push(`[+] ${totalTestimonials} testimonial(s) found`);
  } else if (hasTrustOnAnyPage) {
    positives.push("[+] Trust signals found (licensing, guarantees, or certifications)");
  }
  const aboutPages = pages.filter((p) => p.pageType === "about");
  if (aboutPages.length > 0) {
    positives.push("[+] About or team page present");
  }
  const galleryPages = pages.filter((p) => p.pageType === "gallery");
  if (galleryPages.length > 0) {
    positives.push("[+] Gallery or portfolio page present");
  }
  if (home?.hasTrustSignals) {
    positives.push("[+] Homepage displays trust signals");
  }
  return makeScore(findings, positives);
}
const WEIGHTS = {
  technical: 0.25,
  localSeo: 0.3,
  conversion: 0.25,
  content: 0.1,
  trust: 0.1
};
function computeWeightedScore(scores) {
  const weighted = scores.technical.value * WEIGHTS.technical + scores.localSeo.value * WEIGHTS.localSeo + scores.conversion.value * WEIGHTS.conversion + scores.content.value * WEIGHTS.content + scores.trust.value * WEIGHTS.trust;
  const value = Math.round(weighted);
  const rationale = [
    `Technical (25%): ${scores.technical.value} → ${scores.technical.label}`,
    `Local SEO (30%): ${scores.localSeo.value} → ${scores.localSeo.label}`,
    `Conversion (25%): ${scores.conversion.value} → ${scores.conversion.label}`,
    `Content (10%): ${scores.content.value} → ${scores.content.label}`,
    `Trust (10%): ${scores.trust.value} → ${scores.trust.label}`
  ];
  return { value, label: scoreBand(value), rationale };
}
const log$7 = scanRepository.createLogger("scoreStage");
async function scoreStage(ctx, emit) {
  emit("Scoring results…", 92);
  const techScore = scoreTechnical({
    findings: ctx.categoryFindings.technical,
    pages: ctx.pages,
    robotsFound: ctx.robotsFound,
    sitemapFound: ctx.sitemapFound
  });
  const localScore = scoreLocalSeo({
    findings: ctx.categoryFindings.localSeo,
    pages: ctx.pages
  });
  const convScore = scoreConversion({
    findings: ctx.categoryFindings.conversion,
    pages: ctx.pages
  });
  const contentScore = scoreContent({
    findings: ctx.categoryFindings.content,
    pages: ctx.pages
  });
  const trustScore = scoreTrust({
    findings: ctx.categoryFindings.trust,
    pages: ctx.pages,
    domain: ctx.domain
  });
  const categoryScores = {
    technical: techScore,
    localSeo: localScore,
    conversion: convScore,
    content: contentScore,
    trust: trustScore
  };
  ctx.scores = { ...categoryScores, overall: computeWeightedScore(categoryScores) };
  ctx.quickWins = buildQuickWins(ctx.allFindings);
  ctx.moneyLeaks = buildMoneyLeaks(ctx.allFindings);
  log$7.info(
    `Scoring complete: tech=${techScore.value} local=${localScore.value} conv=${convScore.value} content=${contentScore.value} trust=${trustScore.value} overall=${ctx.scores.overall.value}`
  );
}
const log$6 = scanRepository.createLogger("competitorCrawler");
const MAX_COMPETITOR_PAGES = 5;
async function crawlCompetitor(url, browser) {
  let normalizedUrl;
  try {
    normalizedUrl = normalizeInputUrl(url);
  } catch {
    return { pages: [], crawlError: `Invalid URL: ${url}` };
  }
  const domain = getDomain(normalizedUrl);
  try {
    const { fetchedPages } = await discoverUrls(
      normalizedUrl,
      browser,
      MAX_COMPETITOR_PAGES,
      domain
    );
    if (fetchedPages.length === 0) {
      return { pages: [], crawlError: `No pages fetched from ${domain}` };
    }
    const pages = fetchedPages.filter((r) => r.html && r.html.trim().length > 0).map((raw) => {
      const signals = extractAllSignals(raw.html, raw.finalUrl);
      const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s);
      return {
        url: raw.requestedUrl,
        finalUrl: raw.finalUrl,
        statusCode: raw.statusCode,
        pageType,
        title: signals.title,
        metaDescription: signals.metaDescription,
        h1s: signals.h1s,
        h2s: signals.h2s,
        canonical: signals.canonical,
        noindex: signals.noindex,
        phones: signals.phones,
        emails: signals.emails,
        hasAddress: signals.hasAddress,
        hasMap: signals.hasMap,
        hasHours: signals.hasHours,
        hasForm: signals.hasForm,
        ctaTexts: signals.ctaTexts,
        schemaTypes: signals.schemaTypes,
        hasTrustSignals: signals.hasTrustSignals,
        testimonialCount: signals.testimonialCount,
        wordCount: signals.wordCount,
        imageCount: signals.imageCount,
        missingAltCount: signals.missingAltCount
      };
    });
    log$6.info(`Competitor ${domain}: crawled ${pages.length} page(s)`);
    return { pages };
  } catch (err) {
    log$6.warn(`Competitor crawl failed for ${domain}: ${err.message}`);
    return { pages: [], crawlError: err.message };
  }
}
const LOCAL_BUSINESS_SCHEMA_TYPES = /* @__PURE__ */ new Set([
  "LocalBusiness",
  "ProfessionalService",
  "HomeAndConstructionBusiness",
  "FoodEstablishment",
  "HealthAndBeautyBusiness",
  "MedicalOrganization",
  "AutoRepair",
  "Restaurant"
]);
const EMPTY_SITE = (url, crawlError) => ({
  url,
  domain: getDomain(url),
  crawlError,
  pageCount: 0,
  hasLocalBusinessSchema: false,
  schemaTypes: [],
  servicePageCount: 0,
  locationPageCount: 0,
  hasGalleryPage: false,
  hasAboutPage: false,
  hasContactPage: false,
  hasPhone: false,
  hasAddress: false,
  hasMap: false,
  hasHours: false,
  hasTrustSignals: false,
  avgWordCount: 0,
  ctaCoverage: 0,
  hasForm: false
});
function analyzeCompetitor(url, pages, crawlError) {
  if (pages.length === 0) return EMPTY_SITE(url, crawlError);
  const allSchemaTypes = [...new Set(pages.flatMap((p) => p.schemaTypes))];
  const hasLocalBusinessSchema = allSchemaTypes.some((t) => LOCAL_BUSINESS_SCHEMA_TYPES.has(t));
  const pagesWithCta = pages.filter((p) => p.ctaTexts.length > 0).length;
  const totalWordCount = pages.reduce((sum, p) => sum + (p.wordCount ?? 0), 0);
  return {
    url,
    domain: getDomain(url),
    crawlError,
    pageCount: pages.length,
    hasLocalBusinessSchema,
    schemaTypes: allSchemaTypes,
    servicePageCount: pages.filter((p) => p.pageType === "service").length,
    locationPageCount: pages.filter((p) => p.pageType === "location").length,
    hasGalleryPage: pages.some((p) => p.pageType === "gallery"),
    hasAboutPage: pages.some((p) => p.pageType === "about"),
    hasContactPage: pages.some((p) => p.pageType === "contact"),
    hasPhone: pages.some((p) => p.phones.length > 0),
    hasAddress: pages.some((p) => p.hasAddress),
    hasMap: pages.some((p) => p.hasMap),
    hasHours: pages.some((p) => p.hasHours),
    hasTrustSignals: pages.some((p) => p.hasTrustSignals),
    avgWordCount: Math.round(totalWordCount / pages.length),
    ctaCoverage: pagesWithCta / pages.length,
    hasForm: pages.some((p) => p.hasForm)
  };
}
const LOCAL_BUSINESS_SCHEMA = /* @__PURE__ */ new Set([
  "LocalBusiness",
  "ProfessionalService",
  "HomeAndConstructionBusiness",
  "FoodEstablishment",
  "HealthAndBeautyBusiness",
  "MedicalOrganization",
  "AutoRepair",
  "Restaurant"
]);
const GAP_THRESHOLD_FRACTION = 0.6;
function threshold(successfulCount) {
  return Math.max(1, Math.ceil(successfulCount * GAP_THRESHOLD_FRACTION));
}
function deriveClientSignals(clientUrl, clientPages) {
  if (clientPages.length === 0) {
    return {
      domain: getDomain(clientUrl),
      servicePageCount: 0,
      locationPageCount: 0,
      hasLocalBusinessSchema: false,
      hasTrustSignals: false,
      hasGalleryPage: false,
      hasMap: false,
      hasHours: false,
      hasForm: false,
      avgWordCount: 0,
      ctaCoverage: 0
    };
  }
  const totalWords = clientPages.reduce((s, p) => s + (p.wordCount ?? 0), 0);
  const pagesWithCta = clientPages.filter((p) => p.ctaTexts.length > 0).length;
  return {
    domain: getDomain(clientUrl),
    servicePageCount: clientPages.filter((p) => p.pageType === "service").length,
    locationPageCount: clientPages.filter((p) => p.pageType === "location").length,
    hasLocalBusinessSchema: clientPages.some(
      (p) => p.schemaTypes.some((t) => LOCAL_BUSINESS_SCHEMA.has(t))
    ),
    hasTrustSignals: clientPages.some((p) => p.hasTrustSignals),
    hasGalleryPage: clientPages.some((p) => p.pageType === "gallery"),
    hasMap: clientPages.some((p) => p.hasMap),
    hasHours: clientPages.some((p) => p.hasHours),
    hasForm: clientPages.some((p) => p.hasForm),
    avgWordCount: Math.round(totalWords / clientPages.length),
    ctaCoverage: pagesWithCta / clientPages.length
  };
}
function analyzeGaps(clientUrl, clientPages, competitors) {
  const successful = competitors.filter((c) => c.pageCount > 0);
  if (successful.length === 0) return [];
  const t = threshold(successful.length);
  const client = deriveClientSignals(clientUrl, clientPages);
  const gaps = [];
  if (client.servicePageCount === 0) {
    const with_ = successful.filter((c) => c.servicePageCount >= 1);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-service-pages",
        title: "Competitors have dedicated service pages — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) have dedicated service pages that help rank for "[service] in [city]" searches.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: "Create individual pages for each service you offer. Each page should target a specific service keyword and mention your city/service area."
      });
    }
  }
  if (client.locationPageCount === 0) {
    const with_ = successful.filter((c) => c.locationPageCount >= 1);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-location-pages",
        title: "Competitors target specific locations — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) have location or service-area pages that capture geo-targeted search traffic.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: 'Create a page for each city or area you cover (e.g., "/roofing-dallas-tx/") targeting "[service] [city]" searches.'
      });
    }
  }
  if (!client.hasLocalBusinessSchema) {
    const with_ = successful.filter((c) => c.hasLocalBusinessSchema);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-local-schema",
        title: "Competitors implement LocalBusiness schema — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) use LocalBusiness JSON-LD structured data, which helps Google surface their business in local results.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: "Add a LocalBusiness JSON-LD block to your homepage with your name, address, phone, hours, and business type."
      });
    }
  }
  if (!client.hasTrustSignals) {
    const with_ = successful.filter((c) => c.hasTrustSignals);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-trust-signals",
        title: "Competitors display trust signals — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) show reviews, ratings, or credibility indicators that build visitor confidence.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: "Add a reviews section, star ratings, or trust badges (licensed, insured, years in business) to your homepage."
      });
    }
  }
  if (!client.hasMap) {
    const with_ = successful.filter((c) => c.hasMap);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-map",
        title: "Competitors provide maps or directions — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) include map embeds or directions links that reinforce local relevance and help mobile visitors.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: 'Embed a Google Maps iframe on your contact page and add a "Get Directions" link.'
      });
    }
  }
  if (!client.hasHours) {
    const with_ = successful.filter((c) => c.hasHours);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-hours",
        title: "Competitors display business hours — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) prominently display their hours, which is a conversion factor for visitors deciding when to call.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: "Display your business hours on the homepage, contact page, and in the footer."
      });
    }
  }
  if (!client.hasForm) {
    const with_ = successful.filter((c) => c.hasForm);
    if (with_.length >= t) {
      gaps.push({
        id: "comp-no-contact-form",
        title: "Competitors offer online contact forms — this site does not",
        description: `${with_.length} of ${successful.length} competitor(s) have contact or quote request forms, providing a low-friction conversion path for visitors who prefer not to call.`,
        competitorDomains: with_.map((c) => c.domain),
        recommendation: 'Add a simple "Request a Quote" or contact form to capture leads who prefer to inquire online.'
      });
    }
  }
  const compsWithDeepContent = successful.filter(
    (c) => c.avgWordCount > Math.max(client.avgWordCount * 1.5, 300)
  );
  if (compsWithDeepContent.length >= t && client.avgWordCount < 300) {
    const competitorAvg = Math.round(
      compsWithDeepContent.reduce((s, c) => s + c.avgWordCount, 0) / compsWithDeepContent.length
    );
    gaps.push({
      id: "comp-thin-content",
      title: "Competitor pages contain significantly more content",
      description: `${compsWithDeepContent.length} of ${successful.length} competitor(s) average ${competitorAvg} words per page vs ${client.avgWordCount} on this site. Thinner pages are harder to rank for competitive keywords.`,
      competitorDomains: compsWithDeepContent.map((c) => c.domain),
      recommendation: "Expand your page content with detailed service descriptions, FAQs, and location information. Aim for 300–600 words per key page."
    });
  }
  return gaps;
}
const log$5 = scanRepository.createLogger("competitorAnalysis");
const MAX_COMPETITORS = 3;
async function runCompetitorAnalysis(browser, clientUrl, clientPages, competitorUrls) {
  const urls = [...new Set(competitorUrls)].slice(0, MAX_COMPETITORS);
  log$5.info(`Starting competitor analysis: ${urls.length} competitor(s)`);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const { pages, crawlError } = await crawlCompetitor(url, browser);
      let normalizedUrl = url;
      try {
        normalizedUrl = normalizeInputUrl(url);
      } catch {
      }
      return analyzeCompetitor(normalizedUrl, pages, crawlError);
    })
  );
  const competitors = results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    log$5.warn(`Competitor ${urls[i]} failed: ${reason}`);
    return analyzeCompetitor(urls[i], [], reason);
  });
  const gaps = analyzeGaps(clientUrl, clientPages, competitors);
  log$5.info(
    `Competitor analysis complete: ${competitors.length} site(s) analyzed, ${competitors.filter((c) => c.pageCount > 0).length} successful, ${gaps.length} gap(s) found`
  );
  return {
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
    competitors,
    gaps
  };
}
const log$4 = scanRepository.createLogger("competitorStage");
async function competitorStage(ctx, emit) {
  if (!ctx.request.competitorUrls || ctx.request.competitorUrls.length === 0) {
    log$4.info("Competitor stage skipped — no competitor URLs provided");
    return;
  }
  if (!ctx.browser) {
    log$4.warn("Competitor stage skipped — browser not available");
    return;
  }
  emit("Analyzing competitors…", 94);
  ctx.competitorResult = await runCompetitorAnalysis(
    ctx.browser,
    ctx.normalizedUrl,
    ctx.pages,
    ctx.request.competitorUrls.slice(0, 3)
  );
  log$4.info(
    `Competitor analysis: ${ctx.competitorResult.competitors.length} sites, ${ctx.competitorResult.gaps.length} gaps`
  );
}
function computeScoreConfidence(input) {
  const { pages, lighthouse, visual, competitor } = input;
  let score = 0;
  const positives = [];
  const negatives = [];
  const pageCount = pages.length;
  if (pageCount >= 8) {
    score += 2;
    positives.push(`${pageCount} pages crawled`);
  } else if (pageCount >= 4) {
    score += 1;
    positives.push(`${pageCount} pages crawled`);
  } else {
    negatives.push(`only ${pageCount} page${pageCount !== 1 ? "s" : ""} crawled`);
  }
  const homepageFound = pages.some((p) => p.pageType === "home");
  if (homepageFound) {
    score += 1;
    positives.push("homepage found");
  } else {
    negatives.push("homepage not detected");
  }
  const importantTypes = ["contact", "service", "location", "about"];
  const foundTypes = importantTypes.filter((t) => pages.some((p) => p.pageType === t));
  if (foundTypes.length >= 2) {
    score += 2;
    positives.push(`key pages found (${foundTypes.join(", ")})`);
  } else if (foundTypes.length === 1) {
    score += 1;
    positives.push(`${foundTypes[0]} page found`);
    const missingType = importantTypes.find((t) => !foundTypes.includes(t)) ?? "supporting page";
    negatives.push(`no ${missingType} page detected`);
  } else {
    negatives.push("no contact, service, or location pages detected");
  }
  const lighthouseDone = (lighthouse ?? []).length > 0;
  if (lighthouseDone) {
    score += 1;
    positives.push("Lighthouse completed");
  } else {
    negatives.push("Lighthouse data missing");
  }
  const errorPageCount = pages.filter((p) => p.statusCode >= 400).length;
  if (errorPageCount === 0) {
    score += 1;
  } else if (errorPageCount / Math.max(pageCount, 1) > 0.3) {
    negatives.push(`${errorPageCount} pages returned errors`);
  }
  if (visual && visual.pagesAnalyzed.length > 0) {
    score += 1;
    positives.push("visual analysis completed");
  }
  if (competitor && competitor.competitors.length > 0) {
    score += 1;
    positives.push("competitor analysis completed");
  }
  let level;
  if (score >= 6) {
    level = "High";
  } else if (score >= 3) {
    level = "Medium";
  } else {
    level = "Low";
  }
  const reason = buildReason(level, positives, negatives);
  return { level, reason };
}
function buildReason(level, positives, negatives) {
  if (positives.length === 0 && negatives.length === 0) {
    return "Scan data was limited.";
  }
  const posPart = joinList$1(positives);
  const negPart = joinList$1(negatives);
  if (level === "High") {
    return cap(posPart) + ".";
  }
  if (level === "Medium") {
    if (posPart && negPart) {
      return `${cap(posPart)}, but ${negPart}.`;
    }
    return posPart ? `${cap(posPart)}.` : `${cap(negPart)}.`;
  }
  if (negPart && posPart) {
    return `${cap(negPart)}; ${posPart}.`;
  }
  return negPart ? `${cap(negPart)}.` : `Scan coverage was very limited.`;
}
function joinList$1(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const log$3 = scanRepository.createLogger("confidenceStage");
async function confidenceStage(ctx, emit) {
  emit("Computing score confidence…", 95);
  ctx.scoreConfidence = computeScoreConfidence({
    pages: ctx.pages,
    lighthouse: ctx.lighthouseMetrics.length > 0 ? ctx.lighthouseMetrics : void 0,
    visual: ctx.visualResult,
    competitor: ctx.competitorResult
  });
  log$3.info(`Score confidence: ${ctx.scoreConfidence.level} — ${ctx.scoreConfidence.reason}`);
}
const CLUSTERS = [
  // ── Crawlability / Indexing ────────────────────────────────────────────────
  {
    clusterKey: "crawlability",
    ids: ["technical-noindex-money-pages", "technical-broken-pages"],
    title: "Fix pages that are hidden from or blocked by Google",
    whyItMatters: "Some of your important pages are either broken or telling Google to ignore them. That means potential customers searching for your services may never find those pages, and any money spent on SEO for those pages is wasted.",
    plainEnglishFix: 'Restore any broken pages (or redirect them to working ones). Remove the "do not index" setting from service, contact, and location pages so they can appear in Google search results.',
    effort: "Medium",
    category: "technical"
  },
  // ── Page speed ────────────────────────────────────────────────────────────
  {
    clusterKey: "page-speed",
    ids: [
      "lh-performance-poor",
      "lh-performance-needs-work",
      "lh-lcp-slow",
      "lh-lcp-needs-work",
      "lh-tbt-high",
      "lh-tbt-medium",
      "lh-cls-high",
      "lh-cls-medium"
    ],
    title: "Speed up your website so visitors don't leave before it loads",
    whyItMatters: "A slow website frustrates visitors and hurts your Google ranking. Most people will leave a page if it takes more than 3 seconds to load, meaning you are losing leads before they even see your services.",
    plainEnglishFix: "Work with your web developer or hosting provider to compress images, reduce unnecessary scripts, and enable caching. If you use WordPress or a similar platform, a performance plugin can often fix this quickly.",
    effort: "High",
    category: "technical"
  },
  // ── Phone / contact visibility ─────────────────────────────────────────────
  {
    clusterKey: "phone-visibility",
    ids: [
      "local-no-phone-homepage",
      "local-no-phone-contact",
      "conversion-no-phone-homepage",
      "visual-no-phone-above-fold"
    ],
    title: "Make your phone number visible and easy to tap on every key page",
    whyItMatters: "People searching for local businesses often want to call immediately. If your phone number is missing or hard to find, those visitors will call a competitor instead. This is one of the most direct causes of lost leads.",
    plainEnglishFix: "Add your phone number in large, clickable text at the top of your homepage, contact page, and every service page. On mobile, it should be a tap-to-call link so visitors can reach you instantly.",
    effort: "Low",
    category: "conversion"
  },
  // ── CTA coverage ──────────────────────────────────────────────────────────
  {
    clusterKey: "cta-coverage",
    ids: [
      "conversion-no-cta-homepage",
      "conversion-low-cta-coverage",
      "conversion-no-booking-cta",
      "visual-no-above-fold-cta"
    ],
    title: 'Add clear "contact us" or "get a quote" buttons to your key pages',
    whyItMatters: "Visitors who are ready to hire someone need a clear next step. Without a prominent button or link telling them what to do, many will leave without contacting you — even if they liked what they saw.",
    plainEnglishFix: 'Add a visible button (such as "Call Now", "Get a Free Quote", or "Book an Appointment") near the top of your homepage and on every service page. The button should be a strong color that stands out from the rest of the page.',
    effort: "Medium",
    category: "conversion"
  },
  // ── Contact form ───────────────────────────────────────────────────────────
  {
    clusterKey: "contact-form",
    ids: ["conversion-no-form", "conversion-no-form-contact-page"],
    title: "Add a contact form so people can reach you any time of day",
    whyItMatters: "Not everyone wants to call — many visitors prefer to send a message, especially outside business hours. Without a contact form you are missing enquiries from people who would have hired you.",
    plainEnglishFix: "Add a simple contact form to your contact page and ideally your homepage too. Ask only for the essentials: name, phone or email, and a brief message. Make sure form submissions arrive in an inbox you check regularly.",
    effort: "Medium",
    category: "conversion"
  },
  // ── LocalBusiness schema ───────────────────────────────────────────────────
  {
    clusterKey: "local-schema",
    ids: ["local-no-localbusiness-schema"],
    title: "Tell Google exactly what kind of business you are and where you operate",
    whyItMatters: "Google uses structured data to display your business name, address, phone number, and hours directly in search results. Without it, you are less likely to appear in local map results and Google may mis-categorize your business.",
    plainEnglishFix: 'Add "LocalBusiness" structured data to your homepage. This is a small piece of code (or a plugin setting in WordPress) that gives Google your business name, type, address, phone, and opening hours in a format it can reliably read.',
    effort: "Medium",
    category: "localSeo"
  },
  // ── Local signals: map, hours, address ────────────────────────────────────
  {
    clusterKey: "local-signals",
    ids: ["local-no-map", "local-no-hours", "local-no-address-homepage", "local-no-location-pages"],
    title: "Add your address, hours, and a map to make your location easy to find",
    whyItMatters: "Local customers need to know where you are, when you are open, and how to get there. If this information is missing or buried, visitors will go to a competitor whose website answers these questions immediately.",
    plainEnglishFix: "Add your full address and business hours to your homepage and contact page. Embed a Google Map so visitors can get directions with one click. If you serve multiple areas, create a dedicated page for each location.",
    effort: "Low",
    category: "localSeo"
  },
  // ── Meta content ──────────────────────────────────────────────────────────
  {
    clusterKey: "meta-content",
    ids: [
      "technical-missing-title",
      "technical-short-title",
      "technical-long-title",
      "technical-missing-meta-desc",
      "technical-missing-h1",
      "technical-multiple-h1",
      "technical-missing-canonical"
    ],
    title: "Fix missing or poorly written page titles and descriptions",
    whyItMatters: "Page titles and descriptions are what Google shows in search results. If they are missing, duplicated, or too short, your pages look generic and get passed over for competitors who have written compelling, keyword-rich summaries.",
    plainEnglishFix: "Give every page a unique title (50–60 characters) that describes exactly what the page is about, including your service and city. Write a short description (150–160 characters) for each page that encourages someone to click. Make sure every page has exactly one clear main heading.",
    effort: "Low",
    category: "technical"
  },
  // ── Content depth ─────────────────────────────────────────────────────────
  {
    clusterKey: "content-depth",
    ids: [
      "content-thin-homepage",
      "content-no-service-pages",
      "content-too-few-service-pages",
      "content-thin-service-pages",
      "content-no-location-pages",
      "content-widespread-thin-pages"
    ],
    title: "Write more detailed pages that explain your services and service area",
    whyItMatters: "Thin pages with little content rarely rank well because Google struggles to understand what you offer and for whom. Competitors with detailed service pages consistently outrank sites with sparse content.",
    plainEnglishFix: "Create or expand your service pages to clearly describe each service, who it is for, and why customers should choose you. Add a dedicated page for each major service and each city or town you serve. Aim for at least 300–500 words per page.",
    effort: "High",
    category: "content"
  },
  // ── Trust & credibility ────────────────────────────────────────────────────
  {
    clusterKey: "trust-credibility",
    ids: [
      "trust-no-https",
      "trust-no-testimonials",
      "trust-weak-trust-signals",
      "trust-homepage-no-trust-content",
      "trust-no-about-page",
      "trust-no-gallery"
    ],
    title: "Build visible credibility so visitors trust you before they call",
    whyItMatters: "Visitors decide within seconds whether a business looks trustworthy. Without reviews, credentials, photos, or an About page, many people will leave rather than risk contacting an unknown company.",
    plainEnglishFix: "Add real customer reviews or testimonials to your homepage. Create an About page that introduces your team and story. Add photos of your work, vehicle, or premises. If your site is not yet on HTTPS (the padlock), ask your hosting provider to enable SSL — it is usually free.",
    effort: "Medium",
    category: "trust"
  },
  // ── Visual / above-fold presence ──────────────────────────────────────────
  {
    clusterKey: "above-fold",
    ids: ["visual-no-hero-clarity", "visual-no-trust-signals-visible"],
    title: "Make it immediately clear who you are and why visitors should stay",
    whyItMatters: "The first thing a visitor sees on your homepage determines whether they stay or leave. If there is no clear headline, photo, or trust signal above the fold (before scrolling), many visitors will bounce without ever learning about your services.",
    plainEnglishFix: "Update your homepage hero section to include: a clear headline stating what you do and where, a short sub-heading with your key selling point, a visible phone number or CTA button, and a recognizable photo (your team, your work, or your location).",
    effort: "Medium",
    category: "conversion"
  },
  // ── Robots / Sitemap ──────────────────────────────────────────────────────
  {
    clusterKey: "crawl-config",
    ids: ["technical-no-robots", "technical-no-sitemap"],
    title: "Set up the basic files Google needs to crawl your site properly",
    whyItMatters: "A robots.txt file and a sitemap tell Google which pages exist and how to crawl your site. Without them, Google may miss pages entirely or crawl your site less often.",
    plainEnglishFix: "Ask your developer or use your CMS's SEO plugin (e.g., Yoast) to generate a sitemap.xml and a robots.txt file, then submit the sitemap to Google Search Console.",
    effort: "Low",
    category: "technical"
  },
  // ── Image accessibility ───────────────────────────────────────────────────
  {
    clusterKey: "image-alt",
    ids: ["technical-poor-image-alt"],
    title: "Add descriptions to your images so Google and screen readers can understand them",
    whyItMatters: "Images without alt text are invisible to Google — and to visitors using screen readers. Properly described images add keyword relevance and improve accessibility.",
    plainEnglishFix: 'For each image on your site, add a short description (alt text) explaining what the image shows. For example: "Roofing crew replacing shingles on a home in Dallas." Your CMS likely has an alt text field when you upload or edit images.',
    effort: "Low",
    category: "technical"
  },
  // ── Lighthouse SEO score ──────────────────────────────────────────────────
  {
    clusterKey: "lh-seo",
    ids: ["lh-seo-low"],
    title: "Fix the technical SEO issues flagged by Google's own audit tool",
    whyItMatters: "Google's Lighthouse tool scored your SEO below the recommended threshold, meaning there are measurable technical issues that directly reduce your search visibility.",
    plainEnglishFix: "Run Google Search Console on your site and review the Core Web Vitals and Coverage reports. Address each flagged issue — these are items Google itself is telling you to fix.",
    effort: "Medium",
    category: "technical"
  }
];
const ID_TO_CLUSTER = /* @__PURE__ */ new Map();
for (const cluster of CLUSTERS) {
  for (const id of cluster.ids) {
    ID_TO_CLUSTER.set(id, cluster.clusterKey);
  }
}
const IMPACT_SCORE = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 3
};
const SEVERITY_SCORE = {
  high: 8,
  medium: 4,
  low: 1
};
function findingScore(f, moneyLeakIds) {
  let score = 0;
  score += IMPACT_SCORE[f.impactLevel ?? ""] ?? 0;
  score += SEVERITY_SCORE[f.severity] ?? 0;
  if (moneyLeakIds.has(f.id)) score += 15;
  score += Math.min((f.affectedUrls?.length ?? 0) * 2, 10);
  return score;
}
function toRoadmapImpact(f) {
  switch (f.impactLevel) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    default:
      return f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low";
  }
}
const IMPACT_RANK = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};
function highestImpact(impacts) {
  return impacts.reduce(
    (best, cur) => IMPACT_RANK[cur] > IMPACT_RANK[best] ? cur : best,
    "Low"
  );
}
function effortForUngrouped(f) {
  if (f.category === "technical" && (f.id.startsWith("lh-") || f.id.includes("speed"))) return "High";
  if ((f.affectedUrls?.length ?? 0) > 5) return "High";
  if (f.severity === "low") return "Low";
  return "Medium";
}
function buildFixRoadmap(result) {
  const { findings, moneyLeaks } = result;
  const moneyLeakIds = new Set(
    findings.filter((f) => moneyLeaks.some((ml) => ml.toLowerCase().includes(f.title.toLowerCase().slice(0, 20)))).map((f) => f.id)
  );
  const scored = findings.map((f) => ({
    finding: f,
    score: findingScore(f, moneyLeakIds),
    clusterKey: ID_TO_CLUSTER.get(f.id) ?? null
  }));
  const clusterBuckets = /* @__PURE__ */ new Map();
  const ungrouped = [];
  for (const sf of scored) {
    if (sf.clusterKey) {
      if (!clusterBuckets.has(sf.clusterKey)) clusterBuckets.set(sf.clusterKey, []);
      clusterBuckets.get(sf.clusterKey).push(sf);
    } else {
      ungrouped.push(sf);
    }
  }
  const items = [];
  for (const cluster of CLUSTERS) {
    const bucket = clusterBuckets.get(cluster.clusterKey);
    if (!bucket || bucket.length === 0) continue;
    const totalScore = bucket.reduce((s, sf) => s + sf.score, 0);
    const allUrls = Array.from(new Set(bucket.flatMap((sf) => sf.finding.affectedUrls ?? [])));
    const impact = highestImpact(bucket.map((sf) => toRoadmapImpact(sf.finding)));
    items.push({
      totalScore,
      item: {
        title: cluster.title,
        whyItMatters: cluster.whyItMatters,
        plainEnglishFix: cluster.plainEnglishFix,
        impact,
        effort: cluster.effort,
        category: cluster.category,
        affectedUrls: allUrls.length > 0 ? allUrls.slice(0, 5) : void 0,
        sourceFindingIds: bucket.map((sf) => sf.finding.id)
      }
    });
  }
  const UNGROUPED_THRESHOLD = 10;
  for (const sf of ungrouped) {
    if (sf.score < UNGROUPED_THRESHOLD) continue;
    const f = sf.finding;
    items.push({
      totalScore: sf.score,
      item: {
        title: f.title,
        whyItMatters: f.whyItMatters,
        plainEnglishFix: f.recommendation,
        impact: toRoadmapImpact(f),
        effort: effortForUngrouped(f),
        category: f.category,
        affectedUrls: f.affectedUrls?.slice(0, 5),
        sourceFindingIds: [f.id]
      }
    });
  }
  items.sort((a, b) => b.totalScore - a.totalScore);
  const top10 = items.slice(0, 10);
  return top10.map((entry, idx) => ({ priority: idx + 1, ...entry.item }));
}
const log$2 = scanRepository.createLogger("roadmapStage");
async function roadmapStage(ctx, emit) {
  emit("Building fix roadmap…", 96);
  ctx.roadmap = buildFixRoadmap({
    findings: ctx.allFindings,
    moneyLeaks: ctx.moneyLeaks
  });
  log$2.info(`Roadmap built: ${ctx.roadmap.length} items`);
}
const LEAD_VALUE = {
  roofer: { low: 800, high: 3e3, label: "roofing" },
  contractor: { low: 600, high: 2500, label: "contracting / home services" },
  auto_shop: { low: 150, high: 600, label: "auto repair" },
  auto: { low: 300, high: 1e3, label: "automotive" },
  dentist: { low: 400, high: 1800, label: "dental / healthcare" },
  salon: { low: 40, high: 200, label: "salon / spa" },
  restaurant: { low: 20, high: 100, label: "restaurant / food service" },
  other: { low: 150, high: 600, label: "local business" }
};
const IMPACT_WEIGHT = {
  CRITICAL: 8,
  HIGH: 4,
  MEDIUM: 1.5,
  LOW: 0.3
};
function issueScoreToLeadRange(score) {
  if (score < 5) return { low: 1, high: 4 };
  if (score < 15) return { low: 3, high: 10 };
  if (score < 30) return { low: 8, high: 20 };
  if (score < 55) return { low: 15, high: 35 };
  return { low: 25, high: 60 };
}
function estimateRevenueImpact(input) {
  const { findings, detectedBusinessType, scoreConfidence } = input;
  const leadValueConfig = LEAD_VALUE[detectedBusinessType] ?? LEAD_VALUE.other;
  const issueScore = findings.reduce((sum, f) => {
    const w = IMPACT_WEIGHT[f.impactLevel ?? ""] ?? 0;
    return sum + w;
  }, 0);
  const leadLoss = issueScoreToLeadRange(issueScore);
  const CONVERSION_LOW = 0.2;
  const CONVERSION_HIGH = 0.4;
  const revLow = Math.round(leadLoss.low * CONVERSION_LOW * leadValueConfig.low / 100) * 100;
  const revHigh = Math.round(leadLoss.high * CONVERSION_HIGH * leadValueConfig.high / 100) * 100;
  const estimatedRevenueLossRange = revLow > 0 ? { low: revLow, high: revHigh } : void 0;
  const impactDrivers = buildDriverList(findings);
  const explanation = buildExplanation(findings, leadLoss);
  const confidence = deriveConfidence(findings, scoreConfidence);
  const assumptions = buildAssumptions(detectedBusinessType, leadValueConfig, confidence);
  return {
    estimatedLeadLossRange: leadLoss,
    estimatedRevenueLossRange,
    impactDrivers,
    explanation,
    assumptions,
    confidence
  };
}
const DRIVER_LABELS = {
  "local-no-phone-homepage": "Phone number missing from the homepage — visitors cannot call without searching for it",
  "local-no-phone-contact": "Phone number absent from the contact page — the most conversion-critical page on the site",
  "conversion-no-phone-homepage": "No clickable phone link on the homepage — mobile visitors cannot tap to call",
  "visual-no-phone-above-fold": "Phone number not visible before scrolling — most visitors never scroll far enough to find it",
  "conversion-no-cta-homepage": "No clear call-to-action button on the homepage — visitors have no obvious next step",
  "visual-no-above-fold-cta": 'No "contact" or "get a quote" button visible on first load — visitors leave without acting',
  "conversion-low-cta-coverage": "Contact options are missing on many pages — visitors who browse rarely find a way to reach you",
  "conversion-no-booking-cta": "No booking or appointment link — customers must find another way to schedule",
  "conversion-no-form": "No contact form anywhere on the site — enquiries outside business hours are lost",
  "conversion-no-form-contact-page": "No form on the contact page — the expected action on that page is unavailable",
  "technical-noindex-money-pages": "Key service or contact pages blocked from Google — they cannot appear in search results",
  "technical-broken-pages": "Broken pages on the site — visitors and Google hit dead ends",
  "lh-performance-poor": "Very slow page loading speed — most visitors leave before the page finishes loading",
  "lh-performance-needs-work": "Below-average page speed — slow enough to increase visitor drop-off rate",
  "lh-lcp-slow": "Largest element takes too long to appear — visitors experience a blank or partial page",
  "lh-tbt-high": "Page interactivity is heavily delayed — buttons and links feel unresponsive",
  "trust-no-testimonials": "No customer reviews or testimonials — visitors cannot gauge whether to trust the business",
  "trust-weak-trust-signals": "Weak credibility signals on the homepage — first-time visitors may lack confidence to contact",
  "trust-homepage-no-trust-content": "Nothing on the homepage establishes trust — the site looks generic",
  "local-no-localbusiness-schema": "No structured business data for Google — harder to appear in local map results",
  "local-no-address-homepage": "Business address not on the homepage — local customers cannot verify the location quickly",
  "local-no-map": "No embedded map — visitors must leave the site to find directions",
  "content-thin-homepage": "Homepage has very little content — gives Google and visitors minimal information about the business",
  "content-no-service-pages": "No dedicated service pages — each service cannot rank independently in search",
  "content-thin-service-pages": "Service pages have too little content — unlikely to rank for relevant search terms"
};
function buildDriverList(findings) {
  const sorted = [...findings].sort((a, b) => {
    const wa = IMPACT_WEIGHT[a.impactLevel ?? ""] ?? 0;
    const wb = IMPACT_WEIGHT[b.impactLevel ?? ""] ?? 0;
    return wb - wa;
  });
  return sorted.slice(0, 5).map((f) => DRIVER_LABELS[f.id] ?? f.title);
}
function buildExplanation(findings, leadLoss, businessType) {
  const criticalCount = findings.filter((f) => f.impactLevel === "CRITICAL").length;
  const highCount = findings.filter((f) => f.impactLevel === "HIGH").length;
  const hasConversionIssues = findings.some(
    (f) => f.category === "conversion" && (f.impactLevel === "CRITICAL" || f.impactLevel === "HIGH")
  );
  const hasSpeedIssues = findings.some(
    (f) => f.id.startsWith("lh-performance") || f.id === "lh-lcp-slow" || f.id === "lh-tbt-high"
  );
  const hasVisibilityIssues = findings.some(
    (f) => f.id === "technical-noindex-money-pages" || f.id === "technical-broken-pages"
  );
  const hasLocalIssues = findings.some(
    (f) => f.category === "localSeo" && (f.impactLevel === "CRITICAL" || f.impactLevel === "HIGH")
  );
  const hasTrustIssues = findings.some(
    (f) => f.category === "trust" && (f.impactLevel === "CRITICAL" || f.impactLevel === "HIGH")
  );
  const causes = [];
  if (hasConversionIssues) causes.push("missing contact options and call-to-action buttons");
  if (hasSpeedIssues) causes.push("slow page loading speed");
  if (hasVisibilityIssues) causes.push("pages that are hidden from or broken for Google");
  if (hasLocalIssues) causes.push("weak local search signals");
  if (hasTrustIssues) causes.push("lack of visible credibility signals");
  const causeText = causes.length > 0 ? joinList(causes) : "a combination of technical, conversion, and local SEO issues";
  const severityNote = criticalCount + highCount >= 3 ? "Several high-priority issues were detected. " : criticalCount > 0 ? "At least one critical issue was detected. " : "";
  return `${severityNote}Based on the issues found, this website may be losing an estimated ${leadLoss.low}–${leadLoss.high} potential leads per month due to ${causeText}. This is a directional estimate only — actual results depend on traffic volume, market, and competition.`;
}
function deriveConfidence(findings, scoreConfidence) {
  const criticalOrHigh = findings.filter(
    (f) => f.impactLevel === "CRITICAL" || f.impactLevel === "HIGH"
  ).length;
  if (scoreConfidence?.level === "High" && criticalOrHigh >= 2) return "Medium";
  if (scoreConfidence?.level === "Low") return "Low";
  if (criticalOrHigh === 0) return "Low";
  if (criticalOrHigh >= 3) return "Medium";
  return "Low";
}
function buildAssumptions(businessType, leadValueConfig, confidence) {
  return [
    `Business type: ${leadValueConfig.label}`,
    `Estimated lead value assumed at $${leadValueConfig.low.toLocaleString()}–$${leadValueConfig.high.toLocaleString()} per converted customer (conservative range)`,
    "Lead-to-customer conversion rate assumed at 20–40% of enquiries",
    "Lead loss estimates are based on detected website issues only — actual traffic and market conditions are not known",
    "Revenue estimates assume current organic and direct traffic levels; paid traffic is not considered",
    confidence === "Low" ? "Confidence is low — fewer pages were crawled or fewer high-impact issues were identified, making the estimate less certain" : "Estimate is directional; consult an SEO professional for a detailed revenue projection",
    "All figures are estimates and should not be treated as guaranteed outcomes"
  ];
}
function joinList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
const log$1 = scanRepository.createLogger("revenueStage");
async function revenueStage(ctx, emit) {
  emit("Estimating revenue impact…", 96);
  ctx.revenueImpact = estimateRevenueImpact({
    findings: ctx.allFindings,
    detectedBusinessType: ctx.detectedBusinessType,
    scoreConfidence: ctx.scoreConfidence
  });
  log$1.info(`Revenue estimate: ${ctx.revenueImpact.confidence} confidence`);
}
const log = scanRepository.createLogger("runScanJob");
async function runScanJob(request, emit) {
  log.info(`Scan job starting: ${request.url}`);
  const ctx = createScanJobContext(request);
  try {
    await validateStage(ctx, emit);
    await crawlStage(ctx, emit);
    await extractStage(ctx, emit);
    await analysisStage(ctx, emit);
    await runOptional("visual", ctx, emit, visualStage);
    await runOptional("impact", ctx, emit, impactStage);
    await scoreStage(ctx, emit);
    await runOptional("competitor", ctx, emit, competitorStage);
    await runOptional("confidence", ctx, emit, confidenceStage);
    await runOptional("roadmap", ctx, emit, roadmapStage);
    await runOptional("revenue", ctx, emit, revenueStage);
    await reportStage(ctx, emit);
  } finally {
    if (ctx.browser) {
      await ctx.browser.close().catch(
        (err) => log.warn(`Browser close error: ${err.message}`)
      );
      log.info("Browser closed");
    }
  }
  emit("Complete.", 100);
  log.info(
    `Scan job complete: ${ctx.domain} | pages=${ctx.pages.length} findings=${ctx.allFindings.length} overall=${ctx.scores.overall.value}`
  );
  const jsonPath = ctx.artifacts.jsonPath ?? index.buildJsonPath(ctx.scanId);
  const htmlPath = ctx.artifacts.htmlPath ?? index.buildHtmlPath(ctx.scanId);
  return buildAuditResult(ctx, jsonPath, htmlPath);
}
async function runOptional(name, ctx, emit, stage) {
  try {
    await stage(ctx, emit);
  } catch (err) {
    log.warn(`Optional stage '${name}' failed: ${err.message}`);
  }
}
async function runAudit(request, emitProgress) {
  return runScanJob(request, emitProgress);
}
exports.runAudit = runAudit;
