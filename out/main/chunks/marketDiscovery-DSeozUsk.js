"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const https = require("https");
const cheerio = require("cheerio/slim");
const fs = require("fs-extra");
const logger = require("./logger-DOTeCaxX.js");
const index = require("../index.js");
require("electron");
require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const cheerio__namespace = /* @__PURE__ */ _interopNamespaceDefault(cheerio);
function normalizeToDomain(raw) {
  if (!raw) return null;
  let input = raw.trim();
  if (input.startsWith("//")) input = `https:${input}`;
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  if (!hostname.includes(".")) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  return `https://${hostname}`;
}
const BLOCKED_DOMAINS = /* @__PURE__ */ new Set([
  // Review / directory sites
  "yelp.com",
  "angi.com",
  "homeadvisor.com",
  "angieslist.com",
  "thumbtack.com",
  "yellowpages.com",
  "superpages.com",
  "bbb.org",
  "porch.com",
  "fixr.com",
  "networx.com",
  "houzz.com",
  "hometalk.com",
  "expertise.com",
  "bark.com",
  "homeguide.com",
  "taskrabbit.com",
  "buildzoom.com",
  "homelight.com",
  "manta.com",
  "chamberofcommerce.com",
  "merchantcircle.com",
  "citysearch.com",
  // Ranking / "best of" list sites
  "threebestrated.com",
  "bestprosintown.com",
  "topratedlocal.com",
  "expertise.com",
  "upcity.com",
  "clutch.co",
  "sortlist.com",
  // Maps / navigation
  "mapquest.com",
  "maps.apple.com",
  // Social networks
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "nextdoor.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  // Search / information
  "google.com",
  "bing.com",
  "yahoo.com",
  "wikipedia.org",
  "wikidata.org",
  // Ads / tracking
  "doubleclick.net",
  "googleadservices.com",
  // Review aggregators
  "tripadvisor.com",
  "trustpilot.com",
  "sitejabber.com",
  "birdeyereviews.com",
  "glassdoor.com",
  "angieslist.com",
  // Marketplaces / lead-gen platforms
  "thumbtack.com",
  "taskrabbit.com",
  "takl.com",
  "handy.com",
  "amazon.com",
  // News / media
  "reddit.com",
  "bobvila.com",
  "thisoldhouse.com",
  "houselogic.com"
]);
function isBlockedDomain(domain) {
  const root = domain.replace(/^www\./i, "").toLowerCase();
  for (const blocked of BLOCKED_DOMAINS) {
    if (root === blocked || root.endsWith(`.${blocked}`)) return true;
  }
  return false;
}
const SOCIAL_DOMAINS = /* @__PURE__ */ new Set([
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "snapchat.com",
  "nextdoor.com",
  "threads.net"
]);
const DIRECTORY_DOMAIN_SUBSTRINGS = [
  "bestrated",
  "bestpros",
  "bestintown",
  "toprated",
  "topreview",
  "toplocal",
  "directory",
  "directories",
  "yellowpage",
  "superpages",
  "phonebook",
  "citysearch",
  "merchantcircle",
  "localpages",
  "localguide",
  "reviewsite",
  "ratingsite",
  "findabest",
  "findthebest",
  "expertise",
  "comparebest"
];
const DIRECTORY_TITLE_PATTERNS = [
  /^best\s+\d+/i,
  // "Best 10 Roofers in…"
  /\btop\s+\d+\b/i,
  // "Top 10 HVAC Companies"
  /\b\d+\s+best\b/i,
  // "10 Best Plumbers…"
  /\bbest\s+\w[\w\s]*\s+in\b/i,
  // "Best Plumbers in Phoenix"
  /\bnear\s+me\b/i,
  // "Plumbers Near Me"
  /\bdirectory\b/i,
  /\blistings?\b/i,
  /\brated\s+\w/i,
  // "Rated Contractors…"
  /\bcompare\s+\w/i,
  // "Compare Roofers"
  /\bfind\s+(a|the|local)\b/i,
  // "Find a Plumber"
  /\breviews?\s+&\s+ratings?\b/i,
  /\bpros?\s+in\b/i,
  // "Pros in Tucson"
  /\bclaim\s+this\s+business\b/i
];
const DIRECTORY_PATH_PATTERNS = [
  /\/best-[a-z]/i,
  // /best-plumbers-in-phoenix
  /\/top-\d/i,
  // /top-10-hvac
  /\/near-me\b/i,
  /\/directory\//i,
  /\/listings?\//i,
  /\/category\//i,
  /\/companies\//i,
  /\/business(?:es)?\//i,
  /\/roundup\//i,
  /\/providers?\//i,
  /\/find-[a-z]/i,
  // /find-a-plumber
  /\/compare\//i,
  /\/local\/[^/]+\/[^/]+/i,
  // /local/plumbers/phoenix — deep local path
  /\/search\?/i
  // search result pages (e.g. Yelp /search?find_desc=…)
];
function classifyCandidate(name, hostname, sourceUrl) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host.endsWith(".gov") || host.endsWith(".gov.au") || host.endsWith(".gov.uk") || host.endsWith(".mil")) {
    return { classification: "government", reason: "government domain" };
  }
  if (SOCIAL_DOMAINS.has(host) || [...SOCIAL_DOMAINS].some((s) => host.endsWith(`.${s}`))) {
    return { classification: "social", reason: `social network: ${host}` };
  }
  const domainHit = DIRECTORY_DOMAIN_SUBSTRINGS.find((kw) => host.includes(kw));
  if (domainHit) {
    return { classification: "directory", reason: `directory domain keyword: "${domainHit}"` };
  }
  const titleHit = DIRECTORY_TITLE_PATTERNS.find((re) => re.test(name));
  if (titleHit) {
    return { classification: "directory", reason: `directory title pattern matched: "${name}"` };
  }
  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname + new URL(sourceUrl).search;
      const pathHit = DIRECTORY_PATH_PATTERNS.find((re) => re.test(pathname));
      if (pathHit) {
        return { classification: "directory", reason: `directory URL path: ${pathname}` };
      }
    } catch {
    }
  }
  return { classification: "business", reason: "" };
}
const log$1 = logger.createLogger("filterCandidates");
function filterCandidates(discovered) {
  const scannable = [];
  const excluded = [];
  const seenDomains = /* @__PURE__ */ new Set();
  const validDomains = [];
  for (const biz of discovered) {
    if (!biz.domain) {
      excluded.push({ ...biz, rejectionReason: "no website" });
      continue;
    }
    const normalized = normalizeToDomain(biz.domain);
    if (!normalized) {
      log$1.warn(`filterCandidates: could not normalize "${biz.domain}" — excluding`);
      excluded.push({ ...biz, rejectionReason: "invalid domain" });
      continue;
    }
    const hostname = new URL(normalized).hostname;
    if (isBlockedDomain(hostname)) {
      log$1.warn(`filterCandidates: blocked domain "${hostname}" — excluding`);
      const reason2 = deriveBlocklistReason(hostname);
      excluded.push({ ...biz, domain: normalized, rejectionReason: reason2 });
      continue;
    }
    const { classification, reason } = classifyCandidate(biz.name, hostname, biz.sourceUrl);
    if (classification !== "business") {
      log$1.warn(`filterCandidates: classifier rejected "${hostname}" as ${classification} — ${reason}`);
      const label = classificationLabel(classification);
      excluded.push({
        ...biz,
        domain: normalized,
        classification,
        rejectionReason: `rejected: ${label}${reason ? ` (${reason})` : ""}`
      });
      continue;
    }
    if (seenDomains.has(normalized)) {
      log$1.warn(`filterCandidates: duplicate domain "${hostname}" — deduped`);
      continue;
    }
    seenDomains.add(normalized);
    validDomains.push(normalized);
    scannable.push({ ...biz, domain: normalized, classification: "business" });
  }
  const deduped = discovered.length - scannable.length - excluded.length;
  log$1.info(
    `filterCandidates: ${scannable.length} scannable, ${excluded.length} excluded` + (deduped > 0 ? `, ${deduped} deduped` : "")
  );
  return { scannable, excluded, validDomains };
}
function classificationLabel(c) {
  switch (c) {
    case "directory":
      return "directory";
    case "social":
      return "social";
    case "government":
      return "government";
    case "marketplace":
      return "marketplace";
    default:
      return c;
  }
}
function deriveBlocklistReason(hostname) {
  const social = [
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "tiktok.com",
    "youtube.com",
    "pinterest.com",
    "snapchat.com",
    "nextdoor.com"
  ];
  if (social.some((s) => hostname === s || hostname.endsWith(`.${s}`))) {
    return "rejected: social";
  }
  return "rejected: directory";
}
const log = logger.createLogger("marketDiscovery");
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0";
async function runMarketDiscovery(request) {
  const discoveryId = `discovery_${Date.now()}`;
  const discoveredAt = (/* @__PURE__ */ new Date()).toISOString();
  log.info(`Market discovery starting: "${request.industry} ${request.location}"`);
  let raw = [];
  try {
    const query = `${request.industry} ${request.location}`;
    const html = await fetchDdgLite(query);
    raw = parseDdgResults(html, request.maxResults);
    log.info(`Parsed ${raw.length} raw results from DuckDuckGo`);
  } catch (err) {
    log.warn(`Discovery search failed: ${err.message}`);
    return buildResult(discoveryId, discoveredAt, request, [], []);
  }
  const { scannable, excluded, validDomains } = filterCandidates(raw);
  const discovered = [...scannable, ...excluded];
  const result = buildResult(discoveryId, discoveredAt, request, discovered, validDomains);
  await saveDiscoveryResult(result);
  log.info(
    `Discovery complete: ${scannable.length} scannable, ${excluded.length} excluded, discoveryId=${discoveryId}`
  );
  return result;
}
function buildResult(discoveryId, discoveredAt, request, discovered, validDomains) {
  return { discoveryId, request, discoveredAt, discovered, validDomains };
}
function fetchDdgLite(query) {
  return new Promise((resolve, reject) => {
    const body = `q=${encodeURIComponent(query)}&kl=us-en`;
    const options = {
      hostname: "lite.duckduckgo.com",
      path: "/lite/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": DDG_LITE_URL
      }
    };
    const req = https.request(options, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchDdgLiteGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (!data.trim()) {
          reject(new Error(`DDG Lite returned empty response (status ${res.statusCode})`));
        } else {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15e3, () => {
      req.destroy(new Error("DDG Lite request timed out after 15s"));
    });
    req.write(body);
    req.end();
  });
}
function fetchDdgLiteGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(15e3, () => req.destroy(new Error("DDG Lite GET timed out")));
    req.end();
  });
}
function parseDdgResults(html, maxResults) {
  const $ = cheerio__namespace.load(html);
  const results = [];
  $("td.result-link a").each((_, el) => {
    if (results.length >= maxResults) return;
    const title = $(el).text().trim();
    const href = $(el).attr("href") ?? "";
    if (!title || !href) return;
    if (href.startsWith("/") || href.includes("duckduckgo.com")) return;
    const domain = normalizeToDomain(href);
    results.push({
      name: title,
      domain: domain ?? void 0,
      sourceUrl: href,
      source: "duckduckgo",
      rankingPosition: results.length + 1,
      hasWebsite: domain !== null
    });
  });
  if (results.length === 0) {
    $('table a[href^="http"]').each((_, el) => {
      if (results.length >= maxResults) return;
      const title = $(el).text().trim();
      const href = $(el).attr("href") ?? "";
      if (!title || !href || href.includes("duckduckgo.com")) return;
      const domain = normalizeToDomain(href);
      results.push({
        name: title,
        domain: domain ?? void 0,
        sourceUrl: href,
        source: "duckduckgo",
        rankingPosition: results.length + 1,
        hasWebsite: domain !== null
      });
    });
  }
  return results;
}
async function saveDiscoveryResult(result) {
  try {
    const p = index.getDiscoveryPath(result.discoveryId);
    await fs.ensureDir(index.getDiscoveryDir());
    await fs.writeJson(p, result, { spaces: 2 });
    log.info(`Discovery result saved: ${p}`);
  } catch (err) {
    log.warn(`Failed to save discovery result: ${err.message}`);
  }
}
exports.runMarketDiscovery = runMarketDiscovery;
