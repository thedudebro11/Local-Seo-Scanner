"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const logger = require("./logger-DOTeCaxX.js");
const log = logger.createLogger("scanRepository");
function listSavedScans() {
  log.info("listSavedScans called — returning [] (Phase 1 stub)");
  return [];
}
function loadScanById(_scanId) {
  log.info(`loadScanById(${_scanId}) called — returning null (Phase 1 stub)`);
  return null;
}
exports.listSavedScans = listSavedScans;
exports.loadScanById = loadScanById;
