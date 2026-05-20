type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown> | undefined;
  duration?: number;
}

class Logger {
  private context: string;
  private level: LogLevel;

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

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'debug', message, context };
    console.debug(this.format(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'info', message, context };
    console.info(this.format(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'warn', message, context };
    console.warn(this.format(entry));
  }

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

  time(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration });
      return duration;
    };
  }
}

export const createLogger = (context: string, level?: LogLevel): Logger => new Logger(context, level);

export const log = createLogger('cvr', (process.env.LOG_LEVEL as LogLevel) || 'info');
