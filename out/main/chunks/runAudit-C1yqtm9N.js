"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const pathResolver = require("./pathResolver-CbX9UHgB.js");
const logger = require("./logger-DOTeCaxX.js");
const cheerio = require("cheerio");
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
function normalizeInputUrl(raw) {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL: "${raw}"`);
  }
}
function getDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function isSameDomain(a, b) {
  return getDomain(a) === getDomain(b);
}
function isHttps(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
function resolveUrl(href, base) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("#")) {
    return null;
  }
  try {
    const resolved = new URL(href, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}
const TRACKING_PARAMS = /* @__PURE__ */ new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
  "source",
  "_ga"
]);
function stripTrackingParams(url) {
  try {
    const parsed = new URL(url);
    TRACKING_PARAMS.forEach((p) => parsed.searchParams.delete(p));
    return parsed.href;
  } catch {
    return url;
  }
}
const log$4 = logger.createLogger("robots");
const FETCH_TIMEOUT_MS$1 = 1e4;
async function fetchRobots(siteUrl) {
  let robotsUrl;
  try {
    const parsed = new URL(siteUrl);
    robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
  } catch {
    return emptyResult();
  }
  try {
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS$1),
      headers: { "User-Agent": "LocalSEOScanner/1.0" }
    });
    if (!response.ok) {
      log$4.info(`robots.txt not found at ${robotsUrl} (${response.status})`);
      return emptyResult();
    }
    const text = await response.text();
    const result = parseRobots(text);
    log$4.info(
      `robots.txt found: disallowed=${result.disallowedPaths.length}, sitemaps=${result.sitemapUrls.length}`
    );
    return result;
  } catch (err) {
    log$4.warn(`Failed to fetch robots.txt: ${err.message}`);
    return emptyResult();
  }
}
function parseRobots(text) {
  const lines = text.split("\n").map((l) => l.split("#")[0].trim()).filter(Boolean);
  const disallowedPaths = [];
  const sitemapUrls = [];
  let allowsGooglebot = true;
  let currentScope = "other";
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (key === "user-agent") {
      const agent = value.toLowerCase();
      if (agent === "*") currentScope = "all";
      else if (agent === "googlebot") currentScope = "googlebot";
      else currentScope = "other";
      continue;
    }
    if (key === "sitemap" && value.startsWith("http")) {
      sitemapUrls.push(value);
      continue;
    }
    if (key === "disallow" && (currentScope === "all" || currentScope === "googlebot")) {
      if (value === "/") {
        allowsGooglebot = false;
      }
      if (value) {
        disallowedPaths.push(value);
      }
    }
  }
  return {
    found: true,
    disallowedPaths: [...new Set(disallowedPaths)],
    sitemapUrls: [...new Set(sitemapUrls)],
    allowsGooglebot
  };
}
function emptyResult() {
  return { found: false, disallowedPaths: [], sitemapUrls: [], allowsGooglebot: true };
}
const log$3 = logger.createLogger("sitemap");
const FETCH_TIMEOUT_MS = 1e4;
const CANDIDATE_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap.php",
  "/wp-sitemap.xml",
  "/sitemap-index.xml"
];
async function fetchSitemap(siteUrl, robotsSitemapUrls = []) {
  let base;
  try {
    const parsed = new URL(siteUrl);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return { found: false, urls: [] };
  }
  const candidates = [
    ...robotsSitemapUrls,
    ...CANDIDATE_PATHS.map((p) => `${base}${p}`)
  ];
  for (const url of candidates) {
    try {
      const result = await trySitemap(url);
      if (result.found) return result;
    } catch {
    }
  }
  log$3.info("No sitemap found");
  return { found: false, urls: [] };
}
async function trySitemap(sitemapUrl) {
  const response = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "LocalSEOScanner/1.0" }
  });
  if (!response.ok) return { found: false, urls: [] };
  const text = await response.text();
  if (!text.trim().startsWith("<")) return { found: false, urls: [] };
  const urls = parseSitemapXml(text);
  log$3.info(`Sitemap found at ${sitemapUrl}: ${urls.length} URLs`);
  return { found: true, urls, sitemapUrl };
}
function parseSitemapXml(xml) {
  const $ = cheerio__namespace.load(xml, { xmlMode: true });
  const urls = [];
  $("urlset url loc, url loc").each((_, el) => {
    const url = $(el).text().trim();
    if (url.startsWith("http")) urls.push(url);
  });
  if (urls.length === 0) {
    $("sitemapindex sitemap loc, sitemap loc").each((_, el) => {
      const url = $(el).text().trim();
      if (url.startsWith("http")) urls.push(url);
    });
  }
  return [...new Set(urls)];
}
const log$2 = logger.createLogger("fetchHtml");
const PAGE_TIMEOUT_MS = 3e4;
async function fetchHtml(url, context) {
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      timeout: PAGE_TIMEOUT_MS,
      waitUntil: "domcontentloaded"
    });
    const statusCode = response?.status() ?? 0;
    const finalUrl = page.url();
    const html = await page.content();
    log$2.info(`Fetched ${url} → ${finalUrl} [${statusCode}]`);
    return { requestedUrl: url, finalUrl, statusCode, html };
  } catch (err) {
    log$2.warn(`Failed to fetch ${url}: ${err.message}`);
    return { requestedUrl: url, finalUrl: url, statusCode: 0, html: "" };
  } finally {
    await page.close();
  }
}
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|mov|zip|doc|docx|xls|xlsx|ppt|pptx|exe|dmg|css|js|json|xml|woff|woff2|ttf|eot)$/i;
const SKIP_PATH_SEGMENTS = [
  "/wp-admin",
  "/wp-json",
  "/wp-login",
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/logout",
  "/register",
  "/signin",
  "/signup",
  "/admin",
  "/feed",
  "/rss",
  "?replytocom",
  "/tag/",
  "/author/",
  "/page/"
];
function normalizeCrawlerUrl(href, base) {
  const resolved = resolveUrl(href, base);
  if (!resolved) return null;
  const clean = stripTrackingParams(resolved);
  return clean;
}
function shouldSkipUrl(url) {
  const lower = url.toLowerCase();
  if (SKIP_EXTENSIONS.test(lower)) return true;
  for (const segment of SKIP_PATH_SEGMENTS) {
    if (lower.includes(segment)) return true;
  }
  return false;
}
const log$1 = logger.createLogger("discoverUrls");
const CRAWLER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LocalSEOScanner/1.0";
async function discoverUrls(startUrl, browser, maxPages, domain, onProgress) {
  const context = await browser.newContext({
    userAgent: CRAWLER_USER_AGENT,
    ignoreHTTPSErrors: true,
    // Disable media/font loading for speed
    extraHTTPHeaders: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }
  });
  const visited = /* @__PURE__ */ new Set();
  const queue = [startUrl];
  const fetchedPages = [];
  const internalLinkGraph = {};
  log$1.info(`Starting BFS crawl from ${startUrl} (maxPages=${maxPages}, domain=${domain})`);
  try {
    while (queue.length > 0 && fetchedPages.length < maxPages) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const result = await fetchHtml(url, context);
      if (result.statusCode === 0 && result.html === "") {
        log$1.warn(`Skipping failed fetch: ${url}`);
        continue;
      }
      if (result.html.trim() && !result.html.trim().startsWith("<")) {
        log$1.warn(`Skipping non-HTML response: ${url}`);
        continue;
      }
      fetchedPages.push(result);
      onProgress?.(fetchedPages.length, fetchedPages.length + queue.length);
      if (fetchedPages.length < maxPages && result.html) {
        const links = extractInternalLinks(result.html, result.finalUrl, domain);
        internalLinkGraph[result.finalUrl] = links;
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    }
  } finally {
    await context.close();
  }
  log$1.info(
    `Crawl complete: ${fetchedPages.length} pages fetched, ${Object.keys(internalLinkGraph).length} nodes in link graph`
  );
  return { fetchedPages, internalLinkGraph };
}
function extractInternalLinks(html, baseUrl, domain) {
  const $ = cheerio__namespace.load(html);
  const seen = /* @__PURE__ */ new Set();
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const normalized = normalizeCrawlerUrl(href, baseUrl);
    if (!normalized) return;
    if (!isSameDomain(normalized, `https://${domain}`)) return;
    if (shouldSkipUrl(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    links.push(normalized);
  });
  return links;
}
const PATH_RULES = [
  [/\/(contact|contact-us|reach-us|get-in-touch|find-us)/i, "contact"],
  [/\/(book|booking|appointments?|schedule|reserve|reservations?)/i, "booking"],
  [/\/(menu|food|drinks|cuisine|order-online|our-menu)/i, "menu"],
  [/\/(gallery|photos?|portfolio|our-work|projects?)/i, "gallery"],
  [/\/(about|about-us|our-story|our-team|who-we-are|company)/i, "about"],
  [/\/(locations?|areas?|cities|city|serve|coverage|service-area)/i, "location"],
  [/\/(services?|what-we-do|our-services|solutions?|offerings?)/i, "service"],
  [/\/(blog|news|articles?|posts?|updates?|resources?)/i, "blog"]
];
const HEADING_RULES = [
  [/book\s*(now|an?\s*appointment|online)|schedule\s*(an?\s*appointment|now)/i, "booking"],
  [/contact\s*us|get\s*in\s*touch|reach\s*us|call\s*us\s*today/i, "contact"],
  [/our\s*menu|view\s*(the\s*)?menu|food\s*&\s*drinks/i, "menu"],
  [/photo\s*gallery|our\s*(gallery|portfolio|work|projects?)/i, "gallery"],
  [/about\s*us|our\s*(story|team|company|mission|history)/i, "about"],
  [/service\s*area|areas?\s*we\s*serve|serving\s*(the\s*)?\w+/i, "location"],
  [/our\s*services?|what\s*we\s*(do|offer)|services?\s*(we\s*)?provide/i, "service"],
  [/latest\s*(news|posts?|articles?)|from\s*the\s*blog/i, "blog"]
];
function classifyPage(url, title, h1s, h2s) {
  let pathname;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return "other";
  }
  if (pathname === "/" || pathname === "") return "home";
  for (const [pattern, type] of PATH_RULES) {
    if (pattern.test(pathname)) return type;
  }
  const headingText = [...h1s, ...h2s, title].join(" ");
  for (const [pattern, type] of HEADING_RULES) {
    if (pattern.test(headingText)) return type;
  }
  return "other";
}
function extractMeta($) {
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  const robotsContent = [
    $('meta[name="robots"]').attr("content") ?? "",
    $('meta[name="googlebot"]').attr("content") ?? ""
  ].join(",").toLowerCase();
  const noindex = robotsContent.includes("noindex");
  return { title, metaDescription, canonical, noindex };
}
function extractHeadings($) {
  const h1s = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1s.push(text);
  });
  const h2s = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });
  return { h1s, h2s };
}
function extractSchema($) {
  const types = /* @__PURE__ */ new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? "";
    try {
      const parsed = JSON.parse(raw);
      collectTypes(parsed, types);
    } catch {
    }
  });
  $("[itemtype]").each((_, el) => {
    const itemtype = $(el).attr("itemtype") ?? "";
    const schemaType = itemtype.split("/").pop();
    if (schemaType) types.add(schemaType);
  });
  return { schemaTypes: [...types] };
}
function collectTypes(node, types) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => collectTypes(child, types));
    return;
  }
  const obj = node;
  if ("@type" in obj) {
    const t = obj["@type"];
    if (typeof t === "string") {
      types.add(normalizeType(t));
    } else if (Array.isArray(t)) {
      t.forEach((v) => {
        if (typeof v === "string") types.add(normalizeType(v));
      });
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      collectTypes(value, types);
    }
  }
}
function normalizeType(t) {
  return t.includes("/") ? t.split("/").pop() ?? t : t;
}
const PHONE_REGEX = /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const STREET_ADDRESS_REGEX = /\d{1,5}\s+[A-Z][a-zA-Z\s]{2,40}\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Way|Ct|Court|Ln|Lane|Pl|Place|Pkwy|Parkway|Hwy|Highway)\b/i;
function extractContactSignals($) {
  const phones = /* @__PURE__ */ new Set();
  const emails = /* @__PURE__ */ new Set();
  let hasAddress = false;
  $('a[href^="tel:"]').each((_, el) => {
    const raw = $(el).attr("href") ?? "";
    const digits = raw.replace("tel:", "").replace(/\s/g, "");
    if (digits) phones.add(digits);
  });
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = ($(el).attr("href") ?? "").replace("mailto:", "");
    const addr = raw.split("?")[0].trim().toLowerCase();
    if (addr && EMAIL_REGEX.test(addr)) emails.add(addr);
  });
  const schemaAddress = $('[itemprop="address"]').length > 0 || $('[itemprop="streetAddress"]').length > 0 || $('[typeof="PostalAddress"]').length > 0;
  const searchSelectors = ["main", "article", "section", ".contact", "#contact", "footer", "body"];
  let bodyText = "";
  for (const sel of searchSelectors) {
    const el = $(sel).first();
    if (el.length) {
      bodyText = el.text();
      break;
    }
  }
  const phoneMatches = bodyText.match(PHONE_REGEX) ?? [];
  phoneMatches.forEach((p) => phones.add(p.trim()));
  const emailMatches = bodyText.match(EMAIL_REGEX) ?? [];
  emailMatches.filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg")).forEach((e) => emails.add(e.toLowerCase()));
  hasAddress = schemaAddress || STREET_ADDRESS_REGEX.test(bodyText) || $("address").length > 0;
  return {
    phones: [...phones].slice(0, 10),
    // cap at 10 to avoid runaway matches
    emails: [...emails].slice(0, 10),
    hasAddress
  };
}
const DAYS_PATTERN = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s:.-]/i;
const TIME_PATTERN = /\b\d{1,2}(:\d{2})?\s*([ap]\.?m\.?|[AP]M)\b/i;
const HOURS_KEYWORDS = /\b(hours|open|closed|open\s+daily|24\s*hours|open\s+now)\b/i;
const US_STATES = /* @__PURE__ */ new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
]);
const STATE_ABBR_PATTERN = /,\s*([A-Z]{2})\b/g;
const STATE_FULL_PATTERN = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)\b/gi;
const SERVICE_AREA_PATTERN = /\b(serving|we\s+serve|service\s+area|areas?\s+we\s+serve|proudly\s+serving|serving\s+the|available\s+in|serving\s+all\s+of)\b/i;
const MAPS_HREF_PATTERN = /maps\.google\.|google\.com\/maps|goo\.gl\/maps|maps\.apple\.|bing\.com\/maps/i;
const MAPS_IFRAME_PATTERN = /maps\.google\.|google\.com\/maps/i;
function extractLocalSignals($) {
  let hasMap = false;
  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (MAPS_IFRAME_PATTERN.test(src)) hasMap = true;
  });
  if (!hasMap) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().toLowerCase();
      if (MAPS_HREF_PATTERN.test(href) || text.includes("directions") || text.includes("get directions")) {
        hasMap = true;
      }
    });
  }
  const bodyText = $("body").text();
  const hasHours = DAYS_PATTERN.test(bodyText) || HOURS_KEYWORDS.test(bodyText) && TIME_PATTERN.test(bodyText);
  const cityMentions = [];
  const stateMentions = /* @__PURE__ */ new Set();
  const abbrMatches = [...bodyText.matchAll(STATE_ABBR_PATTERN)];
  abbrMatches.forEach((m) => {
    const abbr = m[1].toUpperCase();
    if (US_STATES.has(abbr)) stateMentions.add(abbr);
  });
  const fullMatches = [...bodyText.matchAll(STATE_FULL_PATTERN)];
  fullMatches.forEach((m) => stateMentions.add(m[0].trim()));
  const titleText = $("title").text();
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const cityPattern = /([A-Z][a-zA-Z\s]{2,20}),\s*[A-Z]{2}\b/g;
  const citySearchText = `${titleText} ${metaDesc}`;
  const cityMatches = [...citySearchText.matchAll(cityPattern)];
  cityMatches.forEach((m) => {
    const city = m[1].trim();
    if (city.length > 2 && city.length < 30) cityMentions.push(city);
  });
  const hasServiceAreaText = SERVICE_AREA_PATTERN.test(bodyText);
  return {
    hasMap,
    hasHours,
    cityMentions: [...new Set(cityMentions)].slice(0, 10),
    stateMentions: [...stateMentions].slice(0, 5),
    hasServiceAreaText
  };
}
const CTA_PATTERNS = [
  /call\s*(us|now|today)/i,
  /book\s*(now|online|an?\s*appointment|a\s*table|today)/i,
  /schedule\s*(an?\s*appointment|now|online|today|a\s*(call|consultation))/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate|consultation|inspection)/i,
  /request\s*(a\s*)?(quote|estimate|callback|appointment|consultation)/i,
  /contact\s*us/i,
  /order\s*(now|online|today)/i,
  /reserve\s*(a\s*(table|spot)|now|online)/i,
  /free\s*(estimate|inspection|consultation|quote|assessment)/i,
  /get\s*started/i,
  /claim\s*(your\s*)?(offer|discount|deal)/i,
  /speak\s*(with|to)\s*(an?\s*)?(expert|specialist|agent|us)/i,
  /send\s*(us\s*)?a\s*message/i,
  /directions/i
];
const CTA_SELECTORS = [
  "a[href]",
  "button",
  '[role="button"]',
  'input[type="submit"]',
  'input[type="button"]'
];
function extractCTAs($) {
  const ctaTexts = /* @__PURE__ */ new Set();
  CTA_SELECTORS.forEach((selector) => {
    $(selector).each((_, el) => {
      const rawText = $(el).attr("value") ?? $(el).attr("aria-label") ?? $(el).text();
      const text = rawText.trim();
      if (!text || text.length > 80) return;
      if (CTA_PATTERNS.some((pattern) => pattern.test(text))) {
        ctaTexts.add(text);
      }
    });
  });
  let hasForm = false;
  $("form").each((_, formEl) => {
    const inputCount = $(formEl).find('input:not([type="hidden"]):not([type="search"])').length;
    const textareaCount = $(formEl).find("textarea").length;
    if (inputCount > 1 || textareaCount > 0) {
      hasForm = true;
    }
  });
  return {
    ctaTexts: [...ctaTexts].slice(0, 20),
    hasForm
  };
}
const TESTIMONIAL_SELECTORS = [
  '[class*="testimonial"]',
  '[class*="review"]',
  '[class*="rating"]',
  '[class*="feedback"]',
  '[id*="testimonial"]',
  '[id*="review"]',
  '[itemtype*="Review"]',
  '[itemscope][itemtype*="Review"]',
  "blockquote"
];
const STAR_SELECTORS = [
  '[class*="star"]',
  '[class*="stars"]',
  '[aria-label*="star"]',
  '[aria-label*="rating"]'
];
const TRUST_KEYWORDS = [
  /\blicensed\b/i,
  /\binsured\b/i,
  /\bbonded\b/i,
  /\bcertified\b/i,
  /\baccredited\b/i,
  /\bBBB\b/,
  // Better Business Bureau
  /\bA\+\s*rated\b/i,
  /\byears?\s+(of\s+)?(experience|in\s+business|serving)\b/i,
  /\bsince\s+1[89]\d{2}\b/i,
  // "since 1987" — established business
  /\bfamily[\s-]owned\b/i,
  /\bsatisfaction\s+guarantee\b/i,
  /\bmoney[\s-]back\b/i,
  /\bwarranty\b/i,
  /\bguarantee\b/i,
  /\b5[\s-]star\b/i,
  /\baward[\s-]winning\b/i,
  /\btop[\s-]rated\b/i,
  /\bhighly\s+recommended\b/i
];
function extractTrustSignals($) {
  let testimonialCount = 0;
  TESTIMONIAL_SELECTORS.forEach((selector) => {
    try {
      testimonialCount += $(selector).length;
    } catch {
    }
  });
  let starCount = 0;
  STAR_SELECTORS.forEach((selector) => {
    try {
      starCount += $(selector).length;
    } catch {
    }
  });
  const bodyText = $("body").text();
  const hasTrustKeyword = TRUST_KEYWORDS.some((pattern) => pattern.test(bodyText));
  const hasTrustSignals = testimonialCount > 0 || starCount > 0 || hasTrustKeyword;
  return {
    hasTrustSignals,
    // Cap count to avoid inflated numbers from CSS-class-heavy sites
    testimonialCount: Math.min(testimonialCount + starCount, 50)
  };
}
function extractImages($) {
  let imageCount = 0;
  let missingAltCount = 0;
  $("img").each((_, el) => {
    imageCount++;
    const alt = $(el).attr("alt");
    if (alt === void 0 || alt.trim() === "") {
      missingAltCount++;
    }
  });
  return { imageCount, missingAltCount };
}
function extractTextStats($) {
  const $clone = $.root().clone();
  $clone.find('script, style, noscript, [hidden], [aria-hidden="true"]').remove();
  const rawText = $clone.find("body").text();
  const textContent = rawText.replace(/\s+/g, " ").trim();
  const wordCount = textContent ? textContent.split(/\s+/).length : 0;
  return { textContent, wordCount };
}
function extractAllSignals(html, pageUrl) {
  if (!html) return emptySignals();
  const $ = cheerio__namespace.load(html);
  const meta = extractMeta($);
  const headings = extractHeadings($);
  const schema = extractSchema($);
  const contact = extractContactSignals($);
  const local = extractLocalSignals($);
  const ctas = extractCTAs($);
  const trust = extractTrustSignals($);
  const images = extractImages($);
  const textStats = extractTextStats($);
  return {
    // Meta
    title: meta.title,
    metaDescription: meta.metaDescription,
    canonical: meta.canonical,
    noindex: meta.noindex,
    // Headings
    h1s: headings.h1s,
    h2s: headings.h2s,
    // Schema
    schemaTypes: schema.schemaTypes,
    // Contact
    phones: contact.phones,
    emails: contact.emails,
    hasAddress: contact.hasAddress,
    // Local
    hasMap: local.hasMap,
    hasHours: local.hasHours,
    // CTAs
    ctaTexts: ctas.ctaTexts,
    hasForm: ctas.hasForm,
    // Trust
    hasTrustSignals: trust.hasTrustSignals,
    testimonialCount: trust.testimonialCount,
    // Images
    imageCount: images.imageCount,
    missingAltCount: images.missingAltCount,
    // Text
    textContent: textStats.textContent,
    wordCount: textStats.wordCount
  };
}
function emptySignals() {
  return {
    title: "",
    metaDescription: "",
    canonical: "",
    noindex: false,
    h1s: [],
    h2s: [],
    schemaTypes: [],
    phones: [],
    emails: [],
    hasAddress: false,
    hasMap: false,
    hasHours: false,
    ctaTexts: [],
    hasForm: false,
    hasTrustSignals: false,
    testimonialCount: 0,
    imageCount: 0,
    missingAltCount: 0,
    textContent: "",
    wordCount: 0
  };
}
const RULES = [
  {
    pattern: /\b(restaurant|menu|dining|cuisine|cafe|bistro|diner|eatery|food|pizza|sushi|burger|steak|seafood|takeout|takeaway|delivery)\b/i,
    type: "restaurant"
  },
  {
    pattern: /\b(salon|hair\s*(salon|studio|cut)|nail\s*(salon|studio)|spa|beauty\s*(salon|studio)|barber|stylist|wax|lash|brow|blowout)\b/i,
    type: "salon"
  },
  {
    pattern: /\b(roofer|roofing|roof\s*(repair|replacement|installation)|shingles|gutters|siding|metal\s*roof|flat\s*roof)\b/i,
    type: "roofer"
  },
  {
    pattern: /\b(auto\s*(repair|shop|service|mechanic)|car\s*(repair|service|mechanic)|oil\s*change|tire\s*(shop|service)|transmission|brake\s*(service|repair))\b/i,
    type: "auto_shop"
  },
  {
    pattern: /\b(contractor|construction|remodel|renovation|home\s*(improvement|remodel)|general\s*contractor|handyman|plumber|plumbing|electrician|hvac|landscap)\b/i,
    type: "contractor"
  },
  {
    pattern: /\b(dental|dentist|tooth|teeth|orthodont|implant|crown|braces|invisalign|cosmetic\s*dentistry|oral\s*(health|care|surgery))\b/i,
    type: "dentist"
  }
];
function detectBusinessType(pages, requested) {
  if (requested !== "auto") return requested;
  const signals = buildSignalCorpus(pages);
  for (const { pattern, type } of RULES) {
    if (pattern.test(signals)) return type;
  }
  return "other";
}
function buildSignalCorpus(pages) {
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const parts = [];
  if (home) {
    parts.push(home.title ?? "", ...home.h1s, home.url);
    parts.push(home.title ?? "", ...home.h1s);
  }
  for (const page of pages) {
    parts.push(page.title ?? "", ...page.h1s);
    parts.push(page.url);
  }
  if (home?.textContent) {
    parts.push(home.textContent.slice(0, 1e3));
  }
  return parts.join(" ");
}
function homepage(pages) {
  return pages.find((p) => p.pageType === "home") ?? pages[0];
}
function pagesByType(pages, ...types) {
  return pages.filter((p) => types.includes(p.pageType));
}
function importantPages(pages) {
  return pagesByType(pages, "home", "contact", "service", "location");
}
const TITLE_MIN = 20;
const TITLE_MAX = 70;
const DESC_MIN = 50;
const DESC_MAX = 160;
const ALT_POOR_THRESHOLD = 0.3;
function analyzeTechnical(input) {
  const { pages, domain, robotsFound, sitemapFound } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  if (!robotsFound) {
    findings.push({
      id: "technical-no-robots",
      category: "technical",
      severity: "low",
      title: "No robots.txt file found",
      summary: `${domain} is missing a robots.txt file.`,
      whyItMatters: "robots.txt guides search engine crawlers. Its absence is a minor signal but indicates incomplete technical setup. A Sitemap: directive inside robots.txt also speeds up indexing.",
      recommendation: "Create a robots.txt at the site root. At minimum include: `Sitemap: https://yourdomain.com/sitemap.xml`"
    });
  }
  if (!sitemapFound) {
    findings.push({
      id: "technical-no-sitemap",
      category: "technical",
      severity: "medium",
      title: "No XML sitemap found",
      summary: `No sitemap.xml was detected for ${domain}.`,
      whyItMatters: "A sitemap helps Google discover every page on your site. Without one, service pages and location pages may never be indexed.",
      recommendation: "Generate and submit an XML sitemap. Most CMS platforms have built-in options: WordPress (Yoast/RankMath), Squarespace, and Wix all auto-generate sitemaps."
    });
  }
  const broken = pages.filter((p) => p.statusCode >= 400);
  if (broken.length > 0) {
    findings.push({
      id: "technical-broken-pages",
      category: "technical",
      severity: broken.length > 3 ? "high" : "medium",
      title: `${broken.length} broken page${broken.length > 1 ? "s" : ""} (4xx/5xx)`,
      summary: `${broken.length} URL(s) returned error status codes during the crawl.`,
      whyItMatters: "Broken pages hurt crawl budget, lose any inbound link equity, and instantly damage trust when visitors land on them.",
      recommendation: "Fix or 301-redirect all broken URLs. Check for typos in internal links. Use Google Search Console to identify any externally-linked broken pages.",
      affectedUrls: broken.map((p) => p.url)
    });
  }
  const noindexed = pages.filter(
    (p) => p.noindex && ["service", "location", "contact"].includes(p.pageType)
  );
  if (noindexed.length > 0) {
    findings.push({
      id: "technical-noindex-money-pages",
      category: "technical",
      severity: "high",
      title: `${noindexed.length} money page${noindexed.length > 1 ? "s" : ""} blocked from Google`,
      summary: `${noindexed.length} service/location/contact page(s) have a noindex directive.`,
      whyItMatters: "These pages are completely invisible to Google. If no one can find your service pages, you lose every organic lead they would have generated.",
      recommendation: "Remove the noindex meta tag from these pages immediately. Check both the HTML meta tag and any X-Robots-Tag HTTP headers.",
      affectedUrls: noindexed.map((p) => p.url)
    });
  }
  const noTitle = keyPages.filter((p) => !p.title || p.title.trim() === "");
  if (noTitle.length > 0) {
    findings.push({
      id: "technical-missing-title",
      category: "technical",
      severity: "high",
      title: `${noTitle.length} key page${noTitle.length > 1 ? "s" : ""} missing a title tag`,
      summary: `${noTitle.length} important page(s) have no <title> tag.`,
      whyItMatters: "The title tag is one of the strongest on-page SEO signals. Pages without titles are effectively invisible in search results and receive no ranking credit.",
      recommendation: 'Add a descriptive title to every page. Format: "Primary Keyword | Business Name | City, State". Keep it under 60 characters.',
      affectedUrls: noTitle.map((p) => p.url)
    });
  }
  const shortTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > 0 && p.title.trim().length < TITLE_MIN
  );
  if (shortTitle.length > 0) {
    findings.push({
      id: "technical-short-title",
      category: "technical",
      severity: "low",
      title: `${shortTitle.length} page${shortTitle.length > 1 ? "s" : ""} with very short title tags`,
      summary: `${shortTitle.length} page(s) have titles under ${TITLE_MIN} characters.`,
      whyItMatters: "Short titles miss the opportunity to include your city, service, and business name — all signals that help Google understand what you do and where.",
      recommendation: `Expand these titles to ${TITLE_MIN}–${TITLE_MAX} characters. Include the primary service, city/state, and brand name.`,
      affectedUrls: shortTitle.map((p) => p.url)
    });
  }
  const longTitle = keyPages.filter(
    (p) => p.title && p.title.trim().length > TITLE_MAX
  );
  if (longTitle.length > 0) {
    findings.push({
      id: "technical-long-title",
      category: "technical",
      severity: "low",
      title: `${longTitle.length} page${longTitle.length > 1 ? "s" : ""} with titles that will be truncated in search`,
      summary: `${longTitle.length} page(s) have titles over ${TITLE_MAX} characters.`,
      whyItMatters: "Google truncates titles longer than ~60–70 characters in search results, cutting off important keywords or your brand name.",
      recommendation: `Shorten these titles to under ${TITLE_MAX} characters. Lead with the most important keyword.`,
      affectedUrls: longTitle.map((p) => p.url)
    });
  }
  const noDesc = keyPages.filter((p) => !p.metaDescription || p.metaDescription.trim() === "");
  if (noDesc.length > 0) {
    findings.push({
      id: "technical-missing-meta-desc",
      category: "technical",
      severity: "medium",
      title: `${noDesc.length} key page${noDesc.length > 1 ? "s" : ""} missing meta descriptions`,
      summary: `${noDesc.length} important page(s) have no meta description.`,
      whyItMatters: "Without a meta description, Google auto-generates one — often pulling an irrelevant sentence. A well-written description directly impacts click-through rates from search results.",
      recommendation: `Write a ${DESC_MIN}–${DESC_MAX} character meta description for each page. Include a CTA: "Call us for a free estimate today."`,
      affectedUrls: noDesc.map((p) => p.url)
    });
  }
  const noH1 = pages.filter((p) => p.h1s.length === 0);
  if (noH1.length > 0) {
    findings.push({
      id: "technical-missing-h1",
      category: "technical",
      severity: "medium",
      title: `${noH1.length} page${noH1.length > 1 ? "s" : ""} missing an H1 heading`,
      summary: `${noH1.length} page(s) have no H1 tag.`,
      whyItMatters: "The H1 is the primary on-page heading — it tells both Google and visitors what the page is about. Pages without an H1 miss a key ranking signal.",
      recommendation: 'Add a single, descriptive H1 to each page. For a service page it should name the service and ideally the location: "Roof Replacement in Austin, TX".',
      affectedUrls: noH1.map((p) => p.url)
    });
  }
  const multiH1 = pages.filter((p) => p.h1s.length > 1);
  if (multiH1.length > 0) {
    findings.push({
      id: "technical-multiple-h1",
      category: "technical",
      severity: "low",
      title: `${multiH1.length} page${multiH1.length > 1 ? "s" : ""} with multiple H1 headings`,
      summary: `${multiH1.length} page(s) have more than one H1 tag.`,
      whyItMatters: "Multiple H1s dilute the page's topical focus signal. Google prefers one clear H1 per page.",
      recommendation: "Keep exactly one H1 per page. Downgrade additional H1s to H2 or H3.",
      affectedUrls: multiH1.map((p) => p.url)
    });
  }
  const noCanonical = keyPages.filter((p) => !p.canonical || p.canonical.trim() === "");
  if (noCanonical.length > 0) {
    findings.push({
      id: "technical-missing-canonical",
      category: "technical",
      severity: "low",
      title: `${noCanonical.length} key page${noCanonical.length > 1 ? "s" : ""} missing canonical tags`,
      summary: `${noCanonical.length} important page(s) have no canonical link element.`,
      whyItMatters: "Canonical tags prevent duplicate content issues (e.g., http vs https, trailing slash variants). Without them, link equity can be split across URL variations.",
      recommendation: 'Add a self-referencing canonical tag to every page: `<link rel="canonical" href="https://yourdomain.com/page/" />`',
      affectedUrls: noCanonical.map((p) => p.url)
    });
  }
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0);
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0);
  if (totalImages > 0) {
    const missingRatio = missingAlt / totalImages;
    if (missingRatio > ALT_POOR_THRESHOLD) {
      const pct = Math.round(missingRatio * 100);
      findings.push({
        id: "technical-poor-image-alt",
        category: "technical",
        severity: missingRatio > 0.6 ? "medium" : "low",
        title: `${pct}% of images are missing alt text`,
        summary: `${missingAlt} of ${totalImages} images across the site have no alt attribute.`,
        whyItMatters: "Alt text helps Google understand image content — contributing to Google Image Search visibility and overall page relevance. It's also an accessibility requirement (ADA).",
        recommendation: 'Add descriptive alt text to all images. For local businesses: include the service and location in alt text for hero images (e.g., "roof replacement Austin TX").'
      });
    }
  }
  if (home) {
    notes.push(`Homepage: "${home.title ?? "no title"}" | H1s: ${home.h1s.length} | Words: ${home.wordCount ?? 0}`);
  }
  notes.push(
    `Pages scanned: ${pages.length} | Key pages: ${keyPages.length} | Broken: ${broken.length}`,
    `Robots: ${robotsFound ? "found" : "missing"} | Sitemap: ${sitemapFound ? "found" : "missing"}`,
    `Images: ${totalImages} total, ${missingAlt} missing alt (${totalImages > 0 ? Math.round(missingAlt / totalImages * 100) : 0}%)`
  );
  return { findings, notes };
}
function analyzeLocalSeo(input) {
  const { pages, domain } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  const contactPages = pagesByType(pages, "contact");
  if (home && home.phones.length === 0) {
    findings.push({
      id: "local-no-phone-homepage",
      category: "local",
      severity: "high",
      title: "No phone number found on homepage",
      summary: `The homepage for ${domain} has no detectable phone number.`,
      whyItMatters: "Google uses phone number presence as a local relevance signal. More importantly, visitors who arrive via local search expect to see a phone number immediately — especially on mobile.",
      recommendation: 'Add a click-to-call phone number in the site header and prominently on the homepage. Use a tel: href: `<a href="tel:+15555551234">(555) 555-1234</a>`'
    });
  }
  const contactWithNoPhone = contactPages.filter((p) => p.phones.length === 0);
  if (contactPages.length > 0 && contactWithNoPhone.length > 0) {
    findings.push({
      id: "local-no-phone-contact",
      category: "local",
      severity: "high",
      title: "Contact page missing phone number",
      summary: "The contact page has no visible phone number.",
      whyItMatters: "When a prospect visits your contact page they are ready to act. Missing a phone number at this moment is a direct lead loss.",
      recommendation: "Place the phone number at the top of the contact page in large, tap-friendly text with a tel: link.",
      affectedUrls: contactWithNoPhone.map((p) => p.url)
    });
  }
  if (home && !home.hasAddress) {
    findings.push({
      id: "local-no-address-homepage",
      category: "local",
      severity: "medium",
      title: "No physical address detected on homepage",
      summary: `${domain} homepage does not appear to display a business address.`,
      whyItMatters: "NAP (Name, Address, Phone) consistency is a core local SEO signal. Google uses address presence to confirm local relevance and to match you with map listings.",
      recommendation: "Display your full business address in the site footer and on the homepage. Mark it up with LocalBusiness schema for extra credit."
    });
  }
  const hasLocalBusinessSchema = pages.some(
    (p) => p.schemaTypes.some(
      (t) => [
        "LocalBusiness",
        "ProfessionalService",
        "HomeAndConstructionBusiness",
        "FoodEstablishment",
        "HealthAndBeautyBusiness",
        "MedicalOrganization",
        "AutoRepair",
        "Restaurant"
      ].includes(t)
    )
  );
  if (!hasLocalBusinessSchema) {
    findings.push({
      id: "local-no-localbusiness-schema",
      category: "local",
      severity: "high",
      title: "No LocalBusiness structured data found",
      summary: "The site has no LocalBusiness (or equivalent) JSON-LD schema markup.",
      whyItMatters: 'LocalBusiness schema is how you formally tell Google: "This is a local business, here is our address, phone, hours, and category." It directly powers your Google Business Profile integration and Knowledge Panel data.',
      recommendation: "Add a LocalBusiness JSON-LD block to the homepage. Include: name, address, phone, url, openingHours, and geo coordinates. Use schema.org/LocalBusiness as the base type and a more specific subtype if applicable."
    });
  }
  const hasAnyMap = pages.some((p) => p.hasMap);
  if (!hasAnyMap) {
    findings.push({
      id: "local-no-map",
      category: "local",
      severity: "medium",
      title: "No map embed or directions link found",
      summary: 'No Google Maps embed or "Get Directions" link was detected anywhere on the site.',
      whyItMatters: "A map embed reinforces physical location signals, helps mobile users get directions instantly, and contributes to local relevance signals for Google.",
      recommendation: 'Embed a Google Maps iframe on the contact page. Also add a "Get Directions" button linked to your Google Maps listing.'
    });
  }
  const hasAnyHours = pages.some((p) => p.hasHours);
  if (!hasAnyHours) {
    findings.push({
      id: "local-no-hours",
      category: "local",
      severity: "medium",
      title: "No business hours found on the site",
      summary: "No business hours information was detected across all scanned pages.",
      whyItMatters: "Hours are a core conversion signal — users need to know if you're open before they call. Google also uses hours from your site to cross-validate Google Business Profile data.",
      recommendation: "Display your hours on the homepage, contact page, and in the footer. Add `openingHoursSpecification` to your LocalBusiness schema."
    });
  }
  const locationPages = pagesByType(pages, "location");
  if (pages.length >= 5 && locationPages.length === 0) {
    findings.push({
      id: "local-no-location-pages",
      category: "local",
      severity: "medium",
      title: "No location or service-area pages found",
      summary: "The site appears to have no pages targeting specific cities or service areas.",
      whyItMatters: 'Without location-specific pages, the site cannot rank for "[service] in [city]" searches. These are the highest-value local SEO searches for most service businesses.',
      recommendation: 'Create dedicated pages for each primary service area (e.g., "/plumber-austin-tx/"). Each page should mention the city prominently and include NAP for that location.'
    });
  }
  const phonePagesCount = keyPages.filter((p) => p.phones.length > 0).length;
  notes.push(
    `LocalBusiness schema: ${hasLocalBusinessSchema ? "found" : "missing"}`,
    `Map present: ${hasAnyMap ? "yes" : "no"} | Hours present: ${hasAnyHours ? "yes" : "no"}`,
    `Phone on key pages: ${phonePagesCount}/${keyPages.length} | Location pages: ${locationPages.length}`
  );
  return { findings, notes };
}
const MIN_CTA_COVERAGE = 0.5;
const BOOKING_PATTERNS$1 = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i
];
function analyzeConversion(input) {
  const { pages } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const keyPages = importantPages(pages);
  const contactPages = pagesByType(pages, "contact");
  if (home && home.ctaTexts.length === 0) {
    findings.push({
      id: "conversion-no-cta-homepage",
      category: "conversion",
      severity: "high",
      title: "Homepage has no clear call-to-action",
      summary: "No CTA buttons or action links were detected on the homepage.",
      whyItMatters: "The homepage is most visitors' first impression. Without a clear CTA (Call Now, Get a Quote, Book Online), most visitors leave without taking action — turning traffic into wasted potential.",
      recommendation: 'Add at least two prominent CTAs to the homepage: one above the fold (e.g., "Call Now") and one mid-page (e.g., "Get a Free Estimate"). Make them visually distinct — colored buttons, not just text links.'
    });
  }
  if (home && home.phones.length === 0) {
    findings.push({
      id: "conversion-no-phone-homepage",
      category: "conversion",
      severity: "high",
      title: "Phone number missing from homepage",
      summary: "No phone number is visible on the homepage.",
      whyItMatters: "For local service businesses, the phone call is often the highest-value conversion. Hiding the phone number costs you direct leads — especially from mobile visitors who want to call immediately.",
      recommendation: 'Place the phone number in the site header (visible on all pages) and prominently on the homepage. Use a tap-to-call link for mobile: `<a href="tel:+1XXXXXXXXXX">`. Make it large and visible without scrolling.'
    });
  }
  const pagesWithForm = pages.filter((p) => p.hasForm);
  if (pagesWithForm.length === 0) {
    findings.push({
      id: "conversion-no-form",
      category: "conversion",
      severity: "medium",
      title: "No contact form found on the site",
      summary: "No lead capture form was detected on any page.",
      whyItMatters: "Not every visitor is ready to call. A contact form captures leads from visitors who prefer to inquire by email, who are outside business hours, or who want to provide details before calling.",
      recommendation: "Add a contact/inquiry form to the contact page and ideally the homepage. Keep it short: name, phone, service needed, preferred callback time."
    });
  } else if (contactPages.length > 0 && contactPages.every((p) => !p.hasForm)) {
    findings.push({
      id: "conversion-no-form-contact-page",
      category: "conversion",
      severity: "medium",
      title: "Contact page has no form",
      summary: "The contact page exists but has no lead capture form.",
      whyItMatters: "A visitor on the contact page is high-intent. Without a form, their only option is to call — which many won't do if they're browsing after hours or prefer written communication.",
      recommendation: "Add a simple inquiry form to the contact page. At minimum: name, phone or email, message.",
      affectedUrls: contactPages.map((p) => p.url)
    });
  }
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0);
    const ctaCoverage = pagesWithCTA.length / keyPages.length;
    if (ctaCoverage < MIN_CTA_COVERAGE) {
      const missing = keyPages.filter((p) => p.ctaTexts.length === 0);
      findings.push({
        id: "conversion-low-cta-coverage",
        category: "conversion",
        severity: "medium",
        title: `Only ${Math.round(ctaCoverage * 100)}% of key pages have CTAs`,
        summary: `${missing.length} of ${keyPages.length} important pages have no detectable call-to-action.`,
        whyItMatters: "Every page a visitor lands on is a conversion opportunity. Service pages, location pages, and about pages should all push visitors toward contacting you.",
        recommendation: 'Add a CTA section to every key page — at minimum a "Call us" button and a brief lead form. Think of every page as a landing page.',
        affectedUrls: missing.map((p) => p.url)
      });
    }
  }
  const hasBookingCTA = pages.some(
    (p) => p.ctaTexts.some((cta) => BOOKING_PATTERNS$1.some((pat) => pat.test(cta)))
  );
  if (!hasBookingCTA && pages.length >= 3) {
    findings.push({
      id: "conversion-no-booking-cta",
      category: "conversion",
      severity: "medium",
      title: "No booking or quote CTA found",
      summary: 'No "Get a Quote", "Book Now", or "Schedule" action was detected anywhere on the site.',
      whyItMatters: "For most local service businesses, the quote or booking request is the primary micro-conversion. Without prompting visitors to take this step, you leave revenue on the table.",
      recommendation: 'Add a clear "Get a Free Estimate" or "Request a Quote" button to the homepage and service pages. Link it to a short form or booking tool.'
    });
  }
  const totalCTAs = pages.reduce((n, p) => n + p.ctaTexts.length, 0);
  notes.push(
    `Homepage CTAs: ${home?.ctaTexts.length ?? 0}`,
    `Total CTAs site-wide: ${totalCTAs} | Pages with forms: ${pagesWithForm.length}`,
    `Booking CTA present: ${hasBookingCTA ? "yes" : "no"}`
  );
  return { findings, notes };
}
const HOME_WORD_MIN = 300;
const SERVICE_WORD_MIN = 200;
const THIN_PAGE_WORD_MIN = 150;
function analyzeContent(input) {
  const { pages } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const servicePages = pagesByType(pages, "service");
  const locationPages = pagesByType(pages, "location");
  const blogPages = pagesByType(pages, "blog");
  if (home) {
    const homeWords = home.wordCount ?? 0;
    if (homeWords < HOME_WORD_MIN && homeWords > 0) {
      findings.push({
        id: "content-thin-homepage",
        category: "content",
        severity: "medium",
        title: `Homepage content is thin (${homeWords} words)`,
        summary: `The homepage has only ${homeWords} words — below the recommended minimum of ${HOME_WORD_MIN}.`,
        whyItMatters: "Google uses content volume and depth to gauge topical relevance. A thin homepage signals low investment and limits your ability to rank for competitive local keywords.",
        recommendation: `Expand the homepage to at least ${HOME_WORD_MIN} words. Add sections covering: what you do, why choose you, service areas, testimonials, and a clear CTA. Quality matters more than quantity — every sentence should serve the visitor.`,
        affectedUrls: [home.url]
      });
    }
  }
  if (servicePages.length === 0 && pages.length >= 4) {
    findings.push({
      id: "content-no-service-pages",
      category: "content",
      severity: "high",
      title: "No dedicated service pages found",
      summary: "The site appears to have no pages dedicated to individual services.",
      whyItMatters: `A single "Services" page can't rank for every specific service. Individual service pages (e.g., "/roof-replacement/", "/gutter-cleaning/") each have a chance to rank for their own keyword and capture a different segment of searchers.`,
      recommendation: "Create one page per core service. Each page should: target a specific keyword, mention the service area, include a CTA, and have at least 300 words of genuine content."
    });
  } else if (servicePages.length === 1 && pages.length >= 6) {
    findings.push({
      id: "content-too-few-service-pages",
      category: "content",
      severity: "medium",
      title: "Only one service page found",
      summary: "The site has only one page classifiable as a service page.",
      whyItMatters: "Each unique service you offer deserves its own page. A single service page limits your Google footprint and forces all keywords to compete on one URL.",
      recommendation: "Create individual pages for each service you offer. Use a clear URL structure: /service-name/ or /service-name-city/.",
      affectedUrls: servicePages.map((p) => p.url)
    });
  }
  const thinServicePages = servicePages.filter(
    (p) => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < SERVICE_WORD_MIN
  );
  if (thinServicePages.length > 0) {
    findings.push({
      id: "content-thin-service-pages",
      category: "content",
      severity: "medium",
      title: `${thinServicePages.length} service page${thinServicePages.length > 1 ? "s are" : " is"} thin on content`,
      summary: `${thinServicePages.length} service page(s) have under ${SERVICE_WORD_MIN} words.`,
      whyItMatters: "Thin service pages are hard to rank. Google looks for content depth to confirm the page genuinely covers the topic. Thin pages also fail to build confidence with potential customers.",
      recommendation: `Expand each service page to at least ${SERVICE_WORD_MIN} words. Cover: what the service is, how it works, why choose you, what areas you serve, FAQs, and a strong CTA.`,
      affectedUrls: thinServicePages.map((p) => p.url)
    });
  }
  if (locationPages.length === 0 && pages.length >= 5) {
    findings.push({
      id: "content-no-location-pages",
      category: "content",
      severity: "medium",
      title: "No location or service-area pages found",
      summary: "No pages targeting specific cities or service areas were detected.",
      whyItMatters: `"Plumber near me" and "[service] in [city]" are among the most valuable search queries for local businesses. Without location pages, you can't rank for these unless your domain authority is very high.`,
      recommendation: "Create city/area pages for every location you serve. URL format: /[service]-[city]-[state]/. Each must have unique, helpful content — not just the same text with the city name swapped."
    });
  }
  const allThinPages = pages.filter(
    (p) => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < THIN_PAGE_WORD_MIN && !["gallery", "blog", "other"].includes(p.pageType)
  );
  if (allThinPages.length > pages.length * 0.4 && allThinPages.length >= 3) {
    findings.push({
      id: "content-widespread-thin-pages",
      category: "content",
      severity: "medium",
      title: `${allThinPages.length} pages have very thin content (under ${THIN_PAGE_WORD_MIN} words)`,
      summary: `More than 40% of scanned pages have under ${THIN_PAGE_WORD_MIN} words.`,
      whyItMatters: `A pattern of thin pages across a site can trigger a "thin content" quality signal in Google's algorithms, reducing the rankings of all pages — including well-written ones.`,
      recommendation: "Audit all thin pages. Either expand their content meaningfully, consolidate similar thin pages into one comprehensive page, or add a noindex tag to pages that genuinely have no ranking value (e.g., login pages).",
      affectedUrls: allThinPages.map((p) => p.url)
    });
  }
  const avgWords = pages.length > 0 ? Math.round(pages.reduce((n, p) => n + (p.wordCount ?? 0), 0) / pages.length) : 0;
  notes.push(
    `Service pages: ${servicePages.length} | Location pages: ${locationPages.length} | Blog pages: ${blogPages.length}`,
    `Average word count: ${avgWords} | Thin pages (<${THIN_PAGE_WORD_MIN}w): ${allThinPages.length}`,
    `Homepage words: ${home?.wordCount ?? "N/A"}`
  );
  return { findings, notes };
}
function analyzeTrust(input) {
  const { pages, domain } = input;
  const findings = [];
  const notes = [];
  const home = homepage(pages);
  const aboutPages = pagesByType(pages, "about");
  const galleryPages = pagesByType(pages, "gallery");
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`;
  if (!isHttps(homeUrl)) {
    findings.push({
      id: "trust-no-https",
      category: "trust",
      severity: "high",
      title: "Site is not using HTTPS",
      summary: `${domain} appears to be serving pages over HTTP instead of HTTPS.`,
      whyItMatters: 'Google explicitly uses HTTPS as a ranking signal. More importantly, Chrome displays "Not Secure" warnings to visitors on HTTP sites — which kills conversion rates and trust instantly.',
      recommendation: "Install an SSL certificate and force HTTPS across the site. Most hosts offer free SSL via Let's Encrypt. Redirect all HTTP traffic to HTTPS with a 301 redirect."
    });
  }
  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0);
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals);
  if (totalTestimonials === 0 && !hasTrustOnAnyPage) {
    findings.push({
      id: "trust-no-testimonials",
      category: "trust",
      severity: "high",
      title: "No testimonials or reviews found on the site",
      summary: "No customer testimonials, star ratings, or review widgets were detected.",
      whyItMatters: 'For local service businesses, social proof is often the deciding factor. Visitors ask: "Has anyone else used this business and been happy?" Without testimonials, many prospects move to a competitor who shows proof.',
      recommendation: "Add 3–5 real customer testimonials to the homepage. Include the customer's first name, location, and service. Also embed your Google Business Profile reviews using a review widget."
    });
  } else if (!hasTrustOnAnyPage && totalTestimonials === 0) ;
  else if (!hasTrustOnAnyPage) {
    findings.push({
      id: "trust-weak-trust-signals",
      category: "trust",
      severity: "medium",
      title: "Trust signals are weak or limited",
      summary: "Some trust elements exist but no licensing, certification, or guarantee language was found.",
      whyItMatters: 'Trust signals help overcome purchase anxiety. Phrases like "Licensed & Insured", "5-Star Rated", "Satisfaction Guaranteed" increase conversion rates significantly for service businesses.',
      recommendation: "Add trust badges and copy to the homepage: license numbers, insurance statements, guarantee language, award logos, and years in business. Place them above the fold if possible."
    });
  }
  if (aboutPages.length === 0) {
    findings.push({
      id: "trust-no-about-page",
      category: "trust",
      severity: "medium",
      title: "No About or Team page found",
      summary: 'No "About Us" or team page was detected on the site.',
      whyItMatters: "Local customers often want to know who they're inviting into their home or trusting with their business. An About page humanizes your brand and builds credibility.",
      recommendation: "Add an About page that tells your story: how long you've been in business, who your team is, what makes you different, and why you care about the work you do. Include real photos of your team."
    });
  }
  if (galleryPages.length === 0 && pages.length >= 4) {
    findings.push({
      id: "trust-no-gallery",
      category: "trust",
      severity: "medium",
      title: "No gallery or portfolio page found",
      summary: "No gallery, portfolio, or before/after page was detected.",
      whyItMatters: `For trade businesses (roofers, remodelers, landscapers, etc.) and beauty services, showing your work is one of the strongest trust signals available. "Show, don't tell."`,
      recommendation: 'Add a gallery, portfolio, or "Our Work" page with photos of real completed jobs. For each image, add a descriptive alt text (e.g., "roof replacement Austin TX") for SEO benefit.'
    });
  }
  if (home && !home.hasTrustSignals && aboutPages.length > 0) {
    findings.push({
      id: "trust-homepage-no-trust-content",
      category: "trust",
      severity: "low",
      title: "Homepage has no visible trust signals",
      summary: "The homepage has no detectable testimonials, certifications, or guarantee language.",
      whyItMatters: "The homepage is the highest-traffic page on most sites. If trust signals only appear on inner pages, most visitors never see them.",
      recommendation: "Move your strongest trust signals to the homepage: one star-rated testimonial, your license/insurance statement, and any guarantee you offer.",
      affectedUrls: [home.url]
    });
  }
  notes.push(
    `HTTPS: ${isHttps(homeUrl) ? "yes" : "NO"}`,
    `Testimonials found: ${totalTestimonials} | Trust signals on any page: ${hasTrustOnAnyPage ? "yes" : "no"}`,
    `About pages: ${aboutPages.length} | Gallery pages: ${galleryPages.length}`
  );
  return { findings, notes };
}
const PENALTY = {
  high: 20,
  medium: 10,
  low: 4
};
function computeScore(findings) {
  const total = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
  return Math.max(0, 100 - total);
}
function scoreBand(value) {
  if (value >= 85) return "Strong";
  if (value >= 70) return "Solid";
  if (value >= 55) return "Needs Work";
  return "Leaking Opportunity";
}
function buildNegativeRationale(findings) {
  return findings.map((f) => {
    const tag = f.severity === "high" ? "[High]" : f.severity === "medium" ? "[Medium]" : "[Low]";
    return `${tag} ${f.title}`;
  });
}
function makeScore(findings, positives = []) {
  const value = computeScore(findings);
  const negatives = buildNegativeRationale(findings);
  const rationale = negatives.length === 0 && positives.length === 0 ? ["No issues detected in this category."] : [...negatives, ...positives];
  return { value, label: scoreBand(value), rationale };
}
function scoreTechnical(input) {
  const { findings, pages, robotsFound, sitemapFound } = input;
  const positives = [];
  if (robotsFound) {
    positives.push("[+] robots.txt is present");
  }
  if (sitemapFound) {
    positives.push("[+] XML sitemap found");
  }
  const keyPages = pages.filter(
    (p) => ["home", "contact", "service", "location"].includes(p.pageType)
  );
  const allHaveTitles = keyPages.every((p) => p.title && p.title.trim().length > 0);
  if (allHaveTitles && keyPages.length > 0) {
    positives.push("[+] All key pages have title tags");
  }
  const allHaveDesc = keyPages.every(
    (p) => p.metaDescription && p.metaDescription.trim().length > 0
  );
  if (allHaveDesc && keyPages.length > 0) {
    positives.push("[+] All key pages have meta descriptions");
  }
  const totalImages = pages.reduce((n, p) => n + (p.imageCount ?? 0), 0);
  const missingAlt = pages.reduce((n, p) => n + (p.missingAltCount ?? 0), 0);
  if (totalImages > 0 && missingAlt / totalImages <= 0.1) {
    positives.push("[+] Strong image alt text coverage (>90%)");
  }
  const nobroken = pages.every((p) => p.statusCode < 400 || p.statusCode === 0);
  if (nobroken && pages.length > 0) {
    positives.push("[+] No broken pages found");
  }
  return makeScore(findings, positives);
}
function scoreLocalSeo(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  if (home?.phones && home.phones.length > 0) {
    positives.push("[+] Phone number present on homepage");
  }
  if (home?.hasAddress) {
    positives.push("[+] Business address found on homepage");
  }
  const hasLocalSchema = pages.some(
    (p) => p.schemaTypes.some(
      (t) => [
        "LocalBusiness",
        "ProfessionalService",
        "HomeAndConstructionBusiness",
        "FoodEstablishment",
        "HealthAndBeautyBusiness",
        "MedicalOrganization",
        "AutoRepair",
        "Restaurant"
      ].includes(t)
    )
  );
  if (hasLocalSchema) {
    positives.push("[+] LocalBusiness structured data is present");
  }
  if (pages.some((p) => p.hasMap)) {
    positives.push("[+] Map or directions embed found");
  }
  if (pages.some((p) => p.hasHours)) {
    positives.push("[+] Business hours found on site");
  }
  const locationPages = pages.filter((p) => p.pageType === "location");
  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`);
  }
  return makeScore(findings, positives);
}
const BOOKING_PATTERNS = [
  /book\s*(now|online|an?\s*appointment)/i,
  /schedule\s*(now|online|an?\s*appointment)/i,
  /get\s*(a\s*)?(free\s*)?(quote|estimate)/i,
  /request\s*(a\s*)?(quote|estimate|appointment)/i,
  /free\s*(estimate|inspection|consultation)/i,
  /order\s*(now|online)/i,
  /reserve\s*(a\s*table|now|online)/i
];
function scoreConversion(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  if (home?.ctaTexts && home.ctaTexts.length > 0) {
    positives.push(`[+] Homepage has ${home.ctaTexts.length} call-to-action(s)`);
  }
  if (home?.phones && home.phones.length > 0) {
    positives.push("[+] Phone number present on homepage");
  }
  const pagesWithForm = pages.filter((p) => p.hasForm);
  if (pagesWithForm.length > 0) {
    positives.push(`[+] Contact/lead form found on ${pagesWithForm.length} page(s)`);
  }
  const hasBookingCTA = pages.some(
    (p) => p.ctaTexts.some((cta) => BOOKING_PATTERNS.some((pat) => pat.test(cta)))
  );
  if (hasBookingCTA) {
    positives.push("[+] Booking or quote CTA detected");
  }
  const keyPages = pages.filter(
    (p) => ["home", "service", "location", "contact"].includes(p.pageType)
  );
  if (keyPages.length >= 3) {
    const pagesWithCTA = keyPages.filter((p) => p.ctaTexts.length > 0);
    const coverage = Math.round(pagesWithCTA.length / keyPages.length * 100);
    if (coverage >= 75) {
      positives.push(`[+] ${coverage}% of key pages have CTAs`);
    }
  }
  return makeScore(findings, positives);
}
const HOME_WORD_STRONG = 500;
const AVG_WORD_GOOD = 300;
function scoreContent(input) {
  const { findings, pages } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const servicePages = pages.filter((p) => p.pageType === "service");
  const locationPages = pages.filter((p) => p.pageType === "location");
  const blogPages = pages.filter((p) => p.pageType === "blog");
  if (home && (home.wordCount ?? 0) >= HOME_WORD_STRONG) {
    positives.push(`[+] Homepage has strong content depth (${home.wordCount} words)`);
  }
  if (servicePages.length >= 3) {
    positives.push(`[+] ${servicePages.length} dedicated service pages found`);
  } else if (servicePages.length >= 1) {
    positives.push(`[+] ${servicePages.length} service page(s) found`);
  }
  if (locationPages.length > 0) {
    positives.push(`[+] ${locationPages.length} location/service-area page(s) found`);
  }
  if (blogPages.length > 0) {
    positives.push(`[+] Blog or resource content found (${blogPages.length} page(s))`);
  }
  const totalWords = pages.reduce((n, p) => n + (p.wordCount ?? 0), 0);
  const avgWords = pages.length > 0 ? Math.round(totalWords / pages.length) : 0;
  if (avgWords >= AVG_WORD_GOOD) {
    positives.push(`[+] Average page content is solid (${avgWords} words/page)`);
  }
  return makeScore(findings, positives);
}
function scoreTrust(input) {
  const { findings, pages, domain } = input;
  const positives = [];
  const home = pages.find((p) => p.pageType === "home") ?? pages[0];
  const homeUrl = home?.finalUrl ?? home?.url ?? `http://${domain}`;
  if (isHttps(homeUrl)) {
    positives.push("[+] Site is served over HTTPS");
  }
  const totalTestimonials = pages.reduce((n, p) => n + p.testimonialCount, 0);
  const hasTrustOnAnyPage = pages.some((p) => p.hasTrustSignals);
  if (totalTestimonials >= 3) {
    positives.push(`[+] ${totalTestimonials} testimonials or reviews found`);
  } else if (totalTestimonials > 0) {
    positives.push(`[+] ${totalTestimonials} testimonial(s) found`);
  } else if (hasTrustOnAnyPage) {
    positives.push("[+] Trust signals found (licensing, guarantees, or certifications)");
  }
  const aboutPages = pages.filter((p) => p.pageType === "about");
  if (aboutPages.length > 0) {
    positives.push("[+] About or team page present");
  }
  const galleryPages = pages.filter((p) => p.pageType === "gallery");
  if (galleryPages.length > 0) {
    positives.push("[+] Gallery or portfolio page present");
  }
  if (home?.hasTrustSignals) {
    positives.push("[+] Homepage displays trust signals");
  }
  return makeScore(findings, positives);
}
const WEIGHTS = {
  technical: 0.25,
  localSeo: 0.3,
  conversion: 0.25,
  content: 0.1,
  trust: 0.1
};
function computeWeightedScore(scores) {
  const weighted = scores.technical.value * WEIGHTS.technical + scores.localSeo.value * WEIGHTS.localSeo + scores.conversion.value * WEIGHTS.conversion + scores.content.value * WEIGHTS.content + scores.trust.value * WEIGHTS.trust;
  const value = Math.round(weighted);
  const rationale = [
    `Technical (25%): ${scores.technical.value} → ${scores.technical.label}`,
    `Local SEO (30%): ${scores.localSeo.value} → ${scores.localSeo.label}`,
    `Conversion (25%): ${scores.conversion.value} → ${scores.conversion.label}`,
    `Content (10%): ${scores.content.value} → ${scores.content.label}`,
    `Trust (10%): ${scores.trust.value} → ${scores.trust.label}`
  ];
  return { value, label: scoreBand(value), rationale };
}
const CATEGORY_WEIGHT = {
  localSeo: 0.3,
  technical: 0.25,
  conversion: 0.25,
  content: 0.1,
  trust: 0.1
};
const SEVERITY_WEIGHT = {
  high: 20,
  medium: 10,
  low: 4
};
function impactScore(f) {
  return (CATEGORY_WEIGHT[f.category] ?? 0.1) * SEVERITY_WEIGHT[f.severity];
}
function prioritizeFindings(findings) {
  return [...findings].sort((a, b) => impactScore(b) - impactScore(a));
}
function buildQuickWins(findings) {
  return prioritizeFindings(findings).filter((f) => f.severity === "high" || f.severity === "medium").slice(0, 5).map((f) => f.recommendation);
}
function buildMoneyLeaks(findings) {
  return prioritizeFindings(findings).filter((f) => f.severity === "high").slice(0, 5).map((f) => f.summary);
}
const log = logger.createLogger("runAudit");
async function runAudit(request, emitProgress) {
  log.info(`Starting audit for ${request.url}`);
  emitProgress("Validating URL…", 2);
  let normalizedUrl;
  try {
    normalizedUrl = normalizeInputUrl(request.url);
  } catch {
    throw new Error(`Invalid URL: ${request.url}`);
  }
  const domain = getDomain(normalizedUrl);
  const scanId = pathResolver.generateScanId(domain);
  log.info(`Normalized: ${normalizedUrl} | domain: ${domain} | id: ${scanId}`);
  emitProgress("Launching browser…", 5);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  let crawledPages = [];
  let robotsFound = false;
  let sitemapFound = false;
  let allFindings = [];
  let scores = buildPlaceholderScores();
  let detectedBusinessType = request.businessType !== "auto" ? request.businessType : "other";
  try {
    emitProgress("Loading robots.txt…", 8);
    const robotsResult = await fetchRobots(normalizedUrl);
    robotsFound = robotsResult.found;
    log.info(`robots.txt: found=${robotsFound}, sitemaps=${robotsResult.sitemapUrls.length}`);
    emitProgress("Loading sitemap…", 12);
    const sitemapResult = await fetchSitemap(normalizedUrl, robotsResult.sitemapUrls);
    sitemapFound = sitemapResult.found;
    log.info(`sitemap: found=${sitemapFound}, urls=${sitemapResult.urls.length}`);
    emitProgress("Fetching homepage…", 16);
    const { fetchedPages } = await discoverUrls(
      normalizedUrl,
      browser,
      request.maxPages,
      domain,
      (fetched, queued) => {
        const ratio = Math.min(fetched / Math.max(request.maxPages, 1), 1);
        const pct = Math.round(16 + ratio * 49);
        emitProgress(`Crawling pages… (${fetched} fetched, ${queued} queued)`, pct);
      }
    );
    log.info(`Crawl complete: ${fetchedPages.length} pages fetched`);
    emitProgress("Extracting signals…", 66);
    crawledPages = fetchedPages.map((raw) => {
      const signals = extractAllSignals(raw.html, raw.finalUrl);
      const pageType = classifyPage(raw.finalUrl, signals.title, signals.h1s, signals.h2s);
      return {
        url: raw.requestedUrl,
        finalUrl: raw.finalUrl,
        statusCode: raw.statusCode,
        pageType,
        title: signals.title,
        metaDescription: signals.metaDescription,
        h1s: signals.h1s,
        h2s: signals.h2s,
        canonical: signals.canonical,
        noindex: signals.noindex,
        html: raw.html,
        textContent: signals.textContent,
        wordCount: signals.wordCount,
        imageCount: signals.imageCount,
        missingAltCount: signals.missingAltCount,
        phones: signals.phones,
        emails: signals.emails,
        hasAddress: signals.hasAddress,
        hasMap: signals.hasMap,
        hasHours: signals.hasHours,
        hasForm: signals.hasForm,
        ctaTexts: signals.ctaTexts,
        schemaTypes: signals.schemaTypes,
        hasTrustSignals: signals.hasTrustSignals,
        testimonialCount: signals.testimonialCount
      };
    });
    log.info(`Extraction complete: ${crawledPages.length} pages enriched`);
    emitProgress("Detecting business type…", 72);
    detectedBusinessType = detectBusinessType(crawledPages, request.businessType);
    log.info(`Detected business type: ${detectedBusinessType}`);
    emitProgress("Analyzing technical SEO…", 76);
    const analyzerInput = {
      pages: crawledPages,
      domain,
      robotsFound,
      sitemapFound,
      detectedBusinessType
    };
    const [technical, localSeo, conversion, content, trust] = [
      analyzeTechnical(analyzerInput),
      analyzeLocalSeo(analyzerInput),
      analyzeConversion(analyzerInput),
      analyzeContent(analyzerInput),
      analyzeTrust(analyzerInput)
    ];
    emitProgress("Analyzing local SEO…", 80);
    emitProgress("Analyzing conversions…", 84);
    emitProgress("Analyzing content & trust…", 88);
    allFindings = [
      ...technical.findings,
      ...localSeo.findings,
      ...conversion.findings,
      ...content.findings,
      ...trust.findings
    ];
    log.info(
      `Analyzers complete: ${allFindings.length} findings (tech=${technical.findings.length}, local=${localSeo.findings.length}, conv=${conversion.findings.length}, content=${content.findings.length}, trust=${trust.findings.length})`
    );
    emitProgress("Scoring results…", 92);
    const techScore = scoreTechnical({ findings: technical.findings, pages: crawledPages, robotsFound, sitemapFound });
    const localScore = scoreLocalSeo({ findings: localSeo.findings, pages: crawledPages });
    const convScore = scoreConversion({ findings: conversion.findings, pages: crawledPages });
    const contentScore = scoreContent({ findings: content.findings, pages: crawledPages });
    const trustScore = scoreTrust({ findings: trust.findings, pages: crawledPages, domain });
    const categoryScores = {
      technical: techScore,
      localSeo: localScore,
      conversion: convScore,
      content: contentScore,
      trust: trustScore
    };
    scores = { ...categoryScores, overall: computeWeightedScore(categoryScores) };
    allFindings = prioritizeFindings(allFindings);
    log.info(
      `Scoring complete: tech=${techScore.value} local=${localScore.value} conv=${convScore.value} content=${contentScore.value} trust=${trustScore.value} overall=${scores.overall.value}`
    );
    emitProgress("Building reports…", 97);
  } finally {
    await browser.close();
    log.info("Browser closed");
  }
  emitProgress("Complete.", 100);
  log.info(`Audit complete for ${domain}: ${crawledPages.length} pages, ${allFindings.length} findings`);
  return {
    id: scanId,
    request,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    domain,
    detectedBusinessType,
    pages: crawledPages,
    findings: allFindings,
    scores,
    quickWins: buildQuickWins(allFindings),
    moneyLeaks: buildMoneyLeaks(allFindings),
    artifacts: {}
  };
}
function buildPlaceholderScores() {
  const make = () => ({
    value: 0,
    label: "Leaking Opportunity",
    rationale: []
  });
  return {
    technical: make(),
    localSeo: make(),
    conversion: make(),
    content: make(),
    trust: make(),
    overall: make()
  };
}
exports.runAudit = runAudit;
