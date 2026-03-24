import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { classifyError, logError, StandardError, ErrorType, ErrorSeverity } from '../error/error-handler'
import { generateRequestId, createLogger } from '../logger'
import type { ErrorResponse } from '../../types'

// API Route Wrapper for consistent error handling
export function withErrorHandling(
  handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean
    rateLimit?: {
      max: number
      window: number
    }
  }
) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const requestId = generateRequestId()
    const logger = createLogger('API_MIDDLEWARE')
    
    try {
      logger.info('API request started', {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent')
      })

      const result = await handler(request, context)
      
      logger.info('API request completed successfully', {
        requestId,
        status: result.status
      })

      return result
    } catch (error) {
      // Classify and log the error
      const standardError = classifyError(error, { requestId })
      logError(standardError, {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent')
      })

      // Return appropriate error response
      return createErrorResponse(standardError)
    }
  }
}

// Create standardized error responses
export function createErrorResponse(error: StandardError): NextResponse<ErrorResponse> {
  const statusCode = getStatusCodeFromError(error)
  
  return NextResponse.json({
    error: error.message || error.userMessage || 'An error occurred',
    code: error.code,
    type: error.type,
    retryable: error.retryable,
    timestamp: error.timestamp.toISOString()
  }, { 
    status: statusCode,
    headers: {
      'X-Error-Type': error.type,
      'X-Error-Severity': error.severity,
      'X-Error-Retryable': String(error.retryable ?? false),
      'X-Request-ID': error.requestId || 'unknown'
    }
  })
}

// Map error types to HTTP status codes
function getStatusCodeFromError(error: StandardError): number {
  switch (error.type) {
    case 'VALIDATION':
      return 400
    case 'AUTHENTICATION':
      return 401
    case 'AUTHORIZATION':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'TIMEOUT':
      return 408
    case 'NETWORK':
    case 'DATABASE':
      return 503
    case 'SERVER':
      return 500
    case 'API':
      return typeof error.code === 'number' ? error.code : 500
    default:
      return 500
  }
}

// Validation helper with consistent error handling
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: { requestId?: string; userId?: string; organizationId?: string }
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new StandardError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
        details: { validationErrors: error.errors },
        userMessage: 'Invalid input provided. Please check your data and try again.',
        retryable: false,
        ...context
      })
      throw validationError
    }
    throw error
  }
}

// Async wrapper for database operations with error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: { requestId?: string; userId?: string; organizationId?: string; operation?: string }
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof StandardError) {
      throw error
    }
    
    // Re-throw as database error
    const dbError = new StandardError({
      type: ErrorType.DATABASE,
      severity: ErrorSeverity.HIGH,
      message: `Database operation failed: ${error instanceof Error ? error.message : String(error)}`,
      details: { 
        originalError: error instanceof Error ? error.message : String(error),
        operation: context?.operation
      },
      userMessage: 'Database operation failed. Please try again.',
      retryable: true,
      ...context
    })
    
    throw dbError
  }
}

// Rate limiting helper (can be expanded with actual rate limiting implementation)
export function checkRateLimit(
  identifier: string,
  max: number,
  window: number,
  context?: { requestId?: string }
): { allowed: boolean; resetTime?: number } {
  // This is a placeholder - integrate with your actual rate limiting system
  // For now, just return allowed
  return { allowed: true }
}

// Response helper for successful API responses
export function createSuccessResponse<T>(
  data: T,
  meta?: {
    requestId?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
): NextResponse<{
  success: true
  data: T
  meta?: typeof meta
}> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta })
  }, {
    headers: {
      'X-Request-ID': meta?.requestId || 'unknown'
    }
  })
}
