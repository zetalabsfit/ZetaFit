import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberLayout from '@/components/member-layout'
import MemberWorkoutsClient from './workouts-client'

export default async function MemberWorkoutsPage() {
  console.log('[MemberWorkouts] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/member/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, initials, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) redirect('/member/login')

  // Assigned workouts from trainer
  const { data: assignments } = await supabase
    .from('workout_assignments')
    .select(`
      id, share_token, assigned_at, viewed_at, status,
      workout_templates(id, title, goal, level,
        workout_template_items(id)
      )
    `)
    .eq('member_id', member.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })

  // Self-logged workouts
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id, workout_type, duration_minutes, notes, logged_at')
    .eq('member_id', member.id)
    .order('logged_at', { ascending: false })
    .limit(30)

  console.log('[MemberWorkouts] Assignments:', assignments?.length, 'Logs:', logs?.length)

  return (
    <MemberLayout activePage="workouts" memberName={member.full_name} memberId={member.id}>
      <MemberWorkoutsClient
        memberId={member.id}
        orgId={member.organization_id}
        assignments={(assignments ?? []) as any[]}
        logs={logs ?? []}
      />
    </MemberLayout>
  )
}
