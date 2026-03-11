import { useEffect } from 'react'
import { adConfig } from '@/config/ads'

interface PopunderAdProps {
  enabled?: boolean
  delay?: number // delay in seconds before first trigger
}

export function PopunderAd({ enabled = adConfig.popunder.enabled, delay = adConfig.popunder.delay }: PopunderAdProps) {
  useEffect(() => {
    if (!enabled) return

    // Check if script is already loaded
    if (document.querySelector('script[src*="authoritieswoundjoint.com"]')) {
      return
    }

    let scriptLoaded = false

    const loadScript = () => {
      if (scriptLoaded) return
      
      const script = document.createElement('script')
      script.src = adConfig.popunder.scriptUrl
      script.async = true
      script.crossOrigin = 'anonymous'
      
      // Add error handling
      script.onerror = (error) => {
        console.warn('Popunder ad script failed to load:', error)
      }
      
      script.onload = () => {
        console.log('Popunder ad script loaded successfully')
        scriptLoaded = true
        
        // The script should handle popunder triggers automatically
        // Just log user interactions for debugging
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement
          if (target.tagName === 'BUTTON' || 
              target.tagName === 'A' || 
              target.closest('button') || 
              target.closest('a') ||
              target.closest('[role="button"]')) {
            
            console.log('User interaction detected - popunder should trigger automatically')
          }
        }, { passive: true })
      }
      
      document.head.appendChild(script)
    }

    // Load script after initial delay
    const timer = setTimeout(loadScript, delay * 1000)

    // Also load on first user interaction
    const handleFirstInteraction = () => {
      loadScript()
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction, { once: true })
    document.addEventListener('keydown', handleFirstInteraction, { once: true })

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      
      // Clean up script on unmount
      const existingScript = document.querySelector('script[src*="authoritieswoundjoint.com"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [enabled, delay])

  // This component doesn't render anything visible
  return null
}