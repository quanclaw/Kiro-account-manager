import { Home, Users, Settings, Info, Server, Activity, MessageCircle, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import kiroLogo from '@/assets/Kiro Logo.png'
import { useAccountsStore } from '@/store/accounts'
import { useTranslation } from '@/hooks/useTranslation'
import { SmartLinkAd } from '../ads/SmartLinkAd'
import { adConfig } from '@/config/ads'

export type PageType = 'home' | 'accounts' | 'proxy' | 'chat' | 'logs' | 'api-examples' | 'settings' | 'about'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItemsConfig: { id: PageType; labelKey: string; icon: React.ElementType }[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'accounts', labelKey: 'nav.accounts', icon: Users },
  { id: 'proxy', labelKey: 'nav.proxy', icon: Server },
  { id: 'chat', labelKey: 'nav.chat', icon: MessageCircle },
  { id: 'logs', labelKey: 'nav.logs', icon: Activity },
  { id: 'api-examples', labelKey: 'nav.apiExamples', icon: Code },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings },
  { id: 'about', labelKey: 'nav.about', icon: Info },
]

export function Sidebar({ currentPage, onPageChange, collapsed }: SidebarProps) {
  const { t } = useTranslation()
  const { accounts } = useAccountsStore()
  const activeAccount = Array.from(accounts.values()).find(a => a.isActive)

  return (
    <aside 
      className={cn(
        "flex-shrink-0 bg-[#1A1A1A] text-white flex flex-col justify-between rounded-l-[32px] pt-4 pb-6 transition-all duration-300",
        collapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      <div className="flex flex-col items-center lg:items-start lg:px-6">
        {/* Logo Area */}
        <div className="mb-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden p-1.5">
            <img src={kiroLogo} alt="Kiro" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-white font-bold text-lg tracking-tight block leading-none">Kiro</span>
              <span className="text-[#999999] text-xs font-medium tracking-wide">
                {t('common.unknown') === 'Unknown' ? 'Kiro as a Service' : 'Kiro 即服务'}
              </span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="space-y-2 w-full">
          {menuItemsConfig.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            const label = t(item.labelKey)
            const showBadge = item.id === 'accounts' && activeAccount
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-[#2A2A2A] text-white" 
                    : "text-[#999999] hover:text-white hover:bg-[#2A2A2A]",
                  collapsed ? "justify-center" : "gap-3"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn(
                  "h-6 w-6 transition-all duration-200 shrink-0",
                  isActive && "scale-110"
                )} />
                {!collapsed && (
                  <span className="font-medium text-sm">
                    {label}
                  </span>
                )}
                {showBadge && isActive && !collapsed && (
                  <span className="ml-auto h-2 w-2 bg-lime-400 rounded-full" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Area - Language selector and Ad */}
      <div className="flex flex-col items-center lg:items-start lg:px-6 space-y-4">
        {activeAccount && !collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2A2A2A] w-full">
            <Activity className="h-4 w-4 text-lime-400" />
            <span className="text-xs text-[#999999] truncate">
              {activeAccount.email?.split('@')[0] || 'Active'}
            </span>
          </div>
        )}
        
        {/* SmartLink Ad */}
        {!collapsed && adConfig.smartlink.enabled && (
          <div className="w-full">
            <SmartLinkAd 
              url={adConfig.smartlink.url}
              text={adConfig.smartlink.text}
              className="w-full"
            />
          </div>
        )}
      </div>
    </aside>
  )
}
