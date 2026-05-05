"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const runScanJob = require("./runScanJob-BwZ3bgJV.js");
require("../index.js");
require("electron");
require("path");
require("fs-extra");
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
require("./settingsStorage-DcgDEctW.js");
require("./scanRepository-B5pnqpoU.js");
require("cheerio/slim");
require("fs/promises");
require("date-fns");
async function runAudit(request, emitProgress, sharedBrowser) {
  return runScanJob.runScanJob(request, emitProgress, sharedBrowser);
}
exports.runAudit = runAudit;
