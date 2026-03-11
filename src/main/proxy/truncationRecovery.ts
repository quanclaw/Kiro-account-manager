// Truncation Recovery - Detect and Handle Incomplete API Responses
// Detects truncated JSON responses and provides recovery strategies

export interface TruncationCheckResult {
  isTruncated: boolean
  reason?: string
  sizeBytes?: number
  confidence?: 'high' | 'medium' | 'low'
}

export interface RecoveryStrategy {
  shouldRetry: boolean
  retryDelay?: number
  maxRetries?: number
  fallbackAction?: 'use_partial' | 'return_error' | 'request_continuation'
}

/**
 * Check if JSON string is truncated
 */
export function checkJsonTruncation(jsonStr: string): TruncationCheckResult {
  if (!jsonStr || jsonStr.trim().length === 0) {
    return {
      isTruncated: true,
      reason: 'empty response',
      sizeBytes: 0,
      confidence: 'high'
    }
  }

  const trimmed = jsonStr.trim()
  const sizeBytes = Buffer.byteLength(trimmed, 'utf8')

  // Check if ends with complete JSON structure
  const lastChar = trimmed[trimmed.length - 1]
  
  // Must end with } or ] for valid JSON
  if (lastChar !== '}' && lastChar !== ']') {
    return {
      isTruncated: true,
      reason: `incomplete JSON (ends with '${lastChar}')`,
      sizeBytes,
      confidence: 'high'
    }
  }

  // Check for unbalanced braces/brackets
  const openBraces = (trimmed.match(/{/g) || []).length
  const closeBraces = (trimmed.match(/}/g) || []).length
  const openBrackets = (trimmed.match(/\[/g) || []).length
  const closeBrackets = (trimmed.match(/]/g) || []).length

  if (openBraces !== closeBraces) {
    return {
      isTruncated: true,
      reason: `unbalanced braces (${openBraces} open, ${closeBraces} close)`,
      sizeBytes,
      confidence: 'high'
    }
  }

  if (openBrackets !== closeBrackets) {
    return {
      isTruncated: true,
      reason: `unbalanced brackets (${openBrackets} open, ${closeBrackets} close)`,
      sizeBytes,
      confidence: 'high'
    }
  }

  // Check for incomplete string literals
  // Count quotes (excluding escaped quotes)
  const quoteCount = (trimmed.match(/"/g) || []).length
  
  // If odd number of quotes, likely truncated
  if (quoteCount % 2 !== 0) {
    return {
      isTruncated: true,
      reason: 'incomplete string literal',
      sizeBytes,
      confidence: 'medium'
    }
  }

  // Try to parse JSON
  try {
    JSON.parse(trimmed)
    return {
      isTruncated: false,
      sizeBytes,
      confidence: 'high'
    }
  } catch (error) {
    return {
      isTruncated: true,
      reason: `JSON parse error: ${error instanceof Error ? error.message : 'unknown'}`,
      sizeBytes,
      confidence: 'high'
    }
  }
}

/**
 * Check if streaming response is truncated
 */
export function checkStreamTruncation(chunks: string[]): TruncationCheckResult {
  if (chunks.length === 0) {
    return {
      isTruncated: true,
      reason: 'no chunks received',
      sizeBytes: 0,
      confidence: 'high'
    }
  }

  const lastChunk = chunks[chunks.length - 1]
  
  // Check if last chunk indicates completion
  if (lastChunk.includes('[DONE]') || lastChunk.includes('data: [DONE]')) {
    return {
      isTruncated: false,
      sizeBytes: chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'), 0),
      confidence: 'high'
    }
  }

  // Check if last chunk is incomplete
  const trimmed = lastChunk.trim()
  if (trimmed.length > 0 && !trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    return {
      isTruncated: true,
      reason: 'incomplete last chunk',
      sizeBytes: chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'), 0),
      confidence: 'medium'
    }
  }

  return {
    isTruncated: false,
    sizeBytes: chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'), 0),
    confidence: 'medium'
  }
}

/**
 * Determine recovery strategy based on truncation result
 */
export function getRecoveryStrategy(
  truncationResult: TruncationCheckResult,
  attemptCount: number = 0
): RecoveryStrategy {
  if (!truncationResult.isTruncated) {
    return {
      shouldRetry: false
    }
  }

  // High confidence truncation - retry immediately
  if (truncationResult.confidence === 'high') {
    if (attemptCount < 3) {
      return {
        shouldRetry: true,
        retryDelay: 1000 * (attemptCount + 1), // Exponential backoff
        maxRetries: 3,
        fallbackAction: 'return_error'
      }
    } else {
      return {
        shouldRetry: false,
        fallbackAction: 'return_error'
      }
    }
  }

  // Medium confidence - retry with caution
  if (truncationResult.confidence === 'medium') {
    if (attemptCount < 2) {
      return {
        shouldRetry: true,
        retryDelay: 2000 * (attemptCount + 1),
        maxRetries: 2,
        fallbackAction: 'use_partial'
      }
    } else {
      return {
        shouldRetry: false,
        fallbackAction: 'use_partial'
      }
    }
  }

  // Low confidence - use partial data
  return {
    shouldRetry: false,
    fallbackAction: 'use_partial'
  }
}

/**
 * Attempt to repair truncated JSON
 */
export function attemptJsonRepair(truncatedJson: string): string | null {
  try {
    let repaired = truncatedJson.trim()

    // Count braces and brackets
    const openBraces = (repaired.match(/{/g) || []).length
    const closeBraces = (repaired.match(/}/g) || []).length
    const openBrackets = (repaired.match(/\[/g) || []).length
    const closeBrackets = (repaired.match(/]/g) || []).length

    // Add missing closing braces
    const missingBraces = openBraces - closeBraces
    if (missingBraces > 0) {
      repaired += '}'.repeat(missingBraces)
    }

    // Add missing closing brackets
    const missingBrackets = openBrackets - closeBrackets
    if (missingBrackets > 0) {
      repaired += ']'.repeat(missingBrackets)
    }

    // Try to parse repaired JSON
    JSON.parse(repaired)
    return repaired
  } catch {
    return null
  }
}

/**
 * Extract partial data from truncated response
 */
export function extractPartialData(truncatedJson: string): any {
  try {
    // Try to parse as-is first
    return JSON.parse(truncatedJson)
  } catch {
    // Try to repair and parse
    const repaired = attemptJsonRepair(truncatedJson)
    if (repaired) {
      try {
        return JSON.parse(repaired)
      } catch {
        // Return null if repair failed
        return null
      }
    }
    return null
  }
}

/**
 * Log truncation event for monitoring
 */
export function logTruncation(
  truncationResult: TruncationCheckResult,
  context: {
    endpoint?: string
    accountId?: string
    requestId?: string
  }
): void {
  console.warn('[TruncationRecovery] Detected truncated response:', {
    reason: truncationResult.reason,
    sizeBytes: truncationResult.sizeBytes,
    confidence: truncationResult.confidence,
    ...context
  })
}

/**
 * Create error response for truncated data
 */
export function createTruncationError(truncationResult: TruncationCheckResult): Error {
  return new Error(
    `Response truncated: ${truncationResult.reason} (size: ${truncationResult.sizeBytes} bytes, confidence: ${truncationResult.confidence})`
  )
}
