import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import WorkoutBuilder from './workout-builder'

export default async function WorkoutsPage() {
  console.log('[Workouts] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(name, platform_plan)')
    .eq('id', user.id)
    .single()

  const org = profile?.organizations as unknown as { name: string; platform_plan: string } | null

  const [{ data: exercises }, { data: members }] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment')
      .order('muscle_group')
      .order('name'),
    supabase
      .from('members')
      .select('id, full_name, initials')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('full_name'),
  ])

  console.log('[Workouts] Exercises:', exercises?.length, 'Members:', members?.length)


  // Expiring in 7 days (for sidebar badge)
  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const { data: expiringData } = await supabase
    .from('member_subscriptions')
    .select('id', { count: 'exact' })
    .gte('end_date', today)
    .lte('end_date', in7Days)
    .eq('status', 'active')
  const expiringCount = expiringData?.length ?? 0
  return (
    <div className="flex min-h-screen">
      <Sidebar gymName={org?.name} orgPlan={org?.platform_plan} expiringCount={expiringCount} />
      <WorkoutBuilder
        exercises={exercises ?? []}
        members={members ?? []}
        trainerId={user.id}
      />
    </div>
  )
}
