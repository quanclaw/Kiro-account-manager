import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { adConfig } from '@/config/ads'

interface AdModalProps {
  adUrl?: string
  showInterval?: number // minutes
  width?: number
  height?: number
}

export function AdModal({ 
  adUrl = adConfig.modal.url,
  showInterval = adConfig.modal.showInterval,
  width = adConfig.modal.width,
  height = adConfig.modal.height
}: AdModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkAndShowAd = () => {
      const lastShown = localStorage.getItem('ad-modal-last-shown')
      const now = Date.now()
      
      if (!lastShown || (now - parseInt(lastShown)) > showInterval * 60 * 1000) {
        setIsVisible(true)
        localStorage.setItem('ad-modal-last-shown', now.toString())
      }
    }

    // Show ad after 5 seconds of app usage
    const timer = setTimeout(checkAndShowAd, 5000)
    
    // Set up interval to show ads periodically
    const interval = setInterval(checkAndShowAd, showInterval * 60 * 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [showInterval])

  const handleClose = () => {
    setIsVisible(false)
  }

  const handleAdClick = () => {
    console.log('Modal ad clicked:', adUrl)
    window.api?.openExternal?.(adUrl)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-card rounded-xl shadow-xl z-10 overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div 
          className="cursor-pointer"
          style={{ width, height }}
          onClick={handleAdClick}
        >
          <iframe
            src={adUrl}
            width={width}
            height={height}
            frameBorder="0"
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
        
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60">
          Ad • Click to support
        </div>
      </div>
    </div>
  )
}