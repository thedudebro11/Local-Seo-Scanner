"use strict";
const path = require("path");
const fs = require("fs-extra");
const pathResolver = require("./pathResolver-DKtUPGKe.js");
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
const CURRENT_LEVEL = process.env.NODE_ENV === "development" ? "debug" : "info";
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().substring(11, 23);
}
function log$1(level, prefix, message, ...args) {
  if (LEVELS[level] < LEVELS[CURRENT_LEVEL]) return;
  const label = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] [${prefix}]`;
  switch (level) {
    case "debug":
      console.debug(label, message, ...args);
      break;
    case "info":
      console.info(label, message, ...args);
      break;
    case "warn":
      console.warn(label, message, ...args);
      break;
    case "error":
      console.error(label, message, ...args);
      break;
  }
}
function createLogger(prefix) {
  return {
    debug: (msg, ...args) => log$1("debug", prefix, msg, ...args),
    info: (msg, ...args) => log$1("info", prefix, msg, ...args),
    warn: (msg, ...args) => log$1("warn", prefix, msg, ...args),
    error: (msg, ...args) => log$1("error", prefix, msg, ...args)
  };
}
const log = createLogger("scanRepository");
function readIndex() {
  const indexPath = pathResolver.getIndexPath();
  try {
    if (!fs.existsSync(indexPath)) return [];
    return fs.readJsonSync(indexPath);
  } catch (err) {
    log.warn(`Failed to read scan index: ${err.message}`);
    return [];
  }
}
async function writeIndex(entries) {
  const indexPath = pathResolver.getIndexPath();
  await fs.ensureDir(path.dirname(indexPath));
  await fs.writeJson(indexPath, entries, { spaces: 2 });
}
function listSavedScans() {
  const entries = readIndex();
  log.info(`listSavedScans: ${entries.length} entries`);
  return entries.slice().reverse();
}
function loadScanById(scanId) {
  const jsonPath = pathResolver.buildJsonPath(scanId);
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
  const jsonPath = pathResolver.buildJsonPath(result.id);
  const htmlPath = pathResolver.buildHtmlPath(result.id);
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
const scanRepository = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  listSavedScans,
  loadScanById,
  saveScan
}, Symbol.toStringTag, { value: "Module" }));
exports.createLogger = createLogger;
exports.saveScan = saveScan;
exports.scanRepository = scanRepository;
