"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
let _reportsDir = null;
function getReportsDir() {
  if (!_reportsDir) {
    _reportsDir = path.join(electron.app.getPath("userData"), "reports");
  }
  return _reportsDir;
}
function getScanArtifactsDir(scanId) {
  return path.join(getReportsDir(), scanId);
}
function buildJsonPath(scanId) {
  return path.join(getScanArtifactsDir(scanId), "report.json");
}
function buildHtmlPath(scanId) {
  return path.join(getScanArtifactsDir(scanId), "report.html");
}
function getIndexPath() {
  return path.join(getReportsDir(), "index.json");
}
function generateScanId(domain) {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "_").slice(0, 40);
  const ts = Date.now();
  return `${safeDomain}_${ts}`;
}
exports.buildHtmlPath = buildHtmlPath;
exports.buildJsonPath = buildJsonPath;
exports.generateScanId = generateScanId;
exports.getIndexPath = getIndexPath;
exports.getReportsDir = getReportsDir;
exports.getScanArtifactsDir = getScanArtifactsDir;
