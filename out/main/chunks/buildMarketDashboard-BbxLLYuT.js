"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs-extra");
const logger = require("./logger-DOTeCaxX.js");
const index = require("../index.js");
require("electron");
require("path");
function computeOutreachScore(b) {
  let score = 0;
  const s = b.overallScore ?? 100;
  if (s < 70) score += 3;
  if (s < 55) score += 2;
  if ((b.highPriorityIssueCount ?? 0) >= 3) score += 2;
  if ((b.estimatedRevenueLossLow ?? 0) > 1e3) score += 2;
  if (b.confidenceLevel && b.confidenceLevel !== "Low") score += 1;
  if ((b.opportunityCount ?? 0) >= 3) score += 1;
  return score;
}
function rankBusinesses(items, by) {
  const copy = [...items];
  switch (by) {
    case "score-desc":
      return copy.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
    case "score-asc":
      return copy.sort((a, b) => (a.overallScore ?? 999) - (b.overallScore ?? 999));
    case "revenue-desc":
      return copy.sort(
        (a, b) => (b.estimatedRevenueLossHigh ?? b.estimatedRevenueLossLow ?? 0) - (a.estimatedRevenueLossHigh ?? a.estimatedRevenueLossLow ?? 0)
      );
    case "outreach-desc":
      return copy.sort((a, b) => b.outreachScore - a.outreachScore);
    case "issues-desc":
      return copy.sort((a, b) => (b.issueCount ?? 0) - (a.issueCount ?? 0));
  }
}
function topN(items, by, n) {
  return rankBusinesses(items, by).slice(0, n);
}
const log = logger.createLogger("market");
function generateDashboardId() {
  return `market_${Date.now()}`;
}
function itemToBusiness(item) {
  const b = {
    domain: item.domain,
    ok: item.ok,
    error: item.error,
    overallScore: item.overallScore,
    scoreLabel: item.scoreLabel,
    confidenceLevel: item.confidence?.level,
    issueCount: item.issueCount,
    highPriorityIssueCount: item.highPriorityIssueCount,
    estimatedRevenueLossLow: item.revenueImpact?.revenueLossLow,
    estimatedRevenueLossHigh: item.revenueImpact?.revenueLossHigh,
    reportPaths: item.reportPaths,
    outreachScore: 0
    // computed below
  };
  b.outreachScore = computeOutreachScore(b);
  return b;
}
async function enrichFromReport(b) {
  const jsonPath = b.reportPaths?.jsonPath;
  if (!jsonPath) return;
  try {
    const report = await fs.readJson(jsonPath);
    if (report.seoOpportunities && report.seoOpportunities.length > 0) {
      b.opportunityCount = report.seoOpportunities.length;
    }
    const highFinding = report.findings.find((f) => f.severity === "high");
    if (highFinding) b.biggestProblem = highFinding.title;
    const scores = report.scores;
    const cats = [
      { key: "technical", val: scores.technical.value },
      { key: "localSeo", val: scores.localSeo.value },
      { key: "conversion", val: scores.conversion.value },
      { key: "content", val: scores.content.value },
      { key: "trust", val: scores.trust.value }
    ];
    const sorted = cats.sort((a, c) => c.val - a.val);
    b.strongestCategory = sorted[0].key;
    b.weakestCategory = sorted[sorted.length - 1].key;
    b.outreachScore = computeOutreachScore(b);
  } catch {
    log.warn(`Could not enrich from report: ${jsonPath}`);
  }
}
function buildSummary(businesses) {
  const successful = businesses.filter((b) => b.ok && b.overallScore !== void 0);
  const scores = successful.map((b) => b.overallScore);
  const totalRevenueLeak = businesses.reduce(
    (sum, b) => sum + (b.estimatedRevenueLossLow ?? 0),
    0
  );
  return {
    totalBusinesses: businesses.length,
    scannedSuccessfully: successful.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    totalEstimatedRevenueLeak: Math.round(totalRevenueLeak),
    sitesBelow55: successful.filter((b) => (b.overallScore ?? 100) < 55).length,
    sitesBelow70: successful.filter((b) => (b.overallScore ?? 100) < 70).length
  };
}
async function buildMarketDashboard(req) {
  const { bulkResult, label, enrich = true } = req;
  const dashboardId = generateDashboardId();
  let businesses = bulkResult.items.map(itemToBusiness);
  if (enrich) {
    await Promise.all(businesses.map((b) => enrichFromReport(b)));
  }
  const dashboard = {
    dashboardId,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    marketLabel: label ?? `Market Analysis — ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
    summary: buildSummary(businesses),
    topPerformers: topN(businesses.filter((b) => b.ok), "score-desc", 5),
    weakestSites: topN(businesses.filter((b) => b.ok), "score-asc", 5),
    highestRevenueLeakSites: topN(businesses.filter((b) => b.ok), "revenue-desc", 5),
    bestOpportunityTargets: topN(businesses.filter((b) => b.ok), "outreach-desc", 5),
    allBusinesses: rankBusinesses(businesses, "score-desc")
  };
  await saveDashboard(dashboard);
  return dashboard;
}
async function saveDashboard(dashboard) {
  try {
    const dir = index.getMarketDashboardsDir();
    await fs.ensureDir(dir);
    const filePath = index.getMarketDashboardPath(dashboard.dashboardId);
    await fs.writeJson(filePath, dashboard, { spaces: 2 });
    log.info(`Market dashboard saved: ${filePath}`);
  } catch (err) {
    log.warn(`Failed to save market dashboard: ${err}`);
  }
}
exports.buildMarketDashboard = buildMarketDashboard;
