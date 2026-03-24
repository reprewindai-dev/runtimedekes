// Standardized error handling utilities

import { LogLevel, createLogger } from '../logger'

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  API = 'API',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  code?: string | number
  details?: Record<string, unknown>
  timestamp: Date
  stack?: string
  userMessage?: string
  retryable?: boolean
  context?: string
  userId?: string
  organizationId?: string
  requestId?: string
}

export class StandardError extends Error implements AppError {
  type: ErrorType
  severity: ErrorSeverity
  code?: string | number
  details?: Record<string, unknown>
  timestamp: Date
  userMessage?: string
  retryable?: boolean
  context?: string
  userId?: string
  organizationId?: string
  requestId?: string

  constructor(options: {
    type: ErrorType
    severity: ErrorSeverity
    message: string
    code?: string | number
    details?: Record<string, unknown>
    userMessage?: string
    retryable?: boolean
    context?: string
    userId?: string
    organizationId?: string
    requestId?: string
    cause?: Error
  }) {
    super(options.message)
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StandardError)
    }
    
    // Set cause if supported (Node 16.9+)
    if (options.cause && 'cause' in Error.prototype) {
      ;(this as any).cause = options.cause
    }
    
    this.type = options.type
    this.severity = options.severity
    this.code = options.code
    this.details = options.details
    this.timestamp = new Date()
    this.userMessage = options.userMessage
    this.retryable = options.retryable ?? true
    this.context = options.context
    this.userId = options.userId
    this.organizationId = options.organizationId
    this.requestId = options.requestId
    this.name = 'StandardError'
  }
}

// Error factory functions
export const createNetworkError = (message: string, details?: Record<string, unknown>, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  return new StandardError({
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    userMessage: 'Network connection issue. Please check your internet connection.',
    retryable: true,
    context: context?.requestId ? `network:${context.requestId}` : 'network',
    ...context
  })
}

export const createValidationError = (message: string, details?: Record<string, unknown>, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  return new StandardError({
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    message,
    details,
    userMessage: 'Invalid input provided. Please check your data and try again.',
    retryable: false,
    context: context?.requestId ? `validation:${context.requestId}` : 'validation',
    ...context
  })
}

export const createDatabaseError = (message: string, details?: Record<string, unknown>, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  return new StandardError({
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    userMessage: 'Database operation failed. Please try again.',
    retryable: true,
    context: context?.requestId ? `database:${context.requestId}` : 'database',
    ...context
  })
}

export const createApiError = (status: number, message: string, details?: Record<string, unknown>, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  let severity = ErrorSeverity.MEDIUM
  let type = ErrorType.API
  
  if (status >= 500) {
    severity = ErrorSeverity.HIGH
    type = ErrorType.SERVER
  } else if (status === 401) {
    type = ErrorType.AUTHENTICATION
  } else if (status === 403) {
    type = ErrorType.AUTHORIZATION
  } else if (status === 404) {
    type = ErrorType.NOT_FOUND
    severity = ErrorSeverity.LOW
  } else if (status >= 400) {
    type = ErrorType.VALIDATION
    severity = ErrorSeverity.LOW
  }

  return new StandardError({
    type,
    severity,
    message,
    code: status,
    details,
    userMessage: getHttpErrorMessage(status),
    retryable: status >= 500 || status === 408,
    context: context?.requestId ? `api:${context.requestId}` : 'api',
    ...context
  })
}

export const createTimeoutError = (message: string, details?: Record<string, unknown>, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  return new StandardError({
    type: ErrorType.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    userMessage: 'Request timed out. Please try again.',
    retryable: true,
    context: context?.requestId ? `timeout:${context.requestId}` : 'timeout',
    ...context
  })
}

export const createUnknownError = (error: unknown, message: string = 'An unexpected error occurred', context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError => {
  return new StandardError({
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    message,
    details: { originalError: error instanceof Error ? error.message : String(error) },
    userMessage: 'Something went wrong. Please try again or contact support if the issue persists.',
    retryable: false,
    context: context?.requestId ? `unknown:${context.requestId}` : 'unknown',
    cause: error instanceof Error ? error : undefined,
    ...context
  })
}

// Helper functions
function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Invalid request. Please check your input.'
    case 401: return 'Authentication required. Please log in.'
    case 403: return 'Access denied. You don\'t have permission to perform this action.'
    case 404: return 'The requested resource was not found.'
    case 408: return 'Request timed out. Please try again.'
    case 429: return 'Too many requests. Please wait and try again later.'
    case 500: return 'Server error. Please try again later.'
    case 502: return 'Service temporarily unavailable. Please try again later.'
    case 503: return 'Service unavailable. Please try again later.'
    default: return 'Request failed. Please try again.'
  }
}

