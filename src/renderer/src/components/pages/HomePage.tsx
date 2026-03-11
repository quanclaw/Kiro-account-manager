import { useMemo, useEffect, useState } from 'react'
import { useAccountsStore } from '@/store/accounts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui'
import { Users, CheckCircle, AlertTriangle, Clock, Zap, Shield, Download, FolderPlus, Tag, TrendingUp, Activity, BarChart3 } from 'lucide-react'
import kiroLogo from '@/assets/kiro-high-resolution-logo-transparent.png'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

// 订阅类型颜色映射
const getSubscriptionColor = (type: string, title?: string): string => {
  const text = (title || type).toUpperCase()
  // KIRO PRO+ / PRO_PLUS - 紫色
  if (text.includes('PRO+') || text.includes('PRO_PLUS') || text.includes('PROPLUS')) return 'bg-purple-500'
  // KIRO POWER - 金色
  if (text.includes('POWER')) return 'bg-amber-500'
  // KIRO PRO - 蓝色
  if (text.includes('PRO')) return 'bg-blue-500'
  // KIRO FREE - 灰色
  return 'bg-gray-500'
}

export function HomePage() {
  const { accounts, getStats, usagePrecision } = useAccountsStore()
  const { t } = useTranslation()
  const stats = getStats()
  
  // API Gateway status
  const [gatewayStatus, setGatewayStatus] = useState<{
    running: boolean
    port?: number
    stats?: {
      totalRequests: number
      successRequests: number
      failedRequests: number
    }
  }>({ running: false })

  // Fetch gateway status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.api.proxyGetStatus()
        setGatewayStatus({
          running: status.running,
          port: status.config?.port
        })
      } catch (error) {
        console.error('Failed to fetch gateway status:', error)
      }
    }
    
    // Initial fetch
    fetchStatus()
    
    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000)
    
    // Listen for status changes
    const unsubscribe = window.api.onProxyStatusChange?.((status) => {
      setGatewayStatus({
        running: status.running,
        port: status.port
      })
    })
    
    return () => {
      clearInterval(interval)
      unsubscribe?.()
    }
  }, [])

  // 计算额度统计
  const usageStats = useMemo(() => {
    let totalLimit = 0
    let totalUsed = 0
    let validAccountCount = 0

    Array.from(accounts.values()).forEach(account => {
      // 只统计正常状态的账号
      if (account.status === 'active' && account.usage) {
        const limit = account.usage.limit ?? 0
        const used = account.usage.current ?? 0
        if (limit > 0) {
          totalLimit += limit
          totalUsed += used
          validAccountCount++
        }
      }
    })

    const remaining = totalLimit - totalUsed
    const percentUsed = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

    return {
      totalLimit,
      totalUsed,
      remaining,
      percentUsed,
      validAccountCount
    }
  }, [accounts])

  const isEn = t('common.unknown') === 'Unknown'
  const statCards = [
    { 
      label: isEn ? 'Total Accounts' : '总账号数', 
      value: stats.total, 
      icon: Users, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: isEn ? 'Active' : '正常账号', 
      value: stats.byStatus?.active || 0, 
      icon: CheckCircle, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: isEn ? 'Banned' : '已封禁', 
      value: stats.byStatus?.error || 0, 
      icon: AlertTriangle, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    { 
      label: isEn ? 'Expiring Soon' : '即将过期', 
      value: stats.expiringSoonCount, 
      icon: Clock, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
  ]

  // 获取当前活跃账号
  const activeAccount = Array.from(accounts.values()).find(a => a.isActive)

  return (
    <div className="flex-1 p-8 lg:px-10 pt-6 space-y-6 overflow-auto">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-[32px] bg-card p-8 border-0 shadow-sm">
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center p-2">
            <img 
              src={kiroLogo} 
              alt="Kiro" 
              className="h-full w-full object-contain" 
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {isEn ? 'Welcome to Kiro' : '欢迎使用 Kiro'}
            </h1>
            <p className="text-muted-foreground font-medium">
              {isEn ? 'Manage your Kiro IDE accounts, one-click switch' : '管理你的 Kiro IDE 账号，一键切换，高效开发'}
            </p>
          </div>
        </div>
      </div>

      {/* API Gateway Status Card - Kiro Style */}
      {gatewayStatus.running ? (
        <div className="relative overflow-hidden rounded-[32px] bg-[#EBFD93] p-8 border-0 shadow-sm">
          {/* Decorative background heartbeat */}
          <div className="absolute right-0 bottom-0 opacity-10">
            <Activity className="h-64 w-64 -mb-16 -mr-16" />
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-lime-900" />
                <span className="text-sm font-semibold text-lime-900 tracking-wide uppercase">
                  {isEn ? 'Gateway Status' : '网关状态'}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full bg-black text-[#EBFD93] text-xs font-bold uppercase tracking-wider">
                {isEn ? 'ACTIVE' : '运行中'}
              </div>
            </div>

            <div>
              <h2 className="text-5xl lg:text-6xl font-bold tracking-tighter text-lime-950 mb-2">
                {isEn ? 'ONLINE' : '在线'}
              </h2>
              <p className="text-lime-800 font-medium text-sm font-mono">
                {isEn 
                  ? `Running server on port: ${gatewayStatus.port || 5580}`
                  : `服务运行在端口: ${gatewayStatus.port || 5580}`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[32px] bg-card p-8 border-0 shadow-sm">
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                  {isEn ? 'Gateway Status' : '网关状态'}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
                {isEn ? 'OFFLINE' : '离线'}
              </div>
            </div>

            <div>
              <h2 className="text-5xl lg:text-6xl font-bold tracking-tighter text-muted-foreground mb-2">
                {isEn ? 'STOPPED' : '已停止'}
              </h2>
              <p className="text-muted-foreground font-medium text-sm">
                {isEn ? 'Ready to initialize connection' : '准备初始化连接'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-[24px]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Usage Stats */}
      {usageStats.validAccountCount > 0 && (
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-[24px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3 font-bold tracking-tight">
              <div className="p-2.5 rounded-xl bg-muted">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
              {isEn ? 'Usage Stats' : '额度统计'}
              <span className="text-xs font-normal text-muted-foreground">
                ({isEn ? `Based on ${usageStats.validAccountCount} valid accounts` : `基于 ${usageStats.validAccountCount} 个有效账号`})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-muted rounded-[20px]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground font-medium">{isEn ? 'Total' : '总额度'}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{usageStats.totalLimit.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted rounded-[20px]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground font-medium">{isEn ? 'Used' : '已使用'}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{usageStats.totalUsed.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted rounded-[20px]">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium">{isEn ? 'Remaining' : '剩余额度'}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-green-600">{usageStats.remaining.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted rounded-[20px]">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground font-medium">{isEn ? 'Usage %' : '使用率'}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{usageStats.percentUsed.toFixed(usagePrecision ? 2 : 1)}%</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{isEn ? 'Overall Progress' : '总体使用进度'}</span>
                <span>{usageStats.totalUsed.toLocaleString()} / {usageStats.totalLimit.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    usageStats.percentUsed < 50 && "bg-green-500",
                    usageStats.percentUsed >= 50 && usageStats.percentUsed < 80 && "bg-yellow-500",
                    usageStats.percentUsed >= 80 && "bg-red-500"
                  )}
                  style={{ width: `${Math.min(usageStats.percentUsed, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Account */}
      {activeAccount && (
        <Card className="border-0 shadow-sm bg-muted rounded-[24px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
              <Zap className="h-5 w-5 text-foreground" />
              {isEn ? 'Current Account' : '当前使用账号'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 基本信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background font-bold">
                  {(activeAccount.nickname || activeAccount.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{activeAccount.nickname || activeAccount.email}</p>
                  <p className="text-sm text-muted-foreground">{activeAccount.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white',
                  getSubscriptionColor(
                    activeAccount.subscription?.type || 'Free',
                    activeAccount.subscription?.title
                  )
                )}>
                  {activeAccount.subscription?.title || activeAccount.subscription?.type || 'Free'}
                </span>
              </div>
            </div>

            {/* 详细信息网格 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
              {/* 用量 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{isEn ? 'Monthly Usage' : '本月用量'}</p>
                <p className="text-sm font-medium">
                  {activeAccount.usage?.current || 0} / {activeAccount.usage?.limit || 0}
                </p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (activeAccount.usage?.percentUsed || 0) > 0.8 
                        ? 'bg-red-500' 
                        : (activeAccount.usage?.percentUsed || 0) > 0.5 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((activeAccount.usage?.percentUsed || 0) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* 订阅剩余 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{isEn ? 'Subscription' : '订阅剩余'}</p>
                <p className="text-sm font-medium">
                  {activeAccount.subscription?.daysRemaining != null 
                    ? (isEn ? `${activeAccount.subscription.daysRemaining} days` : `${activeAccount.subscription.daysRemaining} 天`)
                    : (isEn ? 'Permanent' : '永久')}
                </p>
              </div>

              {/* Token 状态 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{isEn ? 'Token Status' : 'Token 状态'}</p>
                {(() => {
                  const expiresAt = activeAccount.credentials?.expiresAt
                  if (!expiresAt) return <p className="text-sm font-medium text-muted-foreground">{isEn ? 'Unknown' : '未知'}</p>
                  const now = Date.now()
                  const remaining = expiresAt - now
                  if (remaining <= 0) return <p className="text-sm font-medium text-red-500">{isEn ? 'Expired' : '已过期'}</p>
                  const minutes = Math.floor(remaining / 60000)
                  if (minutes < 60) return <p className="text-sm font-medium text-amber-500">{isEn ? `${minutes} min` : `${minutes} 分钟`}</p>
                  const hours = Math.floor(minutes / 60)
                  return <p className="text-sm font-medium text-green-500">{isEn ? `${hours} hours` : `${hours} 小时`}</p>
                })()}
              </div>

              {/* 登录方式 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{isEn ? 'Auth Method' : '登录方式'}</p>
                <p className="text-sm font-medium">
                  {activeAccount.credentials?.authMethod === 'social' 
                    ? (activeAccount.credentials?.provider || 'Social')
                    : 'Builder ID'}
                </p>
              </div>
            </div>

            {/* 订阅详情 */}
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{isEn ? 'Subscription Details' : '订阅详情'}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{isEn ? 'Type:' : '订阅类型:'}</span>
                  <span className="font-medium">{activeAccount.subscription?.title || activeAccount.subscription?.type || 'Free'}</span>
                </div>
                {activeAccount.subscription?.rawType && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isEn ? 'Raw Type:' : '原始类型:'}</span>
                    <span className="font-mono text-[10px]">{activeAccount.subscription.rawType}</span>
                  </div>
                )}
                {activeAccount.subscription?.expiresAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isEn ? 'Expires:' : '到期时间:'}</span>
                    <span className="font-medium">{new Date(activeAccount.subscription.expiresAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}
                {activeAccount.subscription?.upgradeCapability && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isEn ? 'Upgradeable:' : '可升级:'}</span>
                    <span className="font-medium">{activeAccount.subscription.upgradeCapability}</span>
                  </div>
                )}
                {activeAccount.subscription?.overageCapability && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isEn ? 'Overage:' : '超额能力:'}</span>
                    <span className="font-medium">{activeAccount.subscription.overageCapability}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 额度明细 */}
            {(activeAccount.usage?.baseLimit || activeAccount.usage?.freeTrialLimit || activeAccount.usage?.bonuses?.length) && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{isEn ? 'Quota Details' : '额度明细'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* 基础额度 */}
                  {activeAccount.usage?.baseLimit !== undefined && activeAccount.usage.baseLimit > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">{isEn ? 'Base:' : '基础额度:'}</span>
                      <span className="font-medium">
                        {activeAccount.usage.baseCurrent ?? 0} / {activeAccount.usage.baseLimit}
                      </span>
                    </div>
                  )}
                  {/* 试用额度 */}
                  {activeAccount.usage?.freeTrialLimit !== undefined && activeAccount.usage.freeTrialLimit > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-muted-foreground">{isEn ? 'Trial:' : '试用额度:'}</span>
                      <span className="font-medium">
                        {activeAccount.usage.freeTrialCurrent ?? 0} / {activeAccount.usage.freeTrialLimit}
                      </span>
                      {activeAccount.usage.freeTrialExpiry && (
                        <span className="text-muted-foreground/70 text-[10px]">
                          (至 {(() => {
                            const d = activeAccount.usage.freeTrialExpiry as unknown
                            try { return (typeof d === 'string' ? d : new Date(d as Date).toISOString()).split('T')[0] } catch { return '' }
                          })()})
                        </span>
                      )}
                    </div>
                  )}
                  {/* 奖励额度 */}
                  {activeAccount.usage?.bonuses?.map((bonus) => (
                    <div key={bonus.code} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span className="text-muted-foreground truncate">{bonus.name}:</span>
                      <span className="font-medium">{bonus.current} / {bonus.limit}</span>
                      {bonus.expiresAt && (
                        <span className="text-muted-foreground/70 text-[10px]">
                          (至 {(() => {
                            const d = bonus.expiresAt as unknown
                            try { return (typeof d === 'string' ? d : new Date(d as Date).toISOString()).split('T')[0] } catch { return '' }
                          })()})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 账户信息 */}
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{isEn ? 'Account Info' : '账户信息'}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">User ID:</span>
                  <span className="font-mono text-[10px] break-all select-all">{activeAccount.userId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">IDP:</span>
                  <span className="font-medium">{activeAccount.idp || 'BuilderId'}</span>
                </div>
                {activeAccount.usage?.nextResetDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isEn ? 'Reset Date:' : '重置日期:'}</span>
                    <span className="font-medium">
                      {(() => {
                        const d = activeAccount.usage.nextResetDate as unknown
                        try { return (typeof d === 'string' ? d : new Date(d as Date).toISOString()).split('T')[0] } catch { return isEn ? 'Unknown' : '未知' }
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-3 font-bold tracking-tight">
            <div className="p-2.5 rounded-xl bg-muted">
              <Shield className="h-5 w-5 text-foreground" />
            </div>
            {isEn ? 'Quick Tips' : '快速提示'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              {isEn ? 'Click "Accounts" to view and manage all accounts' : '点击左侧「账户管理」可以查看和管理所有账号'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              {isEn ? 'Click power icon on account card to switch' : '在账号卡片上点击电源图标可以快速切换账号'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              {isEn ? 'Tokens auto-refresh 5 minutes before expiry' : 'Token 会在过期前 5 分钟自动刷新，无需手动操作'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              {isEn ? 'Use "Privacy Mode" to hide sensitive info' : '使用「隐私模式」可以隐藏邮箱和账号信息'}
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[24px]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Download className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{isEn ? 'Auto Import' : '自动导入'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isEn ? 'Auto-detect and import credentials from cache on startup' : '启动时自动检测并导入缓存中的凭证'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[24px]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <FolderPlus className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{isEn ? 'Groups' : '分组管理'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isEn ? 'Batch set groups for selected accounts' : '多选账户后可批量设置分组，一键移动账号'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[24px]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Tag className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{isEn ? 'Tags' : '标签管理'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isEn ? 'Batch add/remove tags, multi-tag support' : '多选账户后可批量添加/移除标签，支持多标签'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
