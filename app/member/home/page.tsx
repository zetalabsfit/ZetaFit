import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberLayout from '@/components/member-layout'
import { Flame, Calendar, Trophy } from 'lucide-react'
import ScanQRButton from './scan-qr-button'

export default async function MemberHomePage() {
  console.log('[MemberHome] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/member/login')

  console.log('[MemberHome] Auth user:', user.id, user.email)

  // Try by auth_user_id first
  let { data: member } = await supabase
    .from('members_with_subscription')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Try by email if not found
  if (!member && user.email) {
    console.log('[MemberHome] Trying email match:', user.email)
    const { data: byEmail } = await supabase
      .from('members_with_subscription')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (byEmail) {
      member = byEmail
      // Link the auth account
      await supabase
        .from('members')
        .update({ auth_user_id: user.id })
        .eq('id', byEmail.id)
      console.log('[MemberHome] Linked member by email:', byEmail.full_name)
    }
  }

  console.log('[MemberHome] Member:', member?.full_name ?? 'NOT FOUND', 'Days remaining:', member?.days_remaining)

  // Not linked — show a friendly error, don't redirect
  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand px-4">
        <div className="w-full max-w-sm rounded-2xl bg-bg-card p-6 shadow-xl text-center">
          <div className="mb-3 text-4xl">🏋️</div>
          <h2 className="text-lg font-semibold text-ink">Account not linked</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Your Google account (<strong>{user.email}</strong>) is not linked to any member at this gym.
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Ask the front desk to add your email to your membership profile.
          </p>
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg-page"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Attendance this month
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthAttendance } = await supabase
    .from('attendance')
    .select('id')
    .eq('member_id', member.id)
    .gte('checked_in_at', firstOfMonth)
    .eq('result', 'allowed')

  const checkInsThisMonth = monthAttendance?.length ?? 0

  // Recent payments
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('id, total_amount, payment_method, paid_at, invoice_number')
    .eq('member_id', member.id)
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(3)

  const daysRemaining = member.days_remaining ?? 0
  const totalDays = member.duration_days ?? 30
  const progress = Math.max(0, Math.min(1, daysRemaining / totalDays))
  const ringColor = daysRemaining > 14 ? '#1D9E75' : daysRemaining > 7 ? '#EF9F27' : '#E24B4A'

  function formatINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }
  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function formatMethod(m: string) {
    return ({ upi: 'UPI', cash: 'Cash', card: 'Card' } as Record<string, string>)[m] ?? m
  }

  return (
    <MemberLayout activePage="home" memberName={member.full_name} memberId={member.id}>
      <div className="px-4 py-3 space-y-4">
        {/* Greeting */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs text-ink-muted">Good day</p>
            <p className="text-lg font-bold text-ink">{member.full_name} 👋</p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: '#1D9E75' }}
          >
            {member.initials}
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
          <svg viewBox="0 0 140 140" className="w-32 h-32">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#F1F4F7" strokeWidth="12" />
            <circle
              cx="70" cy="70" r="54"
              fill="none" stroke={ringColor} strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54 * progress} ${2 * Math.PI * 54 * (1 - progress)}`}
              strokeDashoffset={2 * Math.PI * 54 * 0.25}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1F2937" fontFamily="Inter">
              {daysRemaining}
            </text>
            <text x="70" y="82" textAnchor="middle" fontSize="12" fill="#9CA3AF" fontFamily="Inter">
              days left
            </text>
          </svg>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-light" />
            <span className="text-sm font-medium text-ink-secondary">
              {member.plan_name ?? 'No plan'} · {member.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">Expires {formatDate(member.end_date)}</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Flame, label: 'This month', value: String(checkInsThisMonth) },
            { icon: Calendar, label: 'Plan price', value: member.plan_price ? formatINR(member.plan_price) : '—' },
            { icon: Trophy, label: 'Status', value: daysRemaining > 0 ? 'Active' : 'Expired' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-bg-card p-3 text-center shadow-sm">
              <Icon className="mx-auto mb-1 h-4 w-4 text-brand-light" />
              <p className="text-sm font-bold text-ink">{value}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Scan QR check-in button */}
        <ScanQRButton />

        {/* Renewal nudge */}
        {daysRemaining <= 7 && daysRemaining >= 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3.5">
            <span className="text-2xl shrink-0">⏳</span>
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {daysRemaining === 0 ? 'Your plan expires today!' : `Expires in ${daysRemaining} days`}
              </p>
              <p className="text-xs text-orange-600">Visit the front desk to renew.</p>
            </div>
          </div>
        )}

        {/* Recent payments */}
        <div className="rounded-2xl border border-border bg-bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Recent payments</p>
          </div>
          {!recentPayments || recentPayments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No payments yet</p>
          ) : (
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
          )}
        </div>
      </div>
    </MemberLayout>
  )
}
