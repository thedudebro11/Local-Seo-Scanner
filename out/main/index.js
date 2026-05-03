"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
function registerScanHandlers(mainWindow2) {
  electron.ipcMain.handle("scan:start", async (_, request) => {
    const emitProgress = (step, percent, message) => {
      const event = { step, percent, message };
      if (!mainWindow2.isDestroyed()) {
        mainWindow2.webContents.send("scan:progress", event);
      }
    };
    try {
      const { runAudit } = await Promise.resolve().then(() => require("./chunks/runAudit-CBkRarpM.js"));
      const result = await runAudit(request, emitProgress);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Scan failed: ${message}`);
    }
  });
}
function registerBulkScanHandlers(mainWindow2) {
  electron.ipcMain.handle("bulk:start", async (_, request) => {
    const emitProgress = (event) => {
      if (!mainWindow2.isDestroyed()) {
        mainWindow2.webContents.send("bulk:progress", event);
      }
    };
    try {
      const { runBulkScan } = await Promise.resolve().then(() => require("./chunks/runBulkScan-CaG1OoVw.js"));
      return await runBulkScan(request, emitProgress);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Bulk scan failed: ${message}`);
    }
  });
}
function registerDiscoveryHandlers() {
  electron.ipcMain.handle("discovery:run", async (_, request) => {
    try {
      const { runMarketDiscovery } = await Promise.resolve().then(() => require("./chunks/marketDiscovery-CIl6aCj1.js"));
      return await runMarketDiscovery(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Discovery failed: ${message}`);
    }
  });
}
function registerMarketHandlers() {
  electron.ipcMain.handle(
    "market:build",
    async (_, payload) => {
      const { buildMarketDashboard } = await Promise.resolve().then(() => require("./chunks/buildMarketDashboard-BbxLLYuT.js"));
      return buildMarketDashboard({ bulkResult: payload.bulkResult, label: payload.label });
    }
  );
  electron.ipcMain.handle(
    "monitoring:add-site",
    async (_, domain) => {
      const { addTrackedSite } = await Promise.resolve().then(() => require("./chunks/siteManager-D5Sop0bC.js"));
      const site = await addTrackedSite(domain);
      return site.siteId;
    }
  );
}
function registerFileHandlers() {
  electron.ipcMain.handle("file:list-scans", async () => {
    const { listSavedScans } = await Promise.resolve().then(() => require("./chunks/scanRepository-D1_fs6er.js"));
    return listSavedScans();
  });
  electron.ipcMain.handle("file:open-report", async (_, reportPath) => {
    await electron.shell.openPath(reportPath);
  });
  electron.ipcMain.handle("file:open-folder", async (_, folderPath) => {
    electron.shell.showItemInFolder(folderPath);
  });
  electron.ipcMain.handle("file:load-scan", async (_, scanId) => {
    const { loadScanById } = await Promise.resolve().then(() => require("./chunks/scanRepository-D1_fs6er.js"));
    return loadScanById(scanId);
  });
  electron.ipcMain.handle("file:email-report", async (_, { htmlPath, domain }) => {
    electron.shell.showItemInFolder(htmlPath);
    const subject = encodeURIComponent(`SEO Audit Report — ${domain}`);
    const body = encodeURIComponent(
      `Hi,

Please find the SEO audit report for ${domain} attached.

The report file has been highlighted in your file explorer — drag it directly into this email.

Report: ${htmlPath}`
    );
    await electron.shell.openExternal(`mailto:?subject=${subject}&body=${body}`);
  });
}
function registerAppHandlers() {
  electron.ipcMain.handle("app:version", () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("app:platform", () => {
    return process.platform;
  });
  electron.ipcMain.handle("app:reports-path", async () => {
    const { getReportsDir: getReportsDir2 } = await Promise.resolve().then(() => pathResolver);
    return getReportsDir2();
  });
}
function registerLicenseHandlers() {
  electron.ipcMain.handle("license:activate", async (_, key) => {
    const { activateLicense } = await Promise.resolve().then(() => require("./chunks/licenseValidator-CPPF2-FB.js"));
    return activateLicense(key);
  });
  electron.ipcMain.handle("license:check", async () => {
    if (process.env.NODE_ENV === "development") {
      return { valid: true, license: null };
    }
    const { checkLicense } = await Promise.resolve().then(() => require("./chunks/licenseValidator-CPPF2-FB.js"));
    return checkLicense();
  });
  electron.ipcMain.handle("license:deactivate", async () => {
    const { deactivateLicense } = await Promise.resolve().then(() => require("./chunks/licenseValidator-CPPF2-FB.js"));
    return deactivateLicense();
  });
}
function registerSettingsHandlers() {
  electron.ipcMain.handle("settings:get", async () => {
    const { readSettings } = await Promise.resolve().then(() => require("./chunks/settingsStorage-B4oQ_sNu.js")).then((n) => n.settingsStorage);
    return readSettings();
  });
  electron.ipcMain.handle("settings:save", async (_, partial) => {
    const { mergeSettings } = await Promise.resolve().then(() => require("./chunks/settingsStorage-B4oQ_sNu.js")).then((n) => n.settingsStorage);
    return mergeSettings(partial);
  });
}
let _reportsDir = null;
function initReportsDir(userDataPath) {
  _reportsDir = path.join(userDataPath, "reports");
}
function getReportsDir() {
  if (!_reportsDir) {
    throw new Error(
      "pathResolver: initReportsDir() has not been called. Call it from the Electron main process before starting scans."
    );
  }
  return _reportsDir;
}
function getScanArtifactsDir(scanId) {
  return path.join(getReportsDir(), scanId);
}
function getScreenshotsDir(scanId) {
  return path.join(getScanArtifactsDir(scanId), "screenshots");
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
function getBulkScansDir() {
  return path.join(getReportsDir(), "bulk");
}
function getBulkScanPath(batchId) {
  return path.join(getBulkScansDir(), `${batchId}.json`);
}
function getDiscoveryDir() {
  return path.join(getReportsDir(), "discovery");
}
function getDiscoveryPath(discoveryId) {
  return path.join(getDiscoveryDir(), `${discoveryId}.json`);
}
function getMarketDashboardsDir() {
  return path.join(getReportsDir(), "market-dashboards");
}
function getMarketDashboardPath(dashboardId) {
  return path.join(getMarketDashboardsDir(), `${dashboardId}.json`);
}
const pathResolver = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  buildHtmlPath,
  buildJsonPath,
  generateScanId,
  getBulkScanPath,
  getBulkScansDir,
  getDiscoveryDir,
  getDiscoveryPath,
  getIndexPath,
  getMarketDashboardPath,
  getMarketDashboardsDir,
  getReportsDir,
  getScanArtifactsDir,
  getScreenshotsDir,
  initReportsDir
}, Symbol.toStringTag, { value: "Module" }));
let _monitoringDir = null;
function initMonitoringDir(userDataPath) {
  _monitoringDir = path.join(userDataPath, "monitoring");
}
function getMonitoringDir() {
  if (!_monitoringDir) {
    throw new Error(
      "monitoringPaths: initMonitoringDir() has not been called. Call it from the Electron main process before using monitoring features."
    );
  }
  return _monitoringDir;
}
function getSitesPath() {
  return path.join(getMonitoringDir(), "sites.json");
}
function getSiteHistoryDir(siteId) {
  return path.join(getMonitoringDir(), "history", siteId);
}
function getScanSummaryPath(siteId, scanId) {
  return path.join(getSiteHistoryDir(siteId), `${scanId}.json`);
}
let _userDataPath$1 = null;
function initLicenseDir(userDataPath) {
  _userDataPath$1 = userDataPath;
}
function getLicensePath() {
  if (!_userDataPath$1) {
    throw new Error("licensePaths: initLicenseDir() has not been called.");
  }
  return path.join(_userDataPath$1, "license.json");
}
let _userDataPath = null;
function initSettingsDir(userDataPath) {
  _userDataPath = userDataPath;
}
function getSettingsPath() {
  if (!_userDataPath) {
    throw new Error("settingsPaths: initSettingsDir() has not been called.");
  }
  return path.join(_userDataPath, "settings.json");
}
const isDev = process.env.NODE_ENV === "development";
let mainWindow = null;
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: "Local SEO Scanner",
    titleBarStyle: "default"
  });
  win.once("ready-to-show", () => {
    win.show();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
electron.app.whenReady().then(() => {
  const userData = electron.app.getPath("userData");
  initReportsDir(userData);
  initMonitoringDir(userData);
  initLicenseDir(userData);
  initSettingsDir(userData);
  mainWindow = createWindow();
  registerScanHandlers(mainWindow);
  registerBulkScanHandlers(mainWindow);
  registerDiscoveryHandlers();
  registerMarketHandlers();
  registerFileHandlers();
  registerAppHandlers();
  registerLicenseHandlers();
  registerSettingsHandlers();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerScanHandlers(mainWindow);
      registerBulkScanHandlers(mainWindow);
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    const isDev2 = process.env.NODE_ENV === "development";
    const isLocal = parsedUrl.origin === "http://localhost:5173" || parsedUrl.protocol === "file:";
    if (!isLocal && !isDev2) {
      event.preventDefault();
    }
  });
});
exports.buildHtmlPath = buildHtmlPath;
exports.buildJsonPath = buildJsonPath;
exports.generateScanId = generateScanId;
exports.getBulkScanPath = getBulkScanPath;
exports.getBulkScansDir = getBulkScansDir;
exports.getDiscoveryDir = getDiscoveryDir;
exports.getDiscoveryPath = getDiscoveryPath;
exports.getIndexPath = getIndexPath;
exports.getLicensePath = getLicensePath;
exports.getMarketDashboardPath = getMarketDashboardPath;
exports.getMarketDashboardsDir = getMarketDashboardsDir;
exports.getScanSummaryPath = getScanSummaryPath;
exports.getScreenshotsDir = getScreenshotsDir;
exports.getSettingsPath = getSettingsPath;
exports.getSiteHistoryDir = getSiteHistoryDir;
exports.getSitesPath = getSitesPath;
