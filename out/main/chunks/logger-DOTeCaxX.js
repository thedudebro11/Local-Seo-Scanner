"use strict";
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
const CURRENT_LEVEL = process.env.NODE_ENV === "development" ? "debug" : "info";
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().substring(11, 23);
}
function log(level, prefix, message, ...args) {
  if (LEVELS[level] < LEVELS[CURRENT_LEVEL]) return;
  const label = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] [${prefix}]`;
  switch (level) {
    case "debug":
      console.debug(label, message, ...args);
      break;
    case "info":
      console.info(label, message, ...args);
      break;
    case "warn":
      console.warn(label, message, ...args);
      break;
    case "error":
      console.error(label, message, ...args);
      break;
  }
}
function createLogger(prefix) {
  return {
    debug: (msg, ...args) => log("debug", prefix, msg, ...args),
    info: (msg, ...args) => log("info", prefix, msg, ...args),
    warn: (msg, ...args) => log("warn", prefix, msg, ...args),
    error: (msg, ...args) => log("error", prefix, msg, ...args)
  };
}
exports.createLogger = createLogger;
