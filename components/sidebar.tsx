'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, Users, Banknote,
  CalendarCheck, BarChart3, Settings, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/plans', label: 'Plans', icon: CreditCard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/payments', label: 'Payments', icon: Banknote },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  gymName?: string
  orgPlan?: string
}

export default function Sidebar({ gymName = 'Your Gym', orgPlan = 'starter' }: SidebarProps) {
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
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-page text-xs font-semibold text-ink-secondary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Gym</p>
          <p className="truncate text-sm font-semibold text-ink">{gymName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-muted text-brand'
                  : 'text-ink-secondary hover:bg-bg-page hover:text-ink'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — plan + sign out */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <p className="px-3 text-xs text-ink-muted capitalize">{orgPlan} plan · trial</p>
        <button
          onClick={handleSignOut}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
