import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui'
import { Activity, Download, Trash2, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '../ui'
import { useTranslation } from '@/hooks/useTranslation'

interface LogEntry {
  timestamp: string
  level: string
  category: string
  message: string
  data?: unknown
}

export function LogsPage() {
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLive, setIsLive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    if (isLive && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Fetch logs from API
  const fetchLogs = async () => {
    try {
      const logEntries = await window.api.proxyGetLogs(100)
      setLogs(logEntries || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all logs
  const clearLogs = async () => {
    try {
      await window.api.proxyClearLogs()
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  // Export logs
  const exportLogs = () => {
    const logText = logs.map(log => 
      `${log.timestamp} | ${log.level.padEnd(5)} | ${log.category}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kiro-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-400'
      case 'WARN': return 'text-yellow-400'
      case 'INFO': return 'text-blue-400'
      case 'DEBUG': return 'text-gray-400'
      default: return 'text-gray-300'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  // Initial load and polling
  useEffect(() => {
    fetchLogs()
    
    let interval: NodeJS.Timeout
    if (isLive) {
      interval = setInterval(fetchLogs, 2000) // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLive])

  // Auto-scroll when logs change
  useEffect(() => {
    scrollToBottom()
  }, [logs, isLive])

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/25">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{isEn ? 'System Logs' : '系统日志'}</h1>
            <p className="text-muted-foreground">{isEn ? 'Real-time server activity streaming.' : '实时服务器活动流'}</p>
          </div>
        </div>
      </div>

      {/* Logs Card */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[32px] overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              {isEn ? 'System Output' : '系统输出'}
              <span className="text-sm text-muted-foreground font-normal">
                {logs.length} {isEn ? 'events captured' : '个事件'}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Live Toggle */}
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="gap-2"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isLive ? (isEn ? 'Live' : '实时') : (isEn ? 'Paused' : '暂停')}
              </Button>
              
              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
              >
                <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {/* Clear */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Logs Container */}
          <div 
            ref={containerRef}
            className="bg-[#2A2A2A] text-gray-100 font-mono text-sm h-[500px] overflow-y-auto p-4 space-y-1"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">{isEn ? 'Loading logs...' : '加载日志中...'}</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isEn ? 'No logs available' : '暂无日志'}</p>
                  <p className="text-xs mt-2">{isEn ? 'Start the proxy server to see activity' : '启动代理服务器以查看活动'}</p>
                </div>
              </div>
            ) : (
              <>
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-3 py-1 hover:bg-white/5 rounded px-2 -mx-2">
                    <span className="text-gray-500 shrink-0 w-20">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`shrink-0 w-12 ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-400 shrink-0 w-24 truncate">
                      {log.category}
                    </span>
                    <span className="text-gray-200 flex-1 break-all">
                      {log.message}
                      {log.data ? (
                        <span className="text-gray-500 ml-2">
                          {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}