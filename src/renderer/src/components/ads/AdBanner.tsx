import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { adConfig } from '@/config/ads'

interface AdBannerProps {
  adUrl?: string
  width?: number
  height?: number
  closeable?: boolean
  className?: string
}

export function AdBanner({ 
  adUrl = adConfig.banner.url, 
  width = adConfig.banner.width, 
  height = adConfig.banner.height, 
  closeable = adConfig.banner.closeable,
  className = '' 
}: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check if user has dismissed ads recently
    const lastDismissed = localStorage.getItem('ad-dismissed-time')
    if (lastDismissed) {
      const timeDiff = Date.now() - parseInt(lastDismissed)
      // Show ads again after 1 hour
      if (timeDiff < 60 * 60 * 1000) {
        setIsVisible(false)
      }
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem('ad-dismissed-time', Date.now().toString())
  }

  const handleAdClick = () => {
    // Track ad clicks
    console.log('Ad clicked:', adUrl)
    // Open in external browser
    window.api?.openExternal?.(adUrl)
  }

  if (!isVisible) return null

  return (
    <div className={`relative bg-muted/30 rounded-lg border border-border overflow-hidden ${className}`}>
      {closeable && (
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      
      <div 
        className="cursor-pointer flex items-center justify-center"
        style={{ width, height }}
        onClick={handleAdClick}
      >
        {/* Support message */}
        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
          <div className="text-sm font-medium text-foreground mb-1">
            Support Development
          </div>
          <div className="text-xs text-muted-foreground">
            Thank you for using Kiro Account Manager
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground/60 px-1">
        Ad
      </div>
    </div>
  )
}