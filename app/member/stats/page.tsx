import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberLayout from '@/components/member-layout'
import StatsClient from './stats-client'

export default async function MemberStatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/member/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, initials, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) redirect('/member/login')

  const { data: bodyStats } = await supabase
    .from('body_stats')
    .select('id, weight_kg, goal_kg, notes, logged_at')
    .eq('member_id', member.id)
    .order('logged_at', { ascending: false })
    .limit(30)

  const { data: personalBests } = await supabase
    .from('personal_bests')
    .select('id, exercise_name, weight_kg, reps, achieved_at')
    .eq('member_id', member.id)
    .order('achieved_at', { ascending: false })

  const latestStat = bodyStats?.[0] ?? null
  const goalKg = latestStat?.goal_kg ?? null

  // Chart data — last 12 entries oldest first
  const chartData = [...(bodyStats ?? [])].reverse().slice(-12).map(b => ({
    date: new Date(b.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    weight: b.weight_kg,
  }))

  return (
    <MemberLayout activePage="stats" memberName={member.full_name} memberId={member.id}>
      <StatsClient
        memberId={member.id}
        orgId={member.organization_id}
        latestWeight={latestStat?.weight_kg ?? null}
        goalKg={goalKg}
        bodyStats={bodyStats ?? []}
        chartData={chartData}
        personalBests={personalBests ?? []}
      />
    </MemberLayout>
  )
}
