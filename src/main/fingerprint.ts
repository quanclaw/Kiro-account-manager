// Fingerprint/User-Agent helpers

import { getMachineFingerprint } from './proxy/gatewayUtils'

/**
 * Generate the stable machine fingerprint used by kiro-gateway.
 */
export function generateAccountFingerprint(_accountIdentifier: string, existingFingerprint?: string): string {
  return existingFingerprint || getMachineFingerprint()
}

/**
 * Get an existing account fingerprint or fall back to the stable machine fingerprint.
 */
export function getOrGenerateFingerprint(accountEmail: string, existingFingerprint?: string): string {
  void accountEmail
  return existingFingerprint || getMachineFingerprint()
}

/**
 * Get the Kiro version for User-Agent
 */
export function getKiroVersion(): string {
  return '0.7.45'
}

/**
 * Build User-Agent header with account-specific fingerprint
 * Format: aws-sdk-js/1.0.27 ua/2.1 os/{platform} lang/js md/nodejs#{version} api/codewhispererstreaming#1.0.27 m/E KiroIDE-{version}-{fingerprint}
 */
export function getKiroUserAgent(fingerprint?: string): string {
  const version = getKiroVersion()
  const platform = process.platform === 'win32' ? 'windows' : process.platform
  const nodeVersion = process.versions.node
  const suffix = fingerprint ? `-${fingerprint}` : ''
  
  return `aws-sdk-js/1.0.27 ua/2.1 os/${platform} lang/js md/nodejs#${nodeVersion} api/codewhispererstreaming#1.0.27 m/E KiroIDE-${version}${suffix}`
}

/**
 * Build x-amz-user-agent header with account-specific fingerprint
 * Format: aws-sdk-js/1.0.27 KiroIDE-{version}-{fingerprint}
 */
export function getKiroAmzUserAgent(fingerprint?: string): string {
  const version = getKiroVersion()
  const suffix = fingerprint ? `-${fingerprint}` : ''
  
  return `aws-sdk-js/1.0.27 KiroIDE-${version}${suffix}`
}
