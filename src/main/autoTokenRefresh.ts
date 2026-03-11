// Auto Token Refresh Manager
// Automatically refreshes account tokens before they expire
// Based on kiro-gateway's KiroAuthManager implementation

import { EventEmitter } from 'events'
import type { Account } from '../renderer/src/types/account'

// Token refresh threshold - refresh 5 minutes before expiration
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds

// Check interval - check every 1 minute
const CHECK_INTERVAL = 60 * 1000 // 1 minute

// Kiro refresh endpoint
const KIRO_REFRESH_URL = 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken'

// AWS SSO OIDC endpoint
const AWS_SSO_OIDC_URL = 'https://oidc.us-east-1.amazonaws.com/token'

interface RefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  error?: string
}

export class AutoTokenRefreshManager extends EventEmitter {
  private checkTimer: NodeJS.Timeout | null = null
  private refreshingAccounts = new Set<string>()
  private isRunning = false

  constructor() {
    super()
  }

  /**
   * Start the auto refresh manager
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AutoRefresh] Already running')
      return
    }

    this.isRunning = true
    console.log('[AutoRefresh] Started - checking tokens every minute')
    
    // Check immediately on start
    this.checkAllAccounts()
    
    // Then check periodically
    this.checkTimer = setInterval(() => {
      this.checkAllAccounts()
    }, CHECK_INTERVAL)
  }

  /**
   * Stop the auto refresh manager
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
    this.isRunning = false
    console.log('[AutoRefresh] Stopped')
  }

  /**
   * Check all accounts and refresh tokens if needed
   */
  private async checkAllAccounts(): Promise<void> {
    // Emit event to request account list from main process
    this.emit('check-accounts')
  }

  /**
   * Check if a token is expiring soon
   */
  isTokenExpiringSoon(expiresAt: number | undefined): boolean {
    if (!expiresAt) return true // No expiration info, assume needs refresh
    
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    
    return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD
  }

  /**
   * Check if a token is already expired
   */
  isTokenExpired(expiresAt: number | undefined): boolean {
    if (!expiresAt) return true
    return Date.now() >= expiresAt
  }

  /**
   * Refresh a single account's token
   */
  async refreshAccount(account: Account): Promise<RefreshResult> {
    // Prevent concurrent refreshes for the same account
    if (this.refreshingAccounts.has(account.id)) {
      console.log(`[AutoRefresh] Already refreshing account ${account.email}`)
      return { success: false, error: 'Already refreshing' }
    }

    this.refreshingAccounts.add(account.id)

    try {
      console.log(`[AutoRefresh] Refreshing token for ${account.email}`)

      // Determine auth method
      const authMethod = account.credentials?.authMethod || 'social'
      
      let result: RefreshResult
      if (authMethod === 'IdC' && account.credentials?.clientId && account.credentials?.clientSecret) {
        // AWS SSO OIDC refresh
        result = await this.refreshTokenAwsSsoOidc(account)
      } else {
        // Kiro Desktop Auth refresh
        result = await this.refreshTokenKiroDesktop(account)
      }

      if (result.success) {
        console.log(`[AutoRefresh] Successfully refreshed token for ${account.email}`)
        // Emit event with updated credentials
        this.emit('token-refreshed', {
          accountId: account.id,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt
        })
      } else {
        console.error(`[AutoRefresh] Failed to refresh token for ${account.email}:`, result.error)
        this.emit('token-refresh-failed', {
          accountId: account.id,
          error: result.error
        })
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[AutoRefresh] Error refreshing token for ${account.email}:`, errorMsg)
      
      this.emit('token-refresh-failed', {
        accountId: account.id,
        error: errorMsg
      })
      
      return { success: false, error: errorMsg }
    } finally {
      this.refreshingAccounts.delete(account.id)
    }
  }

  /**
   * Refresh token using Kiro Desktop Auth
   */
  private async refreshTokenKiroDesktop(account: Account): Promise<RefreshResult> {
    if (!account.credentials?.refreshToken) {
      return { success: false, error: 'No refresh token available' }
    }

    try {
      const response = await fetch(KIRO_REFRESH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KiroIDE-0.7.45'
        },
        body: JSON.stringify({
          refreshToken: account.credentials.refreshToken
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        }
      }

      const data = await response.json()

      if (!data.accessToken) {
        return { 
          success: false, 
          error: 'Response does not contain accessToken' 
        }
      }

      // Calculate expiration time (expiresIn - 60 seconds buffer)
      const expiresIn = data.expiresIn || 3600
      const expiresAt = Date.now() + (expiresIn - 60) * 1000

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.credentials.refreshToken,
        expiresAt
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Refresh token using AWS SSO OIDC
   */
  private async refreshTokenAwsSsoOidc(account: Account): Promise<RefreshResult> {
    if (!account.credentials?.refreshToken) {
      return { success: false, error: 'No refresh token available' }
    }

    if (!account.credentials?.clientId || !account.credentials?.clientSecret) {
      return { success: false, error: 'Missing clientId or clientSecret for AWS SSO OIDC' }
    }

    try {
      const response = await fetch(AWS_SSO_OIDC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grantType: 'refresh_token',
          clientId: account.credentials.clientId,
          clientSecret: account.credentials.clientSecret,
          refreshToken: account.credentials.refreshToken
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        }
      }

      const data = await response.json()

      if (!data.accessToken) {
        return { 
          success: false, 
          error: 'Response does not contain accessToken' 
        }
      }

      // Calculate expiration time (expiresIn - 60 seconds buffer)
      const expiresIn = data.expiresIn || 3600
      const expiresAt = Date.now() + (expiresIn - 60) * 1000

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || account.credentials.refreshToken,
        expiresAt
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Force refresh a specific account (called manually or on 403 error)
   */
  async forceRefresh(account: Account): Promise<RefreshResult> {
    console.log(`[AutoRefresh] Force refreshing token for ${account.email}`)
    return this.refreshAccount(account)
  }

  /**
   * Check and refresh multiple accounts
   */
  async checkAndRefreshAccounts(accounts: Account[]): Promise<void> {
    const accountsToRefresh = accounts.filter(account => {
      // Only refresh active accounts with credentials
      if (account.status !== 'active') return false
      if (!account.credentials?.refreshToken) return false
      
      // Check if token is expiring soon
      return this.isTokenExpiringSoon(account.credentials.expiresAt)
    })

    if (accountsToRefresh.length === 0) {
      console.log('[AutoRefresh] No accounts need token refresh')
      return
    }

    console.log(`[AutoRefresh] Found ${accountsToRefresh.length} accounts needing token refresh`)

    // Refresh accounts in parallel (but limit concurrency)
    const CONCURRENT_LIMIT = 3
    for (let i = 0; i < accountsToRefresh.length; i += CONCURRENT_LIMIT) {
      const batch = accountsToRefresh.slice(i, i + CONCURRENT_LIMIT)
      await Promise.all(batch.map(account => this.refreshAccount(account)))
    }
  }
}

// Singleton instance
export const autoTokenRefreshManager = new AutoTokenRefreshManager()
