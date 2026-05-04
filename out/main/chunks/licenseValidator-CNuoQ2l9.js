"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const https = require("https");
const require$$2 = require("os");
const fs = require("fs-extra");
const index = require("../index.js");
require("electron");
require("path");
require("child_process");
require("events");
require("crypto");
require("tty");
require("util");
require("fs");
require("stream");
require("url");
require("zlib");
require("http");
async function readLicense() {
  try {
    const p = index.getLicensePath();
    if (!await fs.pathExists(p)) return null;
    return await fs.readJson(p);
  } catch {
    return null;
  }
}
async function writeLicense(license) {
  await fs.writeJson(index.getLicensePath(), license, { spaces: 2 });
}
async function deleteLicense() {
  try {
    await fs.remove(index.getLicensePath());
  } catch {
  }
}
const LS_HOST = "api.lemonsqueezy.com";
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1e3;
async function activateLicense(key) {
  const instanceName = `${require$$2.hostname()}-${require$$2.platform()}`;
  const trimmedKey = key.trim().toUpperCase();
  let body;
  try {
    body = await lsPost("/v1/licenses/activate", {
      license_key: trimmedKey,
      instance_name: instanceName
    });
  } catch (err) {
    return {
      success: false,
      error: `Could not reach activation server: ${err.message}`
    };
  }
  if (!body.activated) {
    const msg = body.error ?? "License activation failed. Check your key and try again.";
    return { success: false, error: msg };
  }
  const license = {
    key: body.license_key.key,
    instanceId: body.instance.id,
    instanceName,
    activatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastValidatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    email: body.meta?.customer_email,
    customerName: body.meta?.customer_name,
    productName: body.meta?.product_name,
    variantName: body.meta?.variant_name,
    status: "active"
  };
  await writeLicense(license);
  return { success: true, license };
}
async function checkLicense() {
  const stored = await readLicense();
  if (!stored) return { valid: false, license: null };
  try {
    const body = await lsPost("/v1/licenses/validate", {
      license_key: stored.key,
      instance_id: stored.instanceId
    });
    if (!body.valid) {
      await deleteLicense();
      return { valid: false, license: null };
    }
    const updated = {
      ...stored,
      lastValidatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "active"
    };
    await writeLicense(updated);
    return { valid: true, license: updated };
  } catch {
    const elapsed = Date.now() - new Date(stored.lastValidatedAt).getTime();
    const withinGrace = elapsed < OFFLINE_GRACE_MS;
    return {
      valid: withinGrace,
      license: withinGrace ? stored : null,
      offlineGrace: withinGrace
    };
  }
}
async function deactivateLicense() {
  const stored = await readLicense();
  if (stored) {
    lsPost("/v1/licenses/deactivate", {
      license_key: stored.key,
      instance_id: stored.instanceId
    }).catch(() => {
    });
  }
  await deleteLicense();
}
function lsPost(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: LS_HOST,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "Accept": "application/json"
        }
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from Lemon Squeezy (status ${res.statusCode})`));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(1e4, () => req.destroy(new Error("Lemon Squeezy request timed out")));
    req.write(body);
    req.end();
  });
}
exports.activateLicense = activateLicense;
exports.checkLicense = checkLicense;
exports.deactivateLicense = deactivateLicense;
