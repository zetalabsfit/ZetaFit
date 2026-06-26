'use client'
import Link from 'next/link'
import { Home, Star, CalendarCheck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Page = 'home' | 'plan' | 'attendance'

const NAV = [
  { key: 'home' as Page, href: '/member/home', label: 'Home', icon: Home },
  { key: 'plan' as Page, href: '/member/plan', label: 'My plan', icon: Star },
  { key: 'attendance' as Page, href: '/member/attendance', label: 'Attendance', icon: CalendarCheck },
]

interface Props {
  children: React.ReactNode
  activePage: Page
  memberName: string
  memberId: string
}

export default function MemberLayout({ children, activePage, memberName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/member/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      {/* Top header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg-card px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">Z</div>
          <span className="font-semibold text-brand">ZetaFit</span>
          <span className="ml-2 text-xs text-ink-muted">Member Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-secondary">{memberName}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-bg-page"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Side nav on desktop */}
        <aside className="hidden w-48 shrink-0 border-r border-border bg-bg-card lg:flex lg:flex-col">
          <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
            {NAV.map(({ key, href, label, icon: Icon }) => {
              const isActive = activePage === key
              return (
                <Link
                  key={key}
                  href={href}
                  className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-muted text-brand' : 'text-ink-secondary hover:bg-bg-page'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg-card px-2 pb-2 pt-1 lg:hidden">
        <ul className="flex items-center justify-around">
          {NAV.map(({ key, href, label, icon: Icon }) => {
            const isActive = activePage === key
            return (
              <li key={key}>
                <Link
                  href={href}
                  className={`flex min-h-[52px] min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-colors ${
                    isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
