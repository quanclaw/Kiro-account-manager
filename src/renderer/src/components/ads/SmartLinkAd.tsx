import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

interface SmartLinkAdProps {
  enabled?: boolean
  url?: string
  text?: string
  className?: string
}

export function SmartLinkAd({ 
  enabled = true,
  url = 'https://www.effectivegatecpm.com/iccgfzejj?key=73846ae2fe202fee3bc083b30d8889f9',
  text = 'Support Development',
  className = ''
}: SmartLinkAdProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check if user has dismissed smartlink ads recently
    const lastDismissed = localStorage.getItem('smartlink-dismissed-time')
    if (lastDismissed) {
      const timeDiff = Date.now() - parseInt(lastDismissed)
      // Show ads again after 2 hours
      if (timeDiff < 2 * 60 * 60 * 1000) {
        setIsVisible(false)
      }
    }
  }, [])

  const handleClick = () => {
    console.log('SmartLink ad clicked:', url)
    window.api?.openExternal?.(url)
    
    // Track click and hide for a while
    localStorage.setItem('smartlink-clicked-time', Date.now().toString())
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(false)
    localStorage.setItem('smartlink-dismissed-time', Date.now().toString())
  }

  if (!enabled || !isVisible) return null

  return (
    <div className={`group relative ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 w-full"
      >
        <ExternalLink className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300">
          {text}
        </span>
        <div className="ml-auto text-xs text-muted-foreground/60">
          Ad
        </div>
      </button>
      
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  )
}