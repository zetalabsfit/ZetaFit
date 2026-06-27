'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, IndianRupee,
  CalendarCheck, CheckCircle2, XCircle, Loader2,
  Phone, Clock,
} from 'lucide-react'

interface Props {
  org: any
  ownerName: string
  members: any[]
  payments: any[]
  recentCheckins: any[]
  totalRevenue: number
  activeMembers: number
  expiredMembers: number
}

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const PLAN_PRICES: Record<string, number> = { starter: 999, growth: 1999, pro: 3499 }

export default function GymDetailClient({ org, ownerName, members, payments, recentCheckins, totalRevenue, activeMembers, expiredMembers }: Props) {
  const [plan, setPlan] = useState(org.platform_plan ?? 'starter')
  const [status, setStatus] = useState(org.platform_status ?? 'trial')
  const [trialDays, setTrialDays] = useState('14')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch(`/api/admin/gyms/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, status, extend_trial_days: status === 'trial' ? Number(trialDays) : null }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to update'); setSaving(false); return }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const trialEndsAt = org.platform_trial_ends_at ? new Date(org.platform_trial_ends_at) : null
  const trialExpired = trialEndsAt && trialEndsAt < new Date()
  const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000) : null

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg-card px-6 py-3 flex items-center gap-4 shadow-sm">
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All gyms
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand" />
          <p className="font-semibold text-ink">{org.name}</p>
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-xs font-mono text-brand">{org.gym_code}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-black text-white">Z</div>
          <span className="text-sm font-bold text-brand">ZetaLabs Admin</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Active members', value: String(activeMembers), icon: Users, color: 'bg-brand-muted text-brand' },
            { label: 'Expired members', value: String(expiredMembers), icon: Users, color: 'bg-red-50 text-red-600' },
            { label: 'Total revenue', value: formatINR(totalRevenue), icon: IndianRupee, color: 'bg-green-50 text-green-600' },
            { label: 'Total members', value: String(members.length), icon: Users, color: 'bg-blue-50 text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-ink-muted">{label}</span>
              </div>
              <p className="text-2xl font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Gym info */}
            <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-ink mb-3">Gym details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Owner', value: ownerName },
                  { label: 'City', value: [org.city, org.state].filter(Boolean).join(', ') || '—' },
                  { label: 'Phone', value: org.phone ?? '—' },
                  { label: 'Email', value: org.email ?? '—' },
                  { label: 'GST', value: org.gst_number ?? '—' },
                  { label: 'Joined', value: formatDate(org.created_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-ink-muted">{label}</p>
                    <p className="font-medium text-ink mt-0.5 break-all">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Members list */}
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Members ({members.length})</p>
              </div>
              {members.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-muted text-center">No members yet</p>
              ) : (
                <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                  {members.map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink">{m.full_name}</p>
                        <p className="text-xs text-ink-muted flex items-center gap-1">
                          <Phone className="h-3 w-3" />{m.phone} · {m.plan_name ?? 'No plan'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold capitalize ${m.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                          {m.status}
                        </span>
                        {m.days_remaining !== null && (
                          <p className="text-[10px] text-ink-muted">{m.days_remaining}d left</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent payments */}
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-semibold text-ink">Recent payments</p>
              </div>
              {payments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-muted text-center">No payments yet</p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p: any) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-2.5">
                      <p className="text-sm font-medium text-ink">{formatINR(p.total_amount)}</p>
                      <p className="text-xs text-ink-muted">{formatDate(p.paid_at ?? p.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column — admin controls */}
          <div className="space-y-4">
            {/* Plan & status control */}
            <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm space-y-4">
              <p className="text-sm font-semibold text-ink">Admin controls</p>

              {/* Trial status */}
              <div className="rounded-lg bg-bg-page p-3">
                <p className="text-xs font-medium text-ink-muted mb-1">Trial</p>
                {trialEndsAt ? (
                  <p className={`text-sm font-semibold ${trialExpired ? 'text-red-600' : 'text-ink'}`}>
                    {trialExpired ? `Expired ${formatDate(org.platform_trial_ends_at)}` : `Expires ${formatDate(org.platform_trial_ends_at)} (${daysLeft}d left)`}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">No trial set</p>
                )}
              </div>

              {/* Plan selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Platform plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                >
                  <option value="starter">Starter — ₹999/mo</option>
                  <option value="growth">Growth — ₹1,999/mo</option>
                  <option value="pro">Pro — ₹3,499/mo</option>
                </select>
              </div>

              {/* Status selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Account status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active (paid)</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Extend trial */}
              {status === 'trial' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Extend trial by (days)</label>
                  <input
                    type="number"
                    value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                  />
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Saved</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>

            {/* Recent check-ins */}
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border px-5 py-3 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-brand" />
                <p className="text-sm font-semibold text-ink">Recent check-ins</p>
              </div>
              {recentCheckins.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <Clock className="h-6 w-6 text-ink-muted mb-1" />
                  <p className="text-xs text-ink-muted">No activity yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recentCheckins.map((c: any) => (
                    <li key={c.id} className="flex items-center justify-between px-5 py-2.5">
                      {c.result === 'allowed'
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      }
                      <p className="flex-1 ml-2 text-xs text-ink-muted">{formatDateTime(c.checked_in_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
