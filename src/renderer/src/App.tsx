import { useState, useEffect, useCallback } from 'react'
import { AccountManager } from './components/accounts'
import { Sidebar, type PageType } from './components/layout'
import { HomePage, AboutPage, SettingsPage, ProxyPage, LogsPage, ChatPage, ApiExamplesPage } from './components/pages'
import { UpdateDialog } from './components/UpdateDialog'
import { CloseConfirmDialog } from './components/CloseConfirmDialog'
import { useAccountsStore } from './store/accounts'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  
  const { 
    loadFromStorage, 
    startAutoTokenRefresh, 
    stopAutoTokenRefresh, 
    handleBackgroundRefreshResult, 
    handleBackgroundCheckResult,
    accounts,
    activeAccountId,
    setActiveAccount,
    checkAndRefreshExpiringTokens
  } = useAccountsStore()

  // 切换到下一个可用账户
  const switchToNextAccount = useCallback(() => {
    const activeAccounts = Array.from(accounts.values()).filter(acc => acc.status === 'active')
    if (activeAccounts.length <= 1) return

    const currentIndex = activeAccounts.findIndex(acc => acc.id === activeAccountId)
    const nextIndex = (currentIndex + 1) % activeAccounts.length
    setActiveAccount(activeAccounts[nextIndex].id)
  }, [accounts, activeAccountId, setActiveAccount])

  // 更新托盘账户信息
  const updateTrayInfo = useCallback(() => {
    // 更新账户列表
    const accountList = Array.from(accounts.values()).map(acc => ({
      id: acc.id,
      email: acc.email || 'Unknown',
      idp: acc.idp || 'Unknown',
      status: acc.status
    }))
    window.api.updateTrayAccountList(accountList)

    // 更新当前账户
    if (activeAccountId) {
      const activeAccount = accounts.get(activeAccountId)
      if (activeAccount) {
        window.api.updateTrayAccount({
          id: activeAccount.id,
          email: activeAccount.email || 'Unknown',
          idp: activeAccount.idp || 'Unknown',
          status: activeAccount.status,
          subscription: activeAccount.subscription?.title || undefined,
          usage: activeAccount.usage ? {
            usedCredits: activeAccount.usage.current || 0,
            totalCredits: activeAccount.usage.limit || 0,
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0
          } : undefined
        })
      } else {
        window.api.updateTrayAccount(null)
      }
    } else {
      window.api.updateTrayAccount(null)
    }
  }, [accounts, activeAccountId])
  
  // 应用启动时加载数据并启动自动刷新
  useEffect(() => {
    loadFromStorage().then(() => {
      startAutoTokenRefresh()
    })
    
    return () => {
      stopAutoTokenRefresh()
    }
  }, [loadFromStorage, startAutoTokenRefresh, stopAutoTokenRefresh])

  // 账户变化时更新托盘信息
  useEffect(() => {
    updateTrayInfo()
  }, [updateTrayInfo])

  // 监听托盘刷新账户事件
  useEffect(() => {
    const unsubscribe = window.api.onTrayRefreshAccount(() => {
      checkAndRefreshExpiringTokens()
      updateTrayInfo()
    })
    return () => {
      unsubscribe()
    }
  }, [checkAndRefreshExpiringTokens, updateTrayInfo])

  // 监听托盘切换账户事件
  useEffect(() => {
    const unsubscribe = window.api.onTraySwitchAccount(() => {
      switchToNextAccount()
    })
    return () => {
      unsubscribe()
    }
  }, [switchToNextAccount])

  // 监听后台刷新结果
  useEffect(() => {
    const unsubscribe = window.api.onBackgroundRefreshResult((data) => {
      handleBackgroundRefreshResult(data)
    })
    return () => {
      unsubscribe()
    }
  }, [handleBackgroundRefreshResult])

  // 监听后台检查结果
  useEffect(() => {
    const unsubscribe = window.api.onBackgroundCheckResult((data) => {
      handleBackgroundCheckResult(data)
    })
    return () => {
      unsubscribe()
    }
  }, [handleBackgroundCheckResult])

  // 监听凭证自动导入事件并自动添加账户
  useEffect(() => {
    const unsubscribe = window.api.onCredentialsAutoImported(async (data) => {
      console.log('[App] Credentials auto-imported:', data)
      
      // Wait a bit for accounts to load
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 自动触发导入并添加账户
      try {
        const result = await window.api.autoImportSsoCredentials()
        
        if (!result.success || !result.data) {
          console.error('[App] Auto-import failed:', result.error)
          return
        }
        
        // 验证凭证并获取账号信息
        const verifyResult = await window.api.verifyAccountCredentials({
          refreshToken: result.data.refreshToken,
          clientId: result.data.clientId || '',
          clientSecret: result.data.clientSecret || '',
          region: result.data.region,
          authMethod: result.data.authMethod,
          provider: result.data.provider
        })
        
        if (!verifyResult.success || !verifyResult.data) {
          console.error('[App] Credential verification failed:', verifyResult.error)
          return
        }
        
        // 检查账户是否已存在 (check current state)
        const { accounts: currentAccounts } = useAccountsStore.getState()
        const existingAccount = Array.from(currentAccounts.values()).find(acc => 
          acc.userId === verifyResult.data!.userId || 
          (acc.email === verifyResult.data!.email && acc.credentials.provider === result.data!.provider)
        )
        
        if (existingAccount) {
          console.log('[App] Account already exists, updating fingerprint if missing...')
          
          // 如果现有账户没有 fingerprint，更新它
          if (!existingAccount.fingerprint && result.data.fingerprint) {
            const { updateAccount } = useAccountsStore.getState()
            updateAccount(existingAccount.id, {
              fingerprint: result.data.fingerprint
            })
            console.log('[App] Updated existing account with fingerprint:', result.data.fingerprint)
          }
          return
        }
        
        // 自动添加账户
        const { addAccount } = useAccountsStore.getState()
        const now = Date.now()
        
        console.log('[App] Auto-import fingerprint:', result.data?.fingerprint)
        
        addAccount({
          email: verifyResult.data.email,
          userId: verifyResult.data.userId,
          nickname: verifyResult.data.email ? verifyResult.data.email.split('@')[0] : undefined,
          idp: (result.data.provider || 'BuilderId') as 'BuilderId' | 'Google' | 'Github',
          credentials: {
            accessToken: verifyResult.data.accessToken,
            csrfToken: '',
            refreshToken: verifyResult.data.refreshToken,
            clientId: result.data.clientId || '',
            clientSecret: result.data.clientSecret || '',
            region: result.data.region || 'us-east-1',
            expiresAt: result.data.expiresAt,
            authMethod: result.data.authMethod,
            provider: (result.data.provider || 'BuilderId') as 'BuilderId' | 'Github' | 'Google'
          },
          subscription: {
            type: verifyResult.data.subscriptionType as any,
            title: verifyResult.data.subscriptionTitle,
            rawType: verifyResult.data.subscription?.rawType,
            daysRemaining: verifyResult.data.daysRemaining,
            expiresAt: verifyResult.data.expiresAt,
            managementTarget: verifyResult.data.subscription?.managementTarget,
            upgradeCapability: verifyResult.data.subscription?.upgradeCapability,
            overageCapability: verifyResult.data.subscription?.overageCapability
          },
          usage: {
            current: verifyResult.data.usage.current,
            limit: verifyResult.data.usage.limit,
            percentUsed: verifyResult.data.usage.limit > 0 
              ? verifyResult.data.usage.current / verifyResult.data.usage.limit 
              : 0,
            lastUpdated: now,
            baseLimit: verifyResult.data.usage.baseLimit,
            baseCurrent: verifyResult.data.usage.baseCurrent,
            freeTrialLimit: verifyResult.data.usage.freeTrialLimit,
            freeTrialCurrent: verifyResult.data.usage.freeTrialCurrent,
            freeTrialExpiry: verifyResult.data.usage.freeTrialExpiry,
            bonuses: verifyResult.data.usage.bonuses,
            nextResetDate: verifyResult.data.usage.nextResetDate,
            resourceDetail: verifyResult.data.usage.resourceDetail
          },
          status: 'active',
          tags: [],
          lastUsedAt: now,
          fingerprint: result.data?.fingerprint  // Use device fingerprint from auto-import
        })
        
        console.log('[App] Account auto-imported successfully:', verifyResult.data.email)
      } catch (error) {
        console.error('[App] Auto-import error:', error)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'accounts':
        return <AccountManager />
      case 'proxy':
        return <ProxyPage />
      case 'chat':
        return <ChatPage />
      case 'logs':
        return <LogsPage />
      case 'api-examples':
        return <ApiExamplesPage />
      case 'settings':
        return <SettingsPage />
      case 'about':
        return <AboutPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#111111] overflow-hidden">
      {/* Title Bar Drag Region - for Windows/Linux */}
      <div data-tauri-drag-region className="h-8 w-full absolute top-0 left-0 z-50" />

      <div className="flex flex-1 p-2 pt-10 gap-2 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area - Card Style */}
        <main className="flex-1 bg-background rounded-[32px] overflow-hidden flex flex-col relative shadow-2xl">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-muted/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden z-0 scroll-smooth">
            {renderPage()}
          </div>
        </main>
      </div>
      
      <UpdateDialog />
      <CloseConfirmDialog />
    </div>
  )
}

export default App
