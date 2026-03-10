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
function generateScanId(domain) {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "_").slice(0, 40);
  const ts = Date.now();
  return `${safeDomain}_${ts}`;
}
exports.generateScanId = generateScanId;
exports.getReportsDir = getReportsDir;
