// Fingerprint/User-Agent helpers

/**
 * Fingerprint auto-generation is disabled.
 * This function only returns the explicitly provided fingerprint.
 */
export function generateAccountFingerprint(_accountIdentifier: string, existingFingerprint?: string): string {
  return existingFingerprint || ''
}

/**
 * Get existing fingerprint for an account.
 * Auto-generation is intentionally disabled.
 */
export function getOrGenerateFingerprint(accountEmail: string, existingFingerprint?: string): string {
  void accountEmail
  return existingFingerprint || ''
}

/**
 * Get the Kiro version for User-Agent
 */
export function getKiroVersion(): string {
  return '0.7.45'
}

/**
 * No default fingerprint fallback.
 */
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
