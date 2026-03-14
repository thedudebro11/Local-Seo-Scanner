"use strict";
const electron = require("electron");
const api = {
  // ── Scan ───────────────────────────────────────────────────────────────────
  /**
   * Start a scan. Returns the full AuditResult when the scan completes.
   * Progress events arrive separately via onScanProgress.
   */
  startScan: (request) => electron.ipcRenderer.invoke("scan:start", request),
  /**
   * Subscribe to scan progress events.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  onScanProgress: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("scan:progress", listener);
    return () => electron.ipcRenderer.off("scan:progress", listener);
  },
  // ── Bulk scan ──────────────────────────────────────────────────────────────
  /**
   * Start a bulk scan across multiple domains.
   * Returns a BulkScanResult when all domains are complete.
   * Per-domain progress arrives via onBulkScanProgress.
   */
  startBulkScan: (request) => electron.ipcRenderer.invoke("bulk:start", request),
  /**
   * Subscribe to bulk scan progress events.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  onBulkScanProgress: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("bulk:progress", listener);
    return () => electron.ipcRenderer.off("bulk:progress", listener);
  },
  // ── Market discovery ───────────────────────────────────────────────────────
  /**
   * Run a market discovery search.
   * Returns candidate businesses + normalized valid domains.
   * Does NOT start any scans.
   */
  runDiscovery: (request) => electron.ipcRenderer.invoke("discovery:run", request),
  // ── Market Intelligence ────────────────────────────────────────────────────
  /**
   * Build a market intelligence dashboard from a completed bulk scan result.
   * Loads individual report.json files for enrichment, then saves dashboard JSON.
   */
  buildMarketDashboard: (payload) => electron.ipcRenderer.invoke("market:build", payload),
  /**
   * Add a domain to the monitoring tracked-sites list.
   * Returns the generated siteId.
   */
  addMonitoredSite: (domain) => electron.ipcRenderer.invoke("monitoring:add-site", domain),
  // ── File / Report ──────────────────────────────────────────────────────────
  /** Return the list of previously saved scans. */
  getSavedScans: () => electron.ipcRenderer.invoke("file:list-scans"),
  /** Open a saved HTML report in the system default browser. */
  openReport: (path) => electron.ipcRenderer.invoke("file:open-report", path),
  /** Open the reports folder in Finder / Explorer. */
  openFolder: (path) => electron.ipcRenderer.invoke("file:open-folder", path),
  /** Load a previously saved AuditResult by scan ID. */
  loadScan: (scanId) => electron.ipcRenderer.invoke("file:load-scan", scanId),
  // ── App ────────────────────────────────────────────────────────────────────
  getVersion: () => electron.ipcRenderer.invoke("app:version"),
  getPlatform: () => electron.ipcRenderer.invoke("app:platform"),
  getReportsPath: () => electron.ipcRenderer.invoke("app:reports-path")
};
electron.contextBridge.exposeInMainWorld("api", api);
