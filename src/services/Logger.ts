export class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'SalesIntelligence') {
    this.serviceName = serviceName;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('info', message, meta));
  }

  error(message: string, meta?: Record<string, any>): void {
    console.error(this.formatMessage('error', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  debug(message: string, meta?: Record<string, any>): void {
    const logLevel = process.env.LOG_LEVEL!;
    if (logLevel === 'debug') {
      console.log(this.formatMessage('debug', message, meta));
    }
  }
} 