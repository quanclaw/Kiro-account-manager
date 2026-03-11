// Auto Import Credentials from Multiple Sources
// Automatically scans and imports credentials from:
// 1. AWS SSO Cache (~/.aws/sso/cache/)
// 2. kiro-cli SQLite database (~/.local/share/kiro-cli/data.sqlite3)
// 3. Kiro IDE credentials file (~/.kiro/credentials.json)

import { readdir, readFile, access } from 'fs/promises'
import { join } from 'path'
import { homedir, hostname } from 'os'
import { createHash } from 'crypto'
import Database from 'better-sqlite3'

interface KiroAuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: string
  clientIdHash?: string
  authMethod?: 'IdC' | 'social'
  provider?: 'BuilderId' | 'Github' | 'Google' | 'Enterprise'
  region?: string
}

interface DeviceRegistration {
  clientId: string
  clientSecret: string
  region?: string
}

interface SqliteTokenData {
  access_token: string
  refresh_token: string
  expires_at: string
  profile_arn?: string
  region?: string
  scopes?: string[]
}

interface SqliteRegistrationData {
  client_id: string
  client_secret: string
  region?: string
}

export interface ImportedCredentials {
  accessToken: string
  refreshToken: string
  clientId?: string
  clientSecret?: string
  expiresAt: number
  authMethod: 'IdC' | 'social'
  provider?: string
  region: string
  source: 'aws-sso-cache' | 'kiro-cli-sqlite' | 'kiro-credentials-file'
  fingerprint?: string  // Existing fingerprint from cache/device
}

// SQLite token keys (searched in priority order)
const SQLITE_TOKEN_KEYS = [
  'kirocli:social:token',      // Social login (Google, GitHub, Microsoft, etc.)
  'kirocli:odic:token',        // AWS SSO OIDC (kiro-cli corporate)
  'codewhisperer:odic:token'   // Legacy AWS SSO OIDC
]

// Device registration keys (for AWS SSO OIDC only)
const SQLITE_REGISTRATION_KEYS = [
  'kirocli:odic:device-registration',
  'codewhisperer:odic:device-registration'
]

/**
 * Generate device fingerprint (same as kiro-gateway)
 * Based on hostname + username only (not account-specific)
 */
function generateDeviceFingerprint(): string {
  try {
    const hostName = hostname()
    const userName = process.env.USERNAME || process.env.USER || 'unknown'
    const uniqueString = `${hostName}-${userName}-kiro-gateway`
    
    const fingerprint = createHash('sha256').update(uniqueString).digest('hex')
    console.log('[AutoImport] Generated device fingerprint:', fingerprint)
    return fingerprint
  } catch (error) {
    console.error('[AutoImport] Failed to generate device fingerprint:', error)
    return createHash('sha256').update('default-kiro-gateway').digest('hex')
  }
}

/**
 * Get AWS SSO cache directory path
 */
function getSsoCachePath(): string {
  return join(homedir(), '.aws', 'sso', 'cache')
}

/**
 * Get kiro-cli SQLite database path
 */
function getKiroCliDbPath(): string {
  // Windows: %LOCALAPPDATA%\kiro-cli\data.sqlite3
  // Linux/Mac: ~/.local/share/kiro-cli/data.sqlite3
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'kiro-cli', 'data.sqlite3')
  }
  return join(homedir(), '.local', 'share', 'kiro-cli', 'data.sqlite3')
}

/**
 * Get Kiro IDE credentials file path
 */
function getKiroCredentialsPath(): string {
  return join(homedir(), '.kiro', 'credentials.json')
}

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Load kiro-auth-token.json from AWS SSO cache
 */
async function loadKiroAuthToken(): Promise<KiroAuthToken | null> {
  try {
    const cachePath = getSsoCachePath()
    const tokenPath = join(cachePath, 'kiro-auth-token.json')
    
    if (!await fileExists(tokenPath)) {
      return null
    }
    
    const content = await readFile(tokenPath, 'utf-8')
    const token = JSON.parse(content) as KiroAuthToken
    
    return token
  } catch (error) {
    console.log('[AutoImport] kiro-auth-token.json not found or invalid:', error)
    return null
  }
}

/**
 * Load device registration from AWS SSO cache using clientIdHash
 */
async function loadDeviceRegistration(clientIdHash: string): Promise<DeviceRegistration | null> {
  try {
    const cachePath = getSsoCachePath()
    const regPath = join(cachePath, `${clientIdHash}.json`)
    
    if (!await fileExists(regPath)) {
      return null
    }
    
    const content = await readFile(regPath, 'utf-8')
    const registration = JSON.parse(content) as DeviceRegistration
    
    return registration
  } catch (error) {
    console.log(`[AutoImport] Device registration ${clientIdHash}.json not found:`, error)
    return null
  }
}

/**
 * Load credentials from kiro-cli SQLite database
 */
