/**
 * Structured logger for the audit engine.
 * Runs in the Electron main process (Node.js context).
 * Uses prefixed console output with timestamps.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
}

// Change to 'debug' during development for verbose output
const CURRENT_LEVEL: LogLevel =
  process.env.NODE_ENV === 'development' ? 'debug' : 'info'

function timestamp(): string {
  return new Date().toISOString().substring(11, 23) // HH:mm:ss.mmm
}

function log(level: LogLevel, prefix: string, message: string, ...args: unknown[]): void {
  if (LEVELS[level] < LEVELS[CURRENT_LEVEL]) return

  const label = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] [${prefix}]`
  switch (level) {
    case 'debug': console.debug(label, message, ...args); break
    case 'info':  console.info(label, message, ...args); break
    case 'warn':  console.warn(label, message, ...args); break
    case 'error': console.error(label, message, ...args); break
  }
}

export function createLogger(prefix: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => log('debug', prefix, msg, ...args),
    info:  (msg: string, ...args: unknown[]) => log('info',  prefix, msg, ...args),
    warn:  (msg: string, ...args: unknown[]) => log('warn',  prefix, msg, ...args),
    error: (msg: string, ...args: unknown[]) => log('error', prefix, msg, ...args),
  }
}

// Default top-level logger
export const logger = createLogger('engine')
