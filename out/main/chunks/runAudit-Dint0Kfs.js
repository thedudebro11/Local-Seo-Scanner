"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const url = require("url");
const pathResolver = require("./pathResolver-CbX9UHgB.js");
const logger = require("./logger-DOTeCaxX.js");
require("electron");
require("path");
function normalizeInputUrl(raw) {
  let url$1 = raw.trim();
  if (!/^https?:\/\//i.test(url$1)) {
    url$1 = `https://${url$1}`;
  }
  try {
    const parsed = new url.URL(url$1);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL: "${raw}"`);
  }
}
function getDomain(url$1) {
  try {
    return new url.URL(url$1).hostname.toLowerCase();
  } catch {
    return "";
  }
}
const log = logger.createLogger("runAudit");
async function runAudit(request, emitProgress) {
  log.info(`Starting audit for ${request.url}`);
  emitProgress("Validating URL…", 2);
  let normalizedUrl;
  try {
    normalizedUrl = normalizeInputUrl(request.url);
  } catch (err) {
    throw new Error(`Invalid URL: ${request.url}`);
  }
  const domain = getDomain(normalizedUrl);
  const scanId = pathResolver.generateScanId(domain);
  log.info(`Normalized URL: ${normalizedUrl} | Domain: ${domain} | ID: ${scanId}`);
  const steps = [
    ["Fetching homepage…", 8],
    ["Loading robots.txt…", 14],
    ["Loading sitemap…", 20],
    ["Discovering pages…", 30],
    ["Extracting signals…", 50],
    ["Detecting business type…", 60],
    ["Analyzing technical SEO…", 68],
    ["Analyzing local SEO…", 74],
    ["Analyzing conversions…", 80],
    ["Running Lighthouse…", 88],
    ["Scoring results…", 94],
    ["Building reports…", 98],
    ["Complete.", 100]
  ];
  for (const [step, pct] of steps) {
    emitProgress(step, pct);
    await sleep(120);
  }
  const placeholderResult = {
    id: scanId,
    request,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    domain,
    detectedBusinessType: request.businessType === "auto" ? "other" : request.businessType,
    pages: [],
    findings: [
      {
        id: "placeholder-001",
        category: "technical",
        severity: "medium",
        title: "Phase 1 Stub — Real scan not yet implemented",
        summary: `The crawler and analyzers will be wired in Phase 3–5.`,
        whyItMatters: "This placeholder will be replaced by real findings.",
        recommendation: "Continue to Phase 2 to wire up the scan form and Zustand store."
      }
    ],
    scores: buildPlaceholderScores(),
    quickWins: [
      "Phase 3: Real crawler will find actual quick wins",
      "Phase 5: Analyzers will generate actionable recommendations"
    ],
    moneyLeaks: [
      "Phase 5: Revenue-impacting issues will appear here"
    ],
    artifacts: {}
  };
  log.info(`Audit complete for ${domain}`);
  return placeholderResult;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildPlaceholderScores() {
  const make = (value) => ({
    value,
    label: value >= 70 ? "Placeholder (solid)" : "Placeholder (needs work)",
    rationale: ["Real scoring implemented in Phase 6"]
  });
  return {
    technical: make(0),
    localSeo: make(0),
    conversion: make(0),
    content: make(0),
    trust: make(0),
    overall: make(0)
  };
}
exports.runAudit = runAudit;