async function loadFromKiroCliSqlite(): Promise<ImportedCredentials | null> {
  const dbPath = getKiroCliDbPath()
  
  if (!await fileExists(dbPath)) {
    console.log('[AutoImport] kiro-cli SQLite database not found:', dbPath)
    return null
  }
  
  try {
    const db = new Database(dbPath, { readonly: true })
    
    // Try all possible token keys in priority order
    let tokenData: SqliteTokenData | null = null
    for (const key of SQLITE_TOKEN_KEYS) {
      const row = db.prepare('SELECT value FROM auth_kv WHERE key = ?').get(key) as { value: string } | undefined
      if (row) {
        tokenData = JSON.parse(row.value) as SqliteTokenData
        console.log(`[AutoImport] Found credentials in SQLite key: ${key}`)
        break
      }
    }
    
    if (!tokenData) {
      db.close()
      return null
    }
    
    // Load device registration (client_id, client_secret)
    let registrationData: SqliteRegistrationData | null = null
    for (const key of SQLITE_REGISTRATION_KEYS) {
      const row = db.prepare('SELECT value FROM auth_kv WHERE key = ?').get(key) as { value: string } | undefined
      if (row) {
        registrationData = JSON.parse(row.value) as SqliteRegistrationData
        console.log(`[AutoImport] Found device registration in SQLite key: ${key}`)
        break
      }
    }
    
    db.close()
    
    // Parse expiresAt
    const expiresAt = new Date(tokenData.expires_at).getTime()
    
    // Determine auth method based on presence of client_id
    const authMethod = registrationData ? 'IdC' : 'social'
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      clientId: registrationData?.client_id,
      clientSecret: registrationData?.client_secret,
      expiresAt,
      authMethod: authMethod as 'IdC' | 'social',
      region: tokenData.region || registrationData?.region || 'us-east-1',
      source: 'kiro-cli-sqlite',
      fingerprint: generateDeviceFingerprint()
    }
  } catch (error) {
    console.error('[AutoImport] Error loading from kiro-cli SQLite:', error)
    return null
  }
}

/**
 * Load credentials from Kiro IDE credentials file
 */
async function loadFromKiroCredentialsFile(): Promise<ImportedCredentials | null> {
  const credsPath = getKiroCredentialsPath()
  
  if (!await fileExists(credsPath)) {
    console.log('[AutoImport] Kiro credentials file not found:', credsPath)
    return null
  }
  
  try {
    const content = await readFile(credsPath, 'utf-8')
    const creds = JSON.parse(content)
    
    if (!creds.accessToken || !creds.refreshToken) {
      console.log('[AutoImport] Kiro credentials file missing required fields')
      return null
    }
    
    // Parse expiresAt
    let expiresAt = Date.now() + 3600000 // Default 1 hour
    if (creds.expiresAt) {
      expiresAt = new Date(creds.expiresAt).getTime()
    }
    
    return {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      expiresAt,
      authMethod: creds.authMethod || (creds.clientId ? 'IdC' : 'social'),
      provider: creds.provider,
      region: creds.region || 'us-east-1',
      source: 'kiro-credentials-file',
      fingerprint: generateDeviceFingerprint()
    }
  } catch (error) {
    console.error('[AutoImport] Error loading from Kiro credentials file:', error)
    return null
  }
}

/**
 * Scan AWS SSO cache for any valid Kiro credentials
 */
async function scanSsoCache(): Promise<ImportedCredentials | null> {
  try {
    const cachePath = getSsoCachePath()
    
    if (!await fileExists(cachePath)) {
      console.log('[AutoImport] AWS SSO cache directory not found')
      return null
    }
    
    const files = await readdir(cachePath)
    
    // Look for kiro-auth-token.json first
    if (files.includes('kiro-auth-token.json')) {
      const token = await loadKiroAuthToken()
      if (token) {
        let clientId: string | undefined
        let clientSecret: string | undefined
        
        // If IdC auth, load device registration
        if (token.authMethod === 'IdC' && token.clientIdHash) {
          const registration = await loadDeviceRegistration(token.clientIdHash)
          if (registration) {
            clientId = registration.clientId
            clientSecret = registration.clientSecret
          }
        }
        
        // Parse expiresAt
        const expiresAt = new Date(token.expiresAt).getTime()
        
        console.log('[AutoImport] Found credentials in AWS SSO cache')
        return {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          clientId,
          clientSecret,
          expiresAt,
          authMethod: token.authMethod || 'social',
          provider: token.provider,
          region: token.region || 'us-east-1',
          source: 'aws-sso-cache',
          fingerprint: generateDeviceFingerprint()
        }
      }
    }
  } catch (error) {
    console.error('[AutoImport] Error scanning SSO cache:', error)
  }
  
  return null
}

/**
 * Check if credentials are still valid (not expired)
 */
function isCredentialsValid(creds: ImportedCredentials): boolean {
  const now = Date.now()
  const timeUntilExpiry = creds.expiresAt - now
  
  // Consider valid if more than 5 minutes remaining
  return timeUntilExpiry > 5 * 60 * 1000
}

/**
 * Auto-import credentials from all available sources
 * Priority: kiro-cli SQLite > AWS SSO cache > Kiro credentials file
 * Returns the first valid credentials found
 */
export async function autoImportCredentials(): Promise<ImportedCredentials | null> {
  console.log('[AutoImport] Scanning for credentials from all sources...')
  
  // Priority 1: kiro-cli SQLite database (most up-to-date)
  const sqliteCreds = await loadFromKiroCliSqlite()
  if (sqliteCreds && isCredentialsValid(sqliteCreds)) {
    console.log('[AutoImport] Using credentials from kiro-cli SQLite database')
    return sqliteCreds
  }
  
  // Priority 2: AWS SSO cache
  const ssoCreds = await scanSsoCache()
  if (ssoCreds && isCredentialsValid(ssoCreds)) {
    console.log('[AutoImport] Using credentials from AWS SSO cache')
    return ssoCreds
  }
  
  // Priority 3: Kiro IDE credentials file
  const fileCreds = await loadFromKiroCredentialsFile()
  if (fileCreds && isCredentialsValid(fileCreds)) {
    console.log('[AutoImport] Using credentials from Kiro credentials file')
    return fileCreds
  }
  
  console.log('[AutoImport] No valid credentials found in any source')
  return null
}

/**
 * Watch for changes in credential sources
 * Returns a cleanup function to stop watching
 */
export function watchSsoCache(_onChange: () => void): () => void {
  // TODO: Implement file system watcher if needed
  // For now, we'll rely on periodic checks via the auto refresh manager
  return () => {
    // Cleanup
  }
}
