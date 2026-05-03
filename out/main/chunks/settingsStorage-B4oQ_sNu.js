"use strict";
const fs = require("fs-extra");
const index = require("../index.js");
const CURRENCY_CONFIG = {
  USD: { symbol: "$", multiplier: 1, label: "US Dollar (USD)" },
  GBP: { symbol: "£", multiplier: 0.79, label: "British Pound (GBP)" },
  EUR: { symbol: "€", multiplier: 0.92, label: "Euro (EUR)" },
  CAD: { symbol: "CA$", multiplier: 1.36, label: "Canadian Dollar (CAD)" },
  AUD: { symbol: "A$", multiplier: 1.53, label: "Australian Dollar (AUD)" }
};
const DEFAULT_SETTINGS = {
  agencyName: "",
  agencyLogoBase64: "",
  currency: "USD"
};
async function readSettings() {
  try {
    const p = index.getSettingsPath();
    if (!await fs.pathExists(p)) return { ...DEFAULT_SETTINGS };
    const stored = await fs.readJson(p);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
async function writeSettings(settings) {
  await fs.writeJson(index.getSettingsPath(), settings, { spaces: 2 });
}
async function mergeSettings(partial) {
  const current = await readSettings();
  const merged = { ...current, ...partial };
  await writeSettings(merged);
  return merged;
}
const settingsStorage = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  mergeSettings,
  readSettings,
  writeSettings
}, Symbol.toStringTag, { value: "Module" }));
exports.CURRENCY_CONFIG = CURRENCY_CONFIG;
exports.readSettings = readSettings;
exports.settingsStorage = settingsStorage;
