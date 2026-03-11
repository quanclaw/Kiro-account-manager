// Machine Fingerprint Generator
// Generates a unique machine fingerprint per account
// Used for User-Agent formation to identify a specific account

import { hostname } from 'os'
import { createHash } from 'crypto'

/**
 * Generates a unique machine fingerprint for a specific account.
 * 
 * Each account gets its own fingerprint based on:
 * - hostname
 * - username
 * - account email or userId
 * 
 * @param accountIdentifier - Email or userId of the account
 * @returns SHA256 hash of the string "{hostname}-{username}-{accountIdentifier}-kiro"
 */
export function generateAccountFingerprint(accountIdentifier: string): string {
  try {
    const hostName = hostname()
    const userName = process.env.USERNAME || process.env.USER || 'unknown'
    const uniqueString = `${hostName}-${userName}-${accountIdentifier}-kiro`
    
    const fingerprint = createHash('sha256').update(uniqueString).digest('hex')
    console.log(`[Fingerprint] Generated for ${accountIdentifier}: ${fingerprint.substring(0, 16)}...`)
    
    return fingerprint
  } catch (error) {
    console.error('[Fingerprint] Failed to generate:', error)
    // Fallback to account-specific default
    return createHash('sha256').update(`default-${accountIdentifier}-kiro`).digest('hex')
  }
}

/**
 * Get or generate fingerprint for an account
 * If account already has a fingerprint, return it
 * Otherwise generate a new one
 */
export function getOrGenerateFingerprint(accountEmail: string, existingFingerprint?: string): string {
  if (existingFingerprint) {
    return existingFingerprint
  }
  return generateAccountFingerprint(accountEmail)
}

/**
 * Get the Kiro version for User-Agent
 */
export function getKiroVersion(): string {
  return '0.7.45'
}

/**
 * Generate a default fingerprint (for operations without account context)
 */
function getDefaultFingerprint(): string {
  const hostName = hostname()
  const userName = process.env.USERNAME || process.env.USER || 'unknown'
  const uniqueString = `${hostName}-${userName}-default-kiro`
  return createHash('sha256').update(uniqueString).digest('hex')
}

/**
 * Build User-Agent header with account-specific fingerprint
 * Format: aws-sdk-js/1.0.27 ua/2.1 os/{platform} lang/js md/nodejs#{version} api/codewhispererstreaming#1.0.27 m/E KiroIDE-{version}-{fingerprint}
 */
export function getKiroUserAgent(fingerprint?: string): string {
  const fp = fingerprint || getDefaultFingerprint()
  const version = getKiroVersion()
  const platform = process.platform === 'win32' ? 'windows' : process.platform
  const nodeVersion = process.versions.node
  
  return `aws-sdk-js/1.0.27 ua/2.1 os/${platform} lang/js md/nodejs#${nodeVersion} api/codewhispererstreaming#1.0.27 m/E KiroIDE-${version}-${fp}`
}

/**
 * Build x-amz-user-agent header with account-specific fingerprint
 * Format: aws-sdk-js/1.0.27 KiroIDE-{version}-{fingerprint}
 */
export function getKiroAmzUserAgent(fingerprint?: string): string {
  const fp = fingerprint || getDefaultFingerprint()
  const version = getKiroVersion()
  
  return `aws-sdk-js/1.0.27 KiroIDE-${version}-${fp}`
}
