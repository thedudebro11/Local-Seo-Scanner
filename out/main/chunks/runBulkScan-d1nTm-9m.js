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
const fs = require("fs-extra");
const runAudit = require("./runAudit-CK0BDZZC.js");
const index = require("../index.js");
require("./runScanJob-BVY7ZwiS.js");
require("path");
require("./settingsStorage-DcgDEctW.js");
require("./scanRepository-B5pnqpoU.js");
require("cheerio/slim");
require("electron");
require("child_process");
require("events");
require("crypto");
require("tty");
require("util");
require("os");
require("fs");
require("stream");
require("url");
require("zlib");
require("http");
const log = index.createLogger("runBulkScan");
const MAX_PAGES_BY_MODE = { preview: 1, quick: 10, full: 50 };
async function runBulkScan(request, emitProgress) {
  const domains = normalizeDomains(request.domains);
  const batchId = `bulk_${Date.now()}`;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const totalDomains = domains.length;
  log.info(`Bulk scan starting: batchId=${batchId} domains=${totalDomains}`);
  const items = [];
  const { chromium } = await import("playwright");
  const sharedBrowser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  log.info("Bulk scan: shared browser launched");
  try {
    for (let i = 0; i < domains.length; i++) {
      const url = domains[i];
      const domain = extractDomain(url);
      log.info(`Bulk [${i + 1}/${totalDomains}] scanning ${domain}`);
      const batchBase = i / totalDomains * 100;
      const auditRequest = {
        url,
        scanMode: request.scanMode,
        businessType: request.businessType ?? "auto",
        maxPages: request.maxPages ?? MAX_PAGES_BY_MODE[request.scanMode]
      };
      const item = await scanOneDomain(domain, auditRequest, (step, percent) => {
        const domainSlice = 100 / totalDomains;
        emitProgress({
          batchId,
          domain,
          domainIndex: i,
          totalDomains,
          domainStep: step,
          domainPercent: percent,
          batchPercent: Math.round(batchBase + percent / 100 * domainSlice)
        });
      }, sharedBrowser);
      items.push(item);
    }
  } finally {
    await sharedBrowser.close().catch(
      (err) => log.warn(`Shared browser close error: ${err.message}`)
    );
    log.info("Bulk scan: shared browser closed");
  }
  const completedAt = (/* @__PURE__ */ new Date()).toISOString();
  const successfulScans = items.filter((i) => i.ok).length;
  const result = {
    batchId,
    startedAt,
    completedAt,
    totalDomains,
    successfulScans,
    failedScans: totalDomains - successfulScans,
    items
  };
  await saveBulkResult(result);
  log.info(`Bulk scan complete: ${successfulScans}/${totalDomains} succeeded`);
  return result;
}
async function scanOneDomain(domain, request, emitProgress, sharedBrowser) {
  try {
    const result = await runAudit.runAudit(request, emitProgress, sharedBrowser);
    const rev = result.revenueImpact;
    return {
      domain,
      ok: true,
      overallScore: result.scores.overall.value,
      scoreLabel: result.scores.overall.label,
      issueCount: result.findings.length,
      highPriorityIssueCount: result.findings.filter(
        (f) => f.severity === "high" || f.impactLevel === "CRITICAL" || f.impactLevel === "HIGH"
      ).length,
      revenueImpact: rev ? {
        leadLossLow: rev.estimatedLeadLossRange.low,
        leadLossHigh: rev.estimatedLeadLossRange.high,
        revenueLossLow: rev.estimatedRevenueLossRange?.low,
        revenueLossHigh: rev.estimatedRevenueLossRange?.high
      } : void 0,
      confidence: result.scoreConfidence ? { level: result.scoreConfidence.level, reason: result.scoreConfidence.reason } : void 0,
      reportPaths: {
        htmlPath: result.artifacts.htmlPath,
        jsonPath: result.artifacts.jsonPath
      }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`Bulk scan failed for ${domain}: ${message}`);
    return { domain, ok: false, error: message };
  }
}
async function saveBulkResult(result) {
  try {
    const p = index.getBulkScanPath(result.batchId);
    await fs.ensureDir(index.getBulkScansDir());
    await fs.writeJson(p, result, { spaces: 2 });
    log.info(`Bulk result saved: ${p}`);
  } catch (err) {
    log.warn(`Failed to save bulk result: ${err.message}`);
  }
}
function normalizeDomains(raw) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    let url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes(".")) continue;
      url = parsed.origin;
    } catch {
      continue;
    }
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
exports.normalizeDomains = normalizeDomains;
exports.runBulkScan = runBulkScan;
