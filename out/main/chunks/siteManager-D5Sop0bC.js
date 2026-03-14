"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const path = require("path");
const fs = require("fs-extra");
const index = require("../index.js");
const logger = require("./logger-DOTeCaxX.js");
require("electron");
const log = logger.createLogger("siteManager");
function readSites() {
  try {
    const p = index.getSitesPath();
    if (!fs.existsSync(p)) return [];
    return fs.readJsonSync(p);
  } catch (err) {
    log.warn(`readSites failed: ${err.message}`);
    return [];
  }
}
async function writeSites(sites) {
  const p = index.getSitesPath();
  await fs.ensureDir(path.dirname(p));
  await fs.writeJson(p, sites, { spaces: 2 });
}
function generateSiteId(domain) {
  const safe = domain.replace(/[^a-z0-9.-]/gi, "_").slice(0, 30);
  return `site_${safe}_${Date.now()}`;
}
async function addTrackedSite(domain, businessType) {
  const sites = readSites();
  const existing = sites.find((s) => s.domain === domain);
  if (existing) return existing;
  const site = {
    siteId: generateSiteId(domain),
    domain,
    businessType,
    dateAdded: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeSites([...sites, site]);
  log.info(`addTrackedSite: ${domain} → ${site.siteId}`);
  return site;
}
async function updateTrackedSiteLastScan(siteId, scanId) {
  const sites = readSites();
  const idx = sites.findIndex((s) => s.siteId === siteId);
  if (idx === -1) {
    log.warn(`updateTrackedSiteLastScan: unknown siteId — ${siteId}`);
    return;
  }
  sites[idx] = { ...sites[idx], lastScanId: scanId };
  await writeSites(sites);
  log.info(`updateTrackedSiteLastScan: ${siteId} → lastScanId=${scanId}`);
}
exports.addTrackedSite = addTrackedSite;
exports.updateTrackedSiteLastScan = updateTrackedSiteLastScan;
