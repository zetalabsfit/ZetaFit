import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberLayout from '@/components/member-layout'
import MemberHomeClient from './home-client'

export default async function MemberHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/member/login')

  const { data: member } = await supabase
    .from('members_with_subscription')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member) {
    // Try email match
    const { data: byEmail } = await supabase
      .from('members_with_subscription')
      .select('*')
      .eq('email', user.email ?? '')
      .maybeSingle()

    if (byEmail) {
      await supabase.from('members').update({ auth_user_id: user.id }).eq('id', byEmail.id)
    }

    if (!byEmail) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand px-4">
          <div className="w-full max-w-sm rounded-2xl bg-bg-card p-6 shadow-xl text-center">
            <div className="mb-3 text-4xl">🏋️</div>
            <h2 className="text-lg font-semibold text-ink">Account not linked</h2>
            <p className="mt-2 text-sm text-ink-muted">Your Google account ({user.email}) is not linked to a member. Ask the front desk to add your email.</p>
          </div>
        </div>
      )
    }
  }

  const m = member!

  // All attendance for streak + total visits
  const { data: allAttendance } = await supabase
    .from('attendance')
    .select('checked_in_at, result')
    .eq('member_id', m.id)
    .eq('result', 'allowed')
    .order('checked_in_at', { ascending: false })

  // Calculate streak
  const attendedDates = new Set(
    (allAttendance ?? []).map(a => new Date(a.checked_in_at).toISOString().split('T')[0])
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (attendedDates.has(key)) streak++
    else if (i > 0) break
  }
  const totalVisits = allAttendance?.length ?? 0

  // This month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const checkInsThisMonth = (allAttendance ?? []).filter(a => a.checked_in_at >= firstOfMonth).length

  // Recent payments
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('id, total_amount, payment_method, paid_at, invoice_number')
    .eq('member_id', m.id)
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(3)

  // Recent workout logs
  const { data: recentWorkoutLogs } = await supabase
    .from('workout_logs')
    .select('id, workout_type, duration_minutes, logged_at')
    .eq('member_id', m.id)
    .order('logged_at', { ascending: false })
    .limit(5)

  // Recent body stats
  const { data: recentBodyStats } = await supabase
    .from('body_stats')
    .select('id, weight_kg, logged_at')
    .eq('member_id', m.id)
    .order('logged_at', { ascending: false })
    .limit(3)

  const daysRemaining = m.days_remaining ?? 0
  const totalDays = m.duration_days ?? 30
  const progress = Math.max(0, Math.min(1, daysRemaining / totalDays))

  return (
    <MemberLayout activePage="home" memberName={m.full_name} memberId={m.id}>
      <MemberHomeClient
        member={m as any}
        streak={streak}
        totalVisits={totalVisits}
        checkInsThisMonth={checkInsThisMonth}
        daysRemaining={daysRemaining}
        progress={progress}
        recentPayments={recentPayments ?? []}
        recentWorkoutLogs={recentWorkoutLogs ?? []}
        recentBodyStats={recentBodyStats ?? []}
      />
    </MemberLayout>
  )
}
