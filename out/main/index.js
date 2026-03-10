"use strict";
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
      const { runAudit } = await Promise.resolve().then(() => require("./chunks/runAudit-CH43LY54.js"));
      const result = await runAudit(request, emitProgress);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Scan failed: ${message}`);
    }
  });
}
function registerFileHandlers() {
  electron.ipcMain.handle("file:list-scans", async () => {
    const { listSavedScans } = await Promise.resolve().then(() => require("./chunks/scanRepository-DHGtEqjH.js"));
    return listSavedScans();
  });
  electron.ipcMain.handle("file:open-report", async (_, reportPath) => {
    await electron.shell.openPath(reportPath);
  });
  electron.ipcMain.handle("file:open-folder", async (_, folderPath) => {
    electron.shell.showItemInFolder(folderPath);
  });
  electron.ipcMain.handle("file:load-scan", async (_, scanId) => {
    const { loadScanById } = await Promise.resolve().then(() => require("./chunks/scanRepository-DHGtEqjH.js"));
    return loadScanById(scanId);
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
    const { getReportsDir } = await Promise.resolve().then(() => require("./chunks/pathResolver-CbX9UHgB.js"));
    return getReportsDir();
  });
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
  mainWindow = createWindow();
  registerScanHandlers(mainWindow);
  registerFileHandlers();
  registerAppHandlers();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerScanHandlers(mainWindow);
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
