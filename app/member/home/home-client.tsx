'use client'

interface Member {
  id: string; full_name: string; initials: string
  plan_name: string | null; plan_price: number | null
  end_date: string | null; days_remaining: number | null
  subscription_status: string | null; duration_days: number | null
}

interface Props {
  member: Member
  streak: number
  totalVisits: number
  checkInsThisMonth: number
  daysRemaining: number
  progress: number
  recentPayments: any[]
  recentWorkoutLogs: any[]
  recentBodyStats: any[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMethod(m: string) {
  return ({ upi: 'UPI', cash: 'Cash', card: 'Card' } as Record<string, string>)[m] ?? m
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? 'Yesterday' : `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function workoutIcon(type: string) {
  const map: Record<string, string> = {
    strength: '🏋️', cardio: '🏃', flexibility: '🧘', hiit: '⚡',
    yoga: '🌿', sports: '⚽', other: '💪',
  }
  return map[type] ?? '💪'
}
const ringColor = (days: number) => days > 14 ? '#1D9E75' : days > 7 ? '#EF9F27' : '#E24B4A'

export default function MemberHomeClient({
  member, streak, totalVisits, checkInsThisMonth,
  daysRemaining, progress, recentPayments,
  recentWorkoutLogs, recentBodyStats,
}: Props) {

  // Build unified activity feed
  const feed = [
    ...([] as any[]).concat(
      recentWorkoutLogs.map(w => ({
        type: 'workout', icon: workoutIcon(w.workout_type),
        title: `Logged workout`,
        sub: `${w.workout_type} · ${w.duration_minutes ? w.duration_minutes + ' min' : ''}`,
        date: w.logged_at,
      })),
      recentBodyStats.map(b => ({
        type: 'weight', icon: '⚖️',
        title: 'Logged weight',
        sub: `${b.weight_kg} kg`,
        date: b.logged_at,
      })),
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  ]

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-ink-muted">{greeting()},</p>
          <p className="text-lg font-bold text-ink">{member.full_name} 👋</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {member.initials}
        </div>
      </div>

      {/* Progress ring */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <svg viewBox="0 0 140 140" className="w-32 h-32">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#F1F4F7" strokeWidth="12" />
          <circle cx="70" cy="70" r="54" fill="none"
            stroke={ringColor(daysRemaining)} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54 * progress} ${2 * Math.PI * 54 * (1 - progress)}`}
            strokeDashoffset={2 * Math.PI * 54 * 0.25}
            transform="rotate(-90 70 70)"
          />
          <text x="70" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1F2937" fontFamily="Inter">{daysRemaining}</text>
          <text x="70" y="82" textAnchor="middle" fontSize="12" fill="#9CA3AF" fontFamily="Inter">days left</text>
        </svg>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" />
          <span className="text-sm font-medium text-ink-secondary">
            {member.plan_name ?? 'No plan'} · {member.subscription_status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">Expires {formatDate(member.end_date)}</p>
      </div>

      {/* 3 stat tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border bg-bg-card p-3 text-center shadow-sm">
          <p className="text-xl">📍</p>
          <p className="text-lg font-bold text-ink mt-1">{checkInsThisMonth}</p>
          <p className="text-[10px] text-ink-muted mt-0.5">This month</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-3 text-center shadow-sm">
          <p className="text-xl">🔥</p>
          <p className="text-lg font-bold text-ink mt-1">{streak}</p>
          <p className="text-[10px] text-ink-muted mt-0.5">Day streak</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-3 text-center shadow-sm">
          <p className="text-xl">🏅</p>
          <p className="text-lg font-bold text-ink mt-1">{totalVisits}</p>
          <p className="text-[10px] text-ink-muted mt-0.5">Total visits</p>
        </div>
      </div>

      {/* Streak-linked renewal nudge */}
      {daysRemaining <= 14 && daysRemaining >= 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3.5">
          <span className="text-2xl shrink-0">⏳</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">
              {daysRemaining === 0
                ? 'Your plan expires today!'
                : streak > 0
                  ? `Renew now to keep your ${streak}-day streak going`
                  : `Your plan expires in ${daysRemaining} days`}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">Visit the front desk to renew.</p>
          </div>
        </div>
      )}

      {/* Unified activity feed */}
      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Recent activity</p>
            <a href="/member/workouts" className="text-xs font-medium text-brand hover:underline">History →</a>
          </div>
          <ul className="divide-y divide-border">
            {feed.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-page text-lg">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-ink-muted capitalize">{item.sub}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">{timeAgo(item.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Recent payments</p>
          </div>
          <ul className="divide-y divide-border">
            {recentPayments.map(p => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{formatINR(p.total_amount)}</p>
                  <p className="text-xs text-ink-muted">{formatMethod(p.payment_method)} · {p.invoice_number}</p>
                </div>
                <span className="text-xs text-ink-muted">{formatDate(p.paid_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
