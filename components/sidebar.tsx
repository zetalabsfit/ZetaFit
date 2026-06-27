'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, Users, Banknote,
  CalendarCheck, BarChart3, Settings, LogOut,
  Dumbbell, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/members', label: 'All members', icon: Users },
      { href: '/members?filter=expiring', label: 'Expiring soon', icon: Clock, badge: 'expiring' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/plans', label: 'Plans & pricing', icon: CreditCard },
      { href: '/payments', label: 'Payments', icon: Banknote },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/workouts', label: 'Workouts', icon: Dumbbell },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  gymName?: string
  orgPlan?: string
  orgStatus?: string
  trialEndsAt?: string | null
  expiringCount?: number
}

export default function Sidebar({ gymName = 'Your Gym', orgPlan = 'starter', orgStatus = 'trial', trialEndsAt = null, expiringCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const initials = gymName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">Z</div>
        <span className="font-semibold text-brand">ZetaFit</span>
      </div>

      {/* Gym info */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-page text-xs font-semibold text-ink-secondary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Gym</p>
          <p className="truncate text-sm font-semibold text-ink">{gymName}</p>
        </div>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const isActive = pathname === href || (href !== '/members?filter=expiring' && pathname.startsWith(href.split('?')[0] + '/'))
                const badgeCount = badge === 'expiring' ? expiringCount : 0

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex h-8 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-muted text-brand'
                        : 'text-ink-secondary hover:bg-bg-page hover:text-ink'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
                    <span className="flex-1 truncate">{label}</span>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <div className="px-3 py-1.5 rounded-lg bg-brand-muted flex items-center justify-between">
          <span className="text-xs font-semibold text-brand capitalize">ZetaFit {orgPlan}</span>
          {orgStatus === 'trial' && trialEndsAt && (
            <span className="text-[10px] text-brand-light">
              Renews {new Date(trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {orgStatus === 'active' && (
            <span className="text-[10px] text-green-600 font-medium">Active</span>
          )}
          {orgStatus === 'trial' && !trialEndsAt && (
            <span className="text-[10px] text-amber-600">Trial</span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
