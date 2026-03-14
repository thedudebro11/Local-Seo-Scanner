"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const path = require("path");
const fs = require("fs-extra");
const index = require("../index.js");
const logger = require("./logger-DOTeCaxX.js");
require("electron");
const log = logger.createLogger("scanRepository");
function readIndex() {
  const indexPath = index.getIndexPath();
  try {
    if (!fs.existsSync(indexPath)) return [];
    return fs.readJsonSync(indexPath);
  } catch (err) {
    log.warn(`Failed to read scan index: ${err.message}`);
    return [];
  }
}
async function writeIndex(entries) {
  const indexPath = index.getIndexPath();
  await fs.ensureDir(path.dirname(indexPath));
  await fs.writeJson(indexPath, entries, { spaces: 2 });
}
function listSavedScans() {
  const entries = readIndex();
  log.info(`listSavedScans: ${entries.length} entries`);
  return entries.slice().reverse();
}
function loadScanById(scanId) {
  const jsonPath = index.buildJsonPath(scanId);
  try {
    if (!fs.existsSync(jsonPath)) {
      log.warn(`loadScanById: file not found — ${jsonPath}`);
      return null;
    }
    const result = fs.readJsonSync(jsonPath);
    log.info(`loadScanById: loaded ${scanId}`);
    return result;
  } catch (err) {
    log.warn(`loadScanById: failed — ${err.message}`);
    return null;
  }
}
async function saveScan(result) {
  const jsonPath = index.buildJsonPath(result.id);
  const htmlPath = index.buildHtmlPath(result.id);
  const meta = {
    id: result.id,
    domain: result.domain,
    scannedAt: result.scannedAt,
    overallScore: result.scores.overall.value,
    businessType: result.detectedBusinessType,
    scanMode: result.request.scanMode,
    jsonPath,
    htmlPath
  };
  const existing = readIndex().filter((e) => e.id !== result.id);
  await writeIndex([...existing, meta]);
  log.info(`saveScan: saved ${result.id} (overall=${meta.overallScore})`);
}
exports.listSavedScans = listSavedScans;
exports.loadScanById = loadScanById;
exports.saveScan = saveScan;
