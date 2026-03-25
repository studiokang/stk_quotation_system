type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function formatEntry(level: LogLevel, context: Record<string, unknown>, msg: string): LogEntry {
  return {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...context,
  };
}

function emit(level: LogLevel, context: Record<string, unknown>, msg: string) {
  const entry = formatEntry(level, context, msg);
  const output = IS_PRODUCTION ? JSON.stringify(entry) : `[${entry.timestamp}] ${level.toUpperCase()} ${msg} ${Object.keys(context).length > 0 ? JSON.stringify(context) : ''}`.trim();

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (!IS_PRODUCTION) console.debug(output);
      break;
    default:
      console.log(output);
  }
}

interface Logger {
  debug: (ctx: Record<string, unknown>, msg: string) => void;
  info: (ctx: Record<string, unknown>, msg: string) => void;
  warn: (ctx: Record<string, unknown>, msg: string) => void;
  error: (ctx: Record<string, unknown>, msg: string) => void;
  child: (defaults: Record<string, unknown>) => Logger;
}

function createLogger(defaults: Record<string, unknown> = {}): Logger {
  return {
    debug: (ctx, msg) => emit('debug', { ...defaults, ...ctx }, msg),
    info: (ctx, msg) => emit('info', { ...defaults, ...ctx }, msg),
    warn: (ctx, msg) => emit('warn', { ...defaults, ...ctx }, msg),
    error: (ctx, msg) => emit('error', { ...defaults, ...ctx }, msg),
    child: (childDefaults) => createLogger({ ...defaults, ...childDefaults }),
  };
}

/** Application-wide structured logger. JSON in production, readable in development. */
export const logger = createLogger();

let counter = 0;

/** Generate a short request-scoped ID for log correlation. */
export function requestId(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * Create a child logger bound to a specific request.
 * Attaches reqId, method, and path for structured correlation.
 */
export function createRequestLogger(reqId: string, method: string, path: string) {
  return logger.child({ reqId, method, path });
}
