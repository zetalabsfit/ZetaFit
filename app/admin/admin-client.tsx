'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, IndianRupee, TrendingUp,
  Search, ExternalLink, Shield, Clock,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react'

interface Gym {
  id: string
  name: string
  city: string
  state: string
  gym_code: string
  plan: string
  status: string
  trial_ends_at: string | null
  created_at: string
  owner_name: string
  active_members: number
  revenue_all_time: number
  revenue_this_month: number
  checkins_7d: number
}

interface Props {
  gyms: Gym[]
  adminName: string
  totalMRR: number
  totalRevenue: number
  totalMembers: number
  totalGyms: number
  activeGyms: number
  trialGyms: number
}

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusBadge(status: string, trialEndsAt: string | null) {
  if (status === 'active') return { label: 'Active', class: 'bg-green-50 text-green-700', icon: CheckCircle2 }
  if (status === 'suspended') return { label: 'Suspended', class: 'bg-red-50 text-red-600', icon: XCircle }
  // trial
  const expired = trialEndsAt && new Date(trialEndsAt) < new Date()
  if (expired) return { label: 'Trial expired', class: 'bg-red-50 text-red-600', icon: AlertTriangle }
  const daysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000) : null
  return {
    label: daysLeft !== null ? `Trial · ${daysLeft}d left` : 'Trial',
    class: 'bg-yellow-50 text-yellow-700',
    icon: Clock,
  }
}

function planBadge(plan: string) {
  const map: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    growth: 'bg-blue-50 text-blue-700',
    pro: 'bg-purple-50 text-purple-700',
  }
  return map[plan] ?? 'bg-gray-100 text-gray-600'
}

function activityColor(checkins: number) {
  if (checkins === 0) return 'text-red-500'
  if (checkins < 5) return 'text-yellow-600'
  return 'text-green-600'
}

export default function AdminClient({ gyms, adminName, totalMRR, totalRevenue, totalMembers, totalGyms, activeGyms, trialGyms }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  const filtered = gyms.filter(g => {
    const matchSearch = !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.city.toLowerCase().includes(search.toLowerCase()) ||
      g.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      g.gym_code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || g.status === statusFilter
    const matchPlan = planFilter === 'all' || g.plan === planFilter
    return matchSearch && matchStatus && matchPlan
  })

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg-card px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">Z</div>
          <div>
            <p className="text-sm font-bold text-ink">ZetaLabs Admin</p>
            <p className="text-xs text-ink-muted">Super admin portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-brand-muted px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-semibold text-brand">{adminName}</span>
          </div>
          <Link href="/dashboard" className="text-xs text-ink-muted hover:text-ink">← Owner portal</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total gyms', value: String(totalGyms), sub: `${activeGyms} active · ${trialGyms} trial`, icon: Building2, color: 'bg-brand-muted text-brand' },
            { label: 'Platform MRR', value: formatINR(totalMRR), sub: 'Active subscriptions only', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
            { label: 'All time revenue', value: formatINR(totalRevenue), sub: 'Across all gyms', icon: IndianRupee, color: 'bg-blue-50 text-blue-600' },
            { label: 'Total members', value: String(totalMembers), sub: 'Active across all gyms', icon: Users, color: 'bg-purple-50 text-purple-600' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-ink-muted">{label}</span>
              </div>
              <p className="text-2xl font-bold text-ink">{value}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search gym, city, owner, code…"
              className="h-9 w-72 rounded-lg border border-border-medium bg-bg-card pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border-medium bg-bg-card px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="h-9 rounded-lg border border-border-medium bg-bg-card px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
          >
            <option value="all">All plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
          <span className="ml-auto self-center text-xs text-ink-muted">{filtered.length} gyms</span>
        </div>

        {/* Gyms table */}
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden shadow-sm">
          {/* Header */}
          <div className="hidden grid-cols-[1.5fr_100px_100px_80px_100px_100px_80px_40px] gap-4 border-b border-border bg-bg-page px-5 py-3 lg:grid">
            {['Gym', 'Plan', 'Status', 'Members', 'Revenue/mo', 'All time', 'Activity', ''].map(h => (
              <span key={h} className="text-xs font-medium uppercase tracking-wide text-ink-muted">{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-muted">No gyms found</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(gym => {
                const badge = statusBadge(gym.status, gym.trial_ends_at)
                const BadgeIcon = badge.icon
                return (
                  <li
                    key={gym.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 hover:bg-bg-page lg:grid-cols-[1.5fr_100px_100px_80px_100px_100px_80px_40px]"
                  >
                    {/* Gym name */}
                    <div>
                      <p className="text-sm font-semibold text-ink">{gym.name}</p>
                      <p className="text-xs text-ink-muted">
                        {[gym.city, gym.state].filter(Boolean).join(', ')} · {gym.gym_code} · {gym.owner_name}
                      </p>
                    </div>

                    {/* Plan */}
                    <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize lg:inline-flex ${planBadge(gym.plan)}`}>
                      {gym.plan}
                    </span>

                    {/* Status */}
                    <div className={`hidden items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium lg:flex ${badge.class}`}>
                      <BadgeIcon className="h-3 w-3 shrink-0" />
                      {badge.label}
                    </div>

                    {/* Members */}
                    <span className="hidden text-sm font-semibold text-ink lg:block">{gym.active_members}</span>

                    {/* Revenue this month */}
                    <span className="hidden text-sm text-ink lg:block">{formatINR(gym.revenue_this_month)}</span>

                    {/* All time revenue */}
                    <span className="hidden text-sm text-ink-secondary lg:block">{formatINR(gym.revenue_all_time)}</span>

                    {/* Activity last 7d */}
                    <div className="hidden lg:block">
                      <p className={`text-sm font-semibold ${activityColor(gym.checkins_7d)}`}>
                        {gym.checkins_7d}
                      </p>
                      <p className="text-[10px] text-ink-muted">check-ins/7d</p>
                    </div>

                    {/* View */}
                    <Link
                      href={`/admin/gyms/${gym.id}`}
                      className="hidden rounded-lg p-1.5 text-ink-muted hover:bg-brand-muted hover:text-brand lg:block"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    {/* Mobile */}
                    <div className="flex items-center gap-2 lg:hidden">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.class}`}>{badge.label}</span>
                      <Link href={`/admin/gyms/${gym.id}`} className="text-ink-muted hover:text-brand">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Churn risk */}
        {gyms.filter(g => g.checkins_7d === 0 && g.status === 'trial').length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Churn risk — trial gyms with 0 activity in 7 days
            </p>
            <div className="flex flex-wrap gap-2">
              {gyms.filter(g => g.checkins_7d === 0 && g.status === 'trial').map(g => (
                <Link
                  key={g.id}
                  href={`/admin/gyms/${g.id}`}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-100"
                >
                  {g.name} · {g.city}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
