import { useAccountsStore } from '@/store/accounts'
import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui'
import { Eye, EyeOff, RefreshCw, Clock, Trash2, Download, Upload, Globe, Repeat, Palette, Moon, Sun, Settings, Database, Layers, UserX, Monitor } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ExportDialog } from '../accounts/ExportDialog'
import { useTranslation } from '@/hooks/useTranslation'

export function SettingsPage() {
  const { 
    privacyMode, 
    setPrivacyMode,
    usagePrecision,
    setUsagePrecision,
    autoRefreshEnabled,
    autoRefreshInterval,
    autoRefreshConcurrency,
    autoRefreshSyncInfo,
    setAutoRefresh,
    setAutoRefreshConcurrency,
    setAutoRefreshSyncInfo,
    checkAndRefreshExpiringTokens,
    proxyEnabled,
    proxyUrl,
    setProxy,
    autoSwitchEnabled,
    autoSwitchThreshold,
    autoSwitchInterval,
    setAutoSwitch,
    batchImportConcurrency,
    setBatchImportConcurrency,
    loginPrivateMode,
    setLoginPrivateMode,
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    accounts,
    importFromExportData
  } = useAccountsStore()

  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [tempProxyUrl, setTempProxyUrl] = useState(proxyUrl)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  
  // 托盘设置状态
  const [traySettings, setTraySettings] = useState({
    enabled: true,
    closeAction: 'ask' as 'ask' | 'minimize' | 'quit',
    showNotifications: true,
    minimizeOnStart: false
  })
  const [trayLoading, setTrayLoading] = useState(true)

  // 快捷键设置状态
  const [showWindowShortcut, setShowWindowShortcut] = useState('')
  const [shortcutLoading, setShortcutLoading] = useState(true)
  const [shortcutError, setShortcutError] = useState('')
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)

  // 加载快捷键设置
  useEffect(() => {
    const loadShortcut = async () => {
      try {
        const shortcut = await window.api.getShowWindowShortcut()
        setShowWindowShortcut(shortcut)
      } catch (error) {
        console.error('Failed to load shortcut:', error)
      } finally {
        setShortcutLoading(false)
      }
    }
    loadShortcut()
  }, [])

  // 保存快捷键设置
  const handleShortcutChange = async (shortcut: string) => {
    setShowWindowShortcut(shortcut)
    setShortcutError('')
    try {
      const result = await window.api.setShowWindowShortcut(shortcut)
      if (!result.success) {
        setShortcutError(result.error || 'Failed to set shortcut')
      }
    } catch (error) {
      setShortcutError(String(error))
    }
  }

  // 按键录制处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecordingShortcut) return
    e.preventDefault()
    
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.metaKey) parts.push('Command')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    
    // 忽略单独的修饰键
    const key = e.key
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
      // 转换特殊键名
      const keyName = key.length === 1 ? key.toUpperCase() : key
      parts.push(keyName)
      
      const shortcut = parts.join('+')
      handleShortcutChange(shortcut)
      setIsRecordingShortcut(false)
    }
  }

  // Usage API 类型状态
  const [usageApiType, setUsageApiType] = useState<'rest' | 'cbor'>('rest')
  const [usageApiLoading, setUsageApiLoading] = useState(true)

  // 加载 Usage API 类型设置
  useEffect(() => {
    const loadUsageApiType = async () => {
      try {
        const type = await window.api.getUsageApiType()
        setUsageApiType(type)
      } catch (error) {
        console.error('Failed to load usage API type:', error)
      } finally {
        setUsageApiLoading(false)
      }
    }
    loadUsageApiType()
  }, [])

  // 保存 Usage API 类型
  const handleUsageApiTypeChange = async (type: 'rest' | 'cbor') => {
    setUsageApiType(type)
    try {
      await window.api.setUsageApiType(type)
    } catch (error) {
      console.error('Failed to save usage API type:', error)
    }
  }

  // 加载托盘设置
  useEffect(() => {
    const loadTraySettings = async () => {
      try {
        const settings = await window.api.getTraySettings()
        setTraySettings(settings)
      } catch (error) {
        console.error('Failed to load tray settings:', error)
      } finally {
        setTrayLoading(false)
      }
    }
    loadTraySettings()
  }, [])

  // 保存托盘设置
  const handleTraySettingChange = async (key: keyof typeof traySettings, value: boolean | string) => {
    const newSettings = { ...traySettings, [key]: value }
    setTraySettings(newSettings)
    try {
      await window.api.saveTraySettings({ [key]: value })
    } catch (error) {
      console.error('Failed to save tray settings:', error)
    }
  }

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      await checkAndRefreshExpiringTokens()
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const fileData = await window.api.importFromFile()
      if (fileData && fileData.format === 'json') {
        const data = JSON.parse(fileData.content)
        const importResult = importFromExportData(data)
        alert(`导入完成：成功 ${importResult.success} 个，失败 ${importResult.failed} 个`)
      } else if (fileData) {
        alert('设置页面仅支持 JSON 格式导入，请使用账号管理页面导入 CSV/TXT')
      }
    } catch (e) {
      alert(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearData = () => {
    if (confirm('确定要清除所有账号数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：这将删除所有账号、分组和标签数据！')) {
        // 清除所有数据
        Array.from(accounts.keys()).forEach(id => {
          useAccountsStore.getState().removeAccount(id)
        })
        alert('所有数据已清除')
      }
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 页面头部 */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/25">
            <Settings className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.title') === 'Settings' ? 'Configure app features' : '配置应用的各项功能'}</p>
          </div>
        </div>
      </div>

      {/* 语言设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            语言 / Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">显示语言 / Display Language</p>
              <p className="text-sm text-muted-foreground">选择界面显示语言 / Select interface language</p>
            </div>
            <select
              className="w-[160px] h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'auto' | 'en' | 'zh')}
            >
              <option value="auto">🌐 自动 (Auto)</option>
              <option value="zh">🇨🇳 简体中文</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p>• 自动模式会根据系统语言自动选择</p>
            <p>• Auto mode will follow system language</p>
            <p>• 支持自定义翻译文件扩展（开发中）</p>
          </div>
        </CardContent>
      </Card>

      {/* 主题设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Theme' : '主题设置'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 深色模式 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Dark Mode' : '深色模式'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Toggle dark/light theme' : '切换深色/浅色主题'}</p>
            </div>
            <Button
              variant={darkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
              {darkMode ? (isEn ? 'Dark' : '深色') : (isEn ? 'Light' : '浅色')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 隐私设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {privacyMode ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
            </div>
            {isEn ? 'Privacy' : '隐私设置'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Privacy Mode' : '隐私模式'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Hide emails and sensitive info' : '隐藏邮箱和账号敏感信息'}</p>
            </div>
            <Button
              variant={privacyMode ? "default" : "outline"}
              size="sm"
              onClick={() => setPrivacyMode(!privacyMode)}
            >
              {privacyMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {privacyMode ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
            </Button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium">{isEn ? 'Usage Precision' : '使用量精度'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Show decimal places for usage values' : '显示使用量的小数精度（如 1.22 而非 1）'}</p>
            </div>
            <Button
              variant={usagePrecision ? "default" : "outline"}
              size="sm"
              onClick={() => setUsagePrecision(!usagePrecision)}
            >
              {usagePrecision ? (isEn ? 'Decimal' : '小数') : (isEn ? 'Integer' : '整数')}
            </Button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium">{isEn ? 'Login Private Mode' : '登录隐私模式'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Open browser in incognito/private mode when logging in' : '在线登录时使用浏览器无痕/隐私模式打开'}</p>
            </div>
            <Button
              variant={loginPrivateMode ? "default" : "outline"}
              size="sm"
              onClick={() => setLoginPrivateMode(!loginPrivateMode)}
            >
              <UserX className="h-4 w-4 mr-2" />
              {loginPrivateMode ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token 刷新设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Auto Refresh' : '自动刷新'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Auto Refresh' : '自动刷新'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Auto refresh tokens before expiration' : 'Token 过期前自动刷新，并同步更新账户信息'}</p>
            </div>
            <Button
              variant={autoRefreshEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefreshEnabled)}
            >
              {autoRefreshEnabled ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
            </Button>
          </div>

          {autoRefreshEnabled && (
            <>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p>• {isEn ? 'Auto refresh tokens to keep login' : 'Token 即将过期时自动刷新，保持登录状态'}</p>
                <p>• {isEn ? 'Update usage and subscription info after refresh' : 'Token 刷新后自动更新账户用量、订阅等信息'}</p>
                <p>• {isEn ? 'Check all balances when auto-switch is on' : '开启自动换号时，会定期检查所有账户余额'}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium">{isEn ? 'Check Interval' : '检查间隔'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'How often to check account status' : '每隔多久检查一次账户状态'}</p>
                </div>
                <select
                  className="w-[120px] h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefresh(true, parseInt(e.target.value))}
                >
                  <option value="1">{isEn ? '1 min' : '1 分钟'}</option>
                  <option value="3">{isEn ? '3 min' : '3 分钟'}</option>
                  <option value="5">{isEn ? '5 min' : '5 分钟'}</option>
                  <option value="10">{isEn ? '10 min' : '10 分钟'}</option>
                  <option value="15">{isEn ? '15 min' : '15 分钟'}</option>
                  <option value="20">{isEn ? '20 min' : '20 分钟'}</option>
                  <option value="30">{isEn ? '30 min' : '30 分钟'}</option>
                  <option value="45">{isEn ? '45 min' : '45 分钟'}</option>
                  <option value="60">{isEn ? '60 min' : '60 分钟'}</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium">{isEn ? 'Concurrency' : '刷新并发数'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Number of accounts to refresh simultaneously' : '同时刷新的账号数量，过大可能卡顿'}</p>
                </div>
                <input
                  type="number"
                  className="w-24 h-9 px-3 rounded-lg border bg-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  value={autoRefreshConcurrency}
                  min={1}
                  max={500}
                  onChange={(e) => setAutoRefreshConcurrency(parseInt(e.target.value) || 50)}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium">{isEn ? 'Sync Account Info' : '同步检测账户信息'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Detect usage, subscription, and ban status' : '刷新 Token 时同步检测用量、订阅、封禁状态'}</p>
                </div>
                <Button
                  variant={autoRefreshSyncInfo ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefreshSyncInfo(!autoRefreshSyncInfo)}
                >
                  {autoRefreshSyncInfo ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
                </Button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium">{isEn ? 'Manual Trigger' : '手动触发'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Manually trigger auto-refresh for debugging' : '手动触发一次自动刷新流程（用于调试）'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isManualRefreshing}
                >
                  {isManualRefreshing ? (isEn ? 'Refreshing...' : '刷新中...') : (isEn ? 'Trigger Now' : '立即触发')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* API 类型设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'API Settings' : 'API 设置'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Usage API Type' : '用量查询 API'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Select API type for querying usage limits' : '选择查询账户用量的 API 类型'}</p>
            </div>
            <select
              className="w-[180px] h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={usageApiType}
              onChange={(e) => handleUsageApiTypeChange(e.target.value as 'rest' | 'cbor')}
              disabled={usageApiLoading}
            >
              <option value="rest">REST (GetUsageLimits)</option>
              <option value="cbor">CBOR (GetUserUsageAndLimits)</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p>• <strong>REST</strong>: {isEn ? 'Official Kiro IDE format, recommended' : '官方 Kiro IDE 使用的格式，推荐使用'}</p>
            <p>• <strong>CBOR</strong>: {isEn ? 'Web portal format, may have different fields' : '网页端格式，字段可能有差异'}</p>
          </div>
        </CardContent>
      </Card>

      {/* 代理设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Proxy' : '代理设置'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Enable Proxy' : '启用代理'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'All requests through proxy server' : '所有网络请求将通过代理服务器'}</p>
            </div>
            <Button
              variant={proxyEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setProxy(!proxyEnabled, tempProxyUrl)}
            >
              {proxyEnabled ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
            </Button>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium">{isEn ? 'Proxy URL' : '代理地址'}</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 h-9 px-3 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
                value={tempProxyUrl}
                onChange={(e) => setTempProxyUrl(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProxy(proxyEnabled, tempProxyUrl)}
                disabled={tempProxyUrl === proxyUrl}
              >
                {isEn ? 'Save' : '保存'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Supports HTTP/HTTPS/SOCKS5, format: protocol://host:port' : '支持 HTTP/HTTPS/SOCKS5 代理，格式: protocol://host:port'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 自动换号设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Repeat className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Auto Switch' : '自动换号'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Enable Auto Switch' : '启用自动换号'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Auto switch when balance is low' : '余额不足时自动切换到其他可用账号'}</p>
            </div>
            <Button
              variant={autoSwitchEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoSwitch(!autoSwitchEnabled)}
            >
              {autoSwitchEnabled ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
            </Button>
          </div>

          {autoSwitchEnabled && (
            <>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium">{isEn ? 'Balance Threshold' : '余额阈值'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Switch when balance below this' : '余额低于此值时自动切换'}</p>
                </div>
                <input
                  type="number"
                  className="w-20 h-9 px-3 rounded-lg border bg-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  value={autoSwitchThreshold}
                  min={0}
                  onChange={(e) => setAutoSwitch(true, parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {isEn ? 'Check Interval' : '检查间隔'}
                  </p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'How often to check balance' : '每隔多久检查一次余额'}</p>
                </div>
                <select
                  className="h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  value={autoSwitchInterval}
                  onChange={(e) => setAutoSwitch(true, undefined, parseInt(e.target.value))}
                >
                  <option value="1">{isEn ? '1 min' : '1 分钟'}</option>
                  <option value="3">{isEn ? '3 min' : '3 分钟'}</option>
                  <option value="5">{isEn ? '5 min' : '5 分钟'}</option>
                  <option value="10">{isEn ? '10 min' : '10 分钟'}</option>
                  <option value="15">{isEn ? '15 min' : '15 分钟'}</option>
                  <option value="30">{isEn ? '30 min' : '30 分钟'}</option>
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 批量导入设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Batch Import' : '批量导入'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Concurrency' : '并发数'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Too high may cause API rate limiting' : '同时验证的账号数量，过大可能导致 API 限流'}</p>
            </div>
            <input
              type="number"
              className="w-24 h-9 px-3 rounded-lg border bg-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={batchImportConcurrency}
              min={1}
              max={500}
              onChange={(e) => setBatchImportConcurrency(parseInt(e.target.value) || 100)}
            />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            {isEn ? 'Recommended: 10-100. Too high may cause failures, too low is slow.' : '建议范围: 10-100。设置过大可能导致大量「验证失败」，设置过小则导入速度较慢。'}
          </p>
        </CardContent>
      </Card>

      {/* 系统托盘设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'System Tray' : '系统托盘'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trayLoading ? (
            <div className="text-sm text-muted-foreground">{isEn ? 'Loading...' : '加载中...'}</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{isEn ? 'Enable System Tray' : '启用系统托盘'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Show icon in system tray' : '在系统托盘显示图标'}</p>
                </div>
                <Button
                  variant={traySettings.enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTraySettingChange('enabled', !traySettings.enabled)}
                >
                  {traySettings.enabled ? (isEn ? 'On' : '已开启') : (isEn ? 'Off' : '已关闭')}
                </Button>
              </div>

              {traySettings.enabled && (
                <>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="font-medium">{isEn ? 'Close Button Action' : '关闭按钮行为'}</p>
                      <p className="text-sm text-muted-foreground">{isEn ? 'What happens when you click X' : '点击关闭按钮时的行为'}</p>
                    </div>
                    <select
                      className="w-[140px] h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      value={traySettings.closeAction}
                      onChange={(e) => handleTraySettingChange('closeAction', e.target.value)}
                    >
                      <option value="ask">{isEn ? 'Ask every time' : '每次询问'}</option>
                      <option value="minimize">{isEn ? 'Minimize to tray' : '最小化到托盘'}</option>
                      <option value="quit">{isEn ? 'Quit application' : '退出程序'}</option>
                    </select>
                  </div>
                </>
              )}

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p>• {isEn ? 'Double-click tray icon to show window' : '双击托盘图标可以显示主窗口'}</p>
                <p>• {isEn ? 'Right-click tray icon to show menu' : '右键托盘图标可以显示菜单'}</p>
                <p>• {isEn ? 'Tray menu shows current account info and usage' : '托盘菜单可以查看当前账户信息和用量'}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 快捷键设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Keyboard Shortcuts' : '快捷键'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shortcutLoading ? (
            <div className="text-sm text-muted-foreground">{isEn ? 'Loading...' : '加载中...'}</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{isEn ? 'Show Window' : '显示主窗口'}</p>
                  <p className="text-sm text-muted-foreground">{isEn ? 'Global shortcut to show main window' : '全局快捷键唤起主窗口'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={`w-[160px] h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-center ${isRecordingShortcut ? 'border-primary ring-1 ring-primary animate-pulse' : ''}`}
                    value={isRecordingShortcut ? (isEn ? 'Press keys...' : '请按键...') : showWindowShortcut}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsRecordingShortcut(true)}
                    onBlur={() => setIsRecordingShortcut(false)}
                    readOnly
                    placeholder={isEn ? 'Click to record' : '点击录制'}
                  />
                  {showWindowShortcut && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
                      onClick={() => handleShortcutChange('')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {shortcutError && (
                <p className="text-sm text-destructive">{shortcutError}</p>
              )}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p>• {isEn ? 'Click input and press key combination to record' : '点击输入框后按下组合键自动录制'}</p>
                <p>• {isEn ? 'macOS use Command, Windows/Linux use Ctrl' : 'macOS 使用 Command，Windows/Linux 使用 Ctrl'}</p>
                <p>• {isEn ? 'Click trash icon to clear shortcut' : '点击垃圾桶图标可清除快捷键'}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 机器码管理提示 */}
      {/* 数据管理 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            {isEn ? 'Data Management' : '数据管理'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isEn ? 'Export Data' : '导出数据'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Supports JSON, TXT, CSV, Clipboard' : '支持 JSON、TXT、CSV、剪贴板等多种格式'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {isEn ? 'Export' : '导出'}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium">{isEn ? 'Import Data' : '导入数据'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Import accounts from JSON file' : '从 JSON 文件导入账号数据'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? (isEn ? 'Importing...' : '导入中...') : (isEn ? 'Import' : '导入')}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium text-destructive">{isEn ? 'Clear All Data' : '清除所有数据'}</p>
              <p className="text-sm text-muted-foreground">{isEn ? 'Delete all accounts, groups and tags' : '删除所有账号、分组和标签'}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              {isEn ? 'Clear' : '清除'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        accounts={Array.from(accounts.values())}
        selectedCount={0}
      />
    </div>
  )
}
