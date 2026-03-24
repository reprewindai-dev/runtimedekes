// Type guards and runtime validation utilities

export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isValidArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false
  if (!itemGuard) return true
  return value.every(itemGuard)
}

export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidEmail(value: unknown): value is string {
  if (!isValidString(value)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

export function isValidUrl(value: unknown): value is string {
  if (!isValidString(value)) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function isValidDate(value: unknown): value is string {
  if (!isValidString(value)) return false
  const date = new Date(value)
  return !isNaN(date.getTime()) && date.toISOString() === value
}

// ECOBE-specific type guards
export function isValidEcobeResponse(value: unknown): value is Record<string, unknown> {
  if (!isValidObject(value)) return false
  
  // Check for common ECOBE response structure
  if ('status' in value && typeof value.status === 'string') {
    return true
  }
  
  if ('data' in value || 'error' in value || 'message' in value) {
    return true
  }
  
  return false
}

export function isValidEcobeStats(value: unknown): value is {
  totalHandoffs: number
  sentHandoffs: number
  acceptedHandoffs: number
  convertedHandoffs: number
  conversionRate: number
  acceptanceRate: number
} {
  if (!isValidObject(value)) return false
  
  const required = ['totalHandoffs', 'sentHandoffs', 'acceptedHandoffs', 'convertedHandoffs', 'conversionRate', 'acceptanceRate']
  return required.every(key => key in value && isValidNumber((value as any)[key]))
}

export function isValidEcobeSignalEvent(value: unknown): value is {
  id: string
  handoffId: string
  eventType: string
  severity: string
  classification: string
  createdAt: string
} {
  if (!isValidObject(value)) return false
  
  const required = ['id', 'handoffId', 'eventType', 'severity', 'classification', 'createdAt']
  const stringFields = ['id', 'handoffId', 'eventType', 'severity', 'classification', 'createdAt']
  
  return required.every(key => key in value) && 
         stringFields.every(field => isValidString((value as any)[field]))
}

// Safe type assertion with runtime validation
export function safeTypeAssertion<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage: string = 'Type assertion failed'
): T {
  if (!guard(value)) {
    throw new Error(errorMessage)
  }
  return value
}

// Safe array access with bounds checking
export function safeArrayAccess<T>(array: T[], index: number): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return undefined
  }
  return array[index]
}

// Safe object property access
export function safePropertyAccess<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  if (!isValidObject(obj) || !(key in obj)) {
    return undefined
  }
  return obj[key]
}

// Environment variable validation
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!isValidString(value)) {
    throw new Error(`Required environment variable ${name} is missing or invalid`)
  }
  return value
}

export function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  const value = process.env[name]
  return isValidString(value) ? value : defaultValue
}

export function getEnvNumber(name: string, defaultValue: number = 0): number {
  const value = process.env[name]
  if (!isValidString(value)) return defaultValue
  
  const num = Number(value)
  if (!isValidNumber(num)) {
    throw new Error(`Environment variable ${name} must be a valid number`)
  }
  return num
}
