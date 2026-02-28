// Custom error types for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection lost. Please check your internet connection.') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class MicrophoneError extends Error {
  constructor(message: string = 'Microphone access denied. Please allow microphone permissions.') {
    super(message)
    this.name = 'MicrophoneError'
  }
}

export class AudioProcessingError extends Error {
  constructor(message: string = 'Failed to process audio. Please try recording again.') {
    super(message)
    this.name = 'AudioProcessingError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Too many requests. Please wait a moment and try again.') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string = 'API quota exceeded. Please try again later.') {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

// Error type mapping for user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Network error. Please check your internet connection.',
  'NetworkError': 'Unable to connect. Please check your internet connection.',
  'AbortError': 'Request timed out. Please try again.',
  'NotAllowedError': 'Microphone access was denied. Please allow microphone permissions in your browser settings.',
  'NotFoundError': 'No microphone found. Please connect a microphone and try again.',
  'NotReadableError': 'Microphone is busy or unavailable. Please close other apps using the microphone.',
  'OverconstrainedError': 'Microphone settings not supported. Please try a different microphone.',
  'SecurityError': 'Microphone access blocked. Please use HTTPS or allow microphone access.',
  'TypeError': 'Something went wrong. Please refresh the page and try again.',
  'QuotaExceededError': 'Storage is full. Please clear some saved files.',
  '400': 'Invalid request. Please try again.',
  '401': 'Authentication failed. Please refresh the page.',
  '403': 'Access denied. Please try again later.',
  '404': 'Service not found. Please refresh the page.',
  '429': 'Too many requests. Please wait a moment and try again.',
  '500': 'Server error. Please try again.',
  '502': 'Service temporarily unavailable. Please try again.',
  '503': 'Service is busy. Please try again in a moment.',
  '504': 'Request timed out. Please try again.',
}

// Parse and return user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError || 
      error instanceof NetworkError || 
      error instanceof MicrophoneError ||
      error instanceof AudioProcessingError ||
      error instanceof RateLimitError ||
      error instanceof QuotaExceededError) {
    return error.message
  }

  if (error instanceof Error) {
    // Check for known error types
    if (error.name in ERROR_MESSAGES) {
      return ERROR_MESSAGES[error.name]
    }

    // Check for status code errors
    const statusMatch = error.message.match(/(\d{3})/)
    if (statusMatch && statusMatch[1] in ERROR_MESSAGES) {
      return ERROR_MESSAGES[statusMatch[1]]
    }

    // Check for fetch errors
    if (error.message.includes('Failed to fetch')) {
      return ERROR_MESSAGES['Failed to fetch']
    }

    // Return the error message if it seems user-friendly
    if (error.message.length < 100 && !error.message.includes('undefined')) {
      return error.message
    }
  }

  return 'Something went wrong. Please try again.'
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    return error.isRetryable
  }

  if (error instanceof NetworkError || error instanceof RateLimitError) {
    return true
  }

  if (error instanceof Error) {
    const retryableStatuses = ['429', '500', '502', '503', '504']
    return retryableStatuses.some(status => error.message.includes(status))
  }

  return false
}

// Check network connectivity
export async function checkNetworkConnectivity(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    await fetch('/api/gemini', {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(() => {
      // Even if HEAD fails, we might still be online
    })
    
    clearTimeout(timeoutId)
    return true
  } catch {
    return navigator?.onLine ?? true
  }
}

// Parse Gemini API error response
export function parseGeminiError(statusCode: number, errorBody: string): Error {
  try {
    const parsed = JSON.parse(errorBody)
    const message = parsed.error?.message || parsed.message || errorBody
    
    if (statusCode === 429 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
      return new RateLimitError()
    }
    
    if (message.toLowerCase().includes('quota exceeded')) {
      return new QuotaExceededError()
    }
    
    return new APIError(
      ERROR_MESSAGES[statusCode.toString()] || message,
      statusCode,
      [429, 500, 502, 503, 504].includes(statusCode)
    )
  } catch {
    return new APIError(
      ERROR_MESSAGES[statusCode.toString()] || 'API request failed',
      statusCode,
      [429, 500, 502, 503, 504].includes(statusCode)
    )
  }
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
