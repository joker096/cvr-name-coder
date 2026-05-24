/** Available log severity levels, from most to least verbose. */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured log entry with optional context and duration metadata. */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown> | undefined;
  duration?: number;
}

/**
 * Structured console logger with level filtering and named context.
 */
class Logger {
  private context: string;
  private level: LogLevel;

  /**
   * @param context - Logger name for output prefix
   * @param level - Minimum log level threshold (default: 'info')
   */
  constructor(context: string, level: LogLevel = 'info') {
    this.context = context;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private format(entry: LogEntry): string {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const dur = entry.duration ? ` [${entry.duration}ms]` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.context}] ${entry.message}${ctx}${dur}`;
  }

  /**
   * Logs a debug-level message (verbose diagnostics).
   * @param message - Log message text
   * @param context - Optional structured context data
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'debug', message, context };
    console.debug(this.format(entry));
  }

  /**
   * Logs an info-level message (normal operational events).
   * @param message - Log message text
   * @param context - Optional structured context data
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'info', message, context };
    console.info(this.format(entry));
  }

  /**
   * Logs a warning-level message (recoverable anomalies).
   * @param message - Log message text
   * @param context - Optional structured context data
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'warn', message, context };
    console.warn(this.format(entry));
  }

  /**
   * Logs an error-level message. Includes Error object message and stack trace.
   * @param message - Log message text
   * @param error - Error object whose message and stack are captured
   * @param context - Optional structured context data (merged with error info)
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: { ...context, error: error?.message, stack: error?.stack },
    };
    console.error(this.format(entry));
  }

  /**
   * Starts a high-resolution timer. Call the returned function to log
   * the elapsed duration at debug level.
   * @param label - Operation name for the completion message
   * @returns A stop function that logs and returns duration in milliseconds
   */
  time(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration });
      return duration;
    };
  }
}

/** Factory function to create a named Logger instance. */
export const createLogger = (context: string, level?: LogLevel): Logger => new Logger(context, level);

/** Default application-wide logger instance using LOG_LEVEL env var. */
export const log = createLogger('cvr', (process.env.LOG_LEVEL as LogLevel) || 'info');