// Error classification utility
export function classifyError(error: unknown, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
}): StandardError {
  if (error instanceof StandardError) {
    return error
  }

  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('database') || error.message.includes('prisma') || 
        error.message.includes('connection') || error.message.includes('timeout')) {
      return createDatabaseError(error.message, { originalError: error.message }, context)
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      return createNetworkError(error.message, { originalError: error.message }, context)
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.name === 'AbortError') {
      return createTimeoutError(error.message, { originalError: error.message }, context)
    }

    // HTTP status errors
    const statusMatch = error.message.match(/HTTP (\d{3})/)
    if (statusMatch) {
      const status = parseInt(statusMatch[1])
      return createApiError(status, error.message, { originalError: error.message }, context)
    }
  }

  return createUnknownError(error, 'An unexpected error occurred', context)
}

// Enhanced error logging utility with integration to the logging system
export function logError(error: AppError, additionalContext?: Record<string, unknown>): void {
  const logger = createLogger(error.context || 'ERROR')
  
  // Create user context logger if user info is available
  if (error.userId) {
    logger.withUser(error.userId, error.organizationId)
  }

  // Map error severity to log level
  const logLevel = error.severity === ErrorSeverity.CRITICAL ? LogLevel.ERROR :
                   error.severity === ErrorSeverity.HIGH ? LogLevel.ERROR :
                   error.severity === ErrorSeverity.MEDIUM ? LogLevel.WARN : LogLevel.INFO

  const metadata = {
    errorType: error.type,
    errorCode: error.code,
    details: { ...error.details, ...additionalContext },
    retryable: error.retryable,
    userMessage: error.userMessage,
    requestId: error.requestId,
    organizationId: error.organizationId
  }

  // Log using the standardized logger
  switch (logLevel) {
    case LogLevel.ERROR:
      logger.error(error.message, metadata, error.stack ? new Error(error.stack) : undefined)
      break
    case LogLevel.WARN:
      logger.warn(error.message, metadata)
      break
    case LogLevel.INFO:
      logger.info(error.message, metadata)
      break
  }
}

// Error boundary helper
export function getErrorFallback(error: AppError): {
  title: string
  message: string
  action?: string
} {
  switch (error.type) {
    case ErrorType.NETWORK:
      return {
        title: 'Connection Error',
        message: error.userMessage || 'Unable to connect to our servers. Please check your internet connection.',
        action: 'Retry'
      }
    
    case ErrorType.DATABASE:
      return {
        title: 'Database Error',
        message: error.userMessage || 'Unable to process your request due to a database issue. Please try again.',
        action: 'Retry'
      }
    
    case ErrorType.VALIDATION:
      return {
        title: 'Invalid Input',
        message: error.userMessage || 'The provided data is invalid. Please check and try again.',
        action: 'Fix Input'
      }
    
    case ErrorType.AUTHENTICATION:
      return {
        title: 'Authentication Required',
        message: error.userMessage || 'Please log in to continue.',
        action: 'Log In'
      }
    
    case ErrorType.AUTHORIZATION:
      return {
        title: 'Access Denied',
        message: error.userMessage || 'You don\'t have permission to perform this action.',
        action: 'Contact Admin'
      }
    
    case ErrorType.NOT_FOUND:
      return {
        title: 'Not Found',
        message: error.userMessage || 'The requested resource was not found.',
        action: 'Go Home'
      }
    
    case ErrorType.TIMEOUT:
      return {
        title: 'Request Timeout',
        message: error.userMessage || 'The request took too long. Please try again.',
        action: 'Retry'
      }
    
    default:
      return {
        title: 'Something Went Wrong',
        message: error.userMessage || 'An unexpected error occurred. Please try again.',
        action: 'Retry'
      }
  }
}

// Error recovery utilities
export function shouldRetry(error: AppError, attemptCount: number = 0): boolean {
  if (!error.retryable || attemptCount >= 3) {
    return false
  }
  
  // Don't retry critical errors
  if (error.severity === ErrorSeverity.CRITICAL) {
    return false
  }
  
  // Don't retry validation errors
  if (error.type === ErrorType.VALIDATION) {
    return false
  }
  
  return true
}

