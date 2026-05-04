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
  getReportsPath: () => electron.ipcRenderer.invoke("app:reports-path"),
  // ── License ────────────────────────────────────────────────────────────────
  /** Activate a Lemon Squeezy license key on this machine. */
  activateLicense: (key) => electron.ipcRenderer.invoke("license:activate", key),
  /** Check if a valid license is stored (with offline grace period). */
  checkLicense: () => electron.ipcRenderer.invoke("license:check"),
  /** Deactivate license on this machine and delete local license file. */
  deactivateLicense: () => electron.ipcRenderer.invoke("license:deactivate"),
  // ── Settings ───────────────────────────────────────────────────────────────
  /** Load all app settings from disk. */
  getSettings: () => electron.ipcRenderer.invoke("settings:get"),
  /** Merge a partial settings update and persist to disk. */
  saveSettings: (partial) => electron.ipcRenderer.invoke("settings:save", partial),
  // ── Email report ───────────────────────────────────────────────────────────
  /**
   * Open the report file in Finder/Explorer and launch the system mail client
   * with subject + body pre-filled. User drags the highlighted file into email.
   */
  emailReport: (payload) => electron.ipcRenderer.invoke("file:email-report", payload),
  // ── Auto-update ────────────────────────────────────────────────────────────
  installUpdate: () => electron.ipcRenderer.invoke("update:install"),
  onUpdateAvailable: (cb) => {
    const handler = (_, info) => cb(info);
    electron.ipcRenderer.on("update:available", handler);
    return () => electron.ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_, info) => cb(info);
    electron.ipcRenderer.on("update:downloaded", handler);
    return () => electron.ipcRenderer.removeListener("update:downloaded", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
