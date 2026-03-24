// Standardized logging utility for the DEKES SaaS application

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  userId?: string
  organizationId?: string
  requestId?: string
  metadata?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private createLogEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    return entry
  }

  private log(entry: LogEntry): void {
    const logMessage = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage, entry.metadata || '', entry.error || '')
        break
      case LogLevel.WARN:
        console.warn(logMessage, entry.metadata || '')
        break
      case LogLevel.INFO:
        console.info(logMessage, entry.metadata || '')
        break
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage, entry.metadata || '')
        }
        break
    }
  }

  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, error)
    this.log(entry)
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata)
    this.log(entry)
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata)
    this.log(entry)
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata)
    this.log(entry)
  }

  // Create a child logger with additional context
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`)
  }

  // Add user context to log entries
  withUser(userId: string, organizationId?: string): Logger {
    const childLogger = this.child('user')
    const originalLog = childLogger.log.bind(childLogger)
    
    childLogger.log = (entry: LogEntry) => {
      entry.userId = userId
      if (organizationId) {
        entry.organizationId = organizationId
      }
      return originalLog(entry)
    }
    
    return childLogger
  }
}

// Create loggers for different parts of the application
export const authLogger = new Logger('AUTH')
export const apiLogger = new Logger('API')
export const dbLogger = new Logger('DATABASE')
export const ecobeLogger = new Logger('ECOBE')
export const jobLogger = new Logger('JOBS')
export const sessionLogger = new Logger('SESSION')

// Helper function to create a logger for any context
export function createLogger(context: string): Logger {
  return new Logger(context)
}

// Request ID tracking middleware helper
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Standard error logging for API routes
export function logApiError(
  logger: Logger,
  route: string,
  error: unknown,
  userId?: string,
  organizationId?: string,
  requestId?: string
): void {
  const metadata = {
    route,
    userId,
    organizationId,
    requestId,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
  }

  if (error instanceof Error) {
    logger.error(`API error in ${route}`, metadata, error)
  } else {
    logger.error(`Unknown error in ${route}`, { ...metadata, error: String(error) })
  }
}