export function getRetryDelay(attemptCount: number): number {
  // Exponential backoff with jitter
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay)
  const jitter = Math.random() * 0.1 * exponentialDelay // 10% jitter
  
  return exponentialDelay + jitter
}

// Error monitoring utilities
export function getErrorMetrics(error: AppError): {
  type: ErrorType
  severity: ErrorSeverity
  retryable: boolean
  timestamp: string
  hasCode: boolean
  hasDetails: boolean
} {
  return {
    type: error.type,
    severity: error.severity,
    retryable: error.retryable ?? false,
    timestamp: error.timestamp.toISOString(),
    hasCode: !!error.code,
    hasDetails: !!error.details && Object.keys(error.details).length > 0
  }
}

// Error aggregation for monitoring
export function aggregateErrors(errors: AppError[]): {
  totalErrors: number
  errorsByType: Record<ErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  retryableErrors: number
  criticalErrors: number
  recentErrors: number
} {
  const errorsByType = Object.values(ErrorType).reduce((acc, type) => {
    acc[type] = 0
    return acc
  }, {} as Record<ErrorType, number>)
  
  const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
    acc[severity] = 0
    return acc
  }, {} as Record<ErrorSeverity, number>)
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  errors.forEach(error => {
    errorsByType[error.type]++
    errorsBySeverity[error.severity]++
  })
  
  return {
    totalErrors: errors.length,
    errorsByType,
    errorsBySeverity,
    retryableErrors: errors.filter(e => e.retryable).length,
    criticalErrors: errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
    recentErrors: errors.filter(e => e.timestamp >= oneHourAgo).length
  }
}

// Context-aware error creation helpers
export function createContextualError(
  type: ErrorType,
  message: string,
  context: {
    userId?: string
    organizationId?: string
    requestId?: string
    operation?: string
  },
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: Record<string, unknown>
): StandardError {
  return new StandardError({
    type,
    severity,
    message,
    details,
    context: context.operation ? `${type.toLowerCase()}:${context.operation}` : type.toLowerCase(),
    ...context
  })
}

// Error correlation for debugging
export function correlateErrors(errors: AppError[]): {
  byRequestId: Record<string, AppError[]>
  byUserId: Record<string, AppError[]>
  byOrganizationId: Record<string, AppError[]>
  patterns: Array<{
    type: ErrorType
    count: number
    timeWindow: string
    affectedUsers: number
  }>
} {
  const byRequestId: Record<string, AppError[]> = {}
  const byUserId: Record<string, AppError[]> = {}
  const byOrganizationId: Record<string, AppError[]> = {}
  
  errors.forEach(error => {
    if (error.requestId) {
      byRequestId[error.requestId] = byRequestId[error.requestId] || []
      byRequestId[error.requestId].push(error)
    }
    
    if (error.userId) {
      byUserId[error.userId] = byUserId[error.userId] || []
      byUserId[error.userId].push(error)
    }
    
    if (error.organizationId) {
      byOrganizationId[error.organizationId] = byOrganizationId[error.organizationId] || []
      byOrganizationId[error.organizationId].push(error)
    }
  })
  
  // Find patterns
  const typeGroups = errors.reduce((acc, error) => {
    acc[error.type] = acc[error.type] || []
    acc[error.type].push(error)
    return acc
  }, {} as Record<ErrorType, AppError[]>)
  
  const patterns = Object.entries(typeGroups).map(([type, typeErrors]) => ({
    type: type as ErrorType,
    count: typeErrors.length,
    timeWindow: getTimeWindow(typeErrors),
    affectedUsers: new Set(typeErrors.filter(e => e.userId).map(e => e.userId!)).size
  }))
  
  return {
    byRequestId,
    byUserId,
    byOrganizationId,
    patterns
  }
}

function getTimeWindow(errors: AppError[]): string {
  if (errors.length === 0) return 'none'
  
  const timestamps = errors.map(e => e.timestamp.getTime()).sort()
  const diff = timestamps[timestamps.length - 1] - timestamps[0]
  
  if (diff < 60000) return '< 1 minute'
  if (diff < 3600000) return '< 1 hour'
  if (diff < 86400000) return '< 1 day'
  return '> 1 day'
}
