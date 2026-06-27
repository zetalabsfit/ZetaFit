import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import AttendanceClient from './attendance-client'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(name, platform_plan)')
    .eq('id', user.id)
    .single()

  const org = profile?.organizations as unknown as { name: string; platform_plan: string } | null

  // Today's check-ins
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: todayCheckIns } = await supabase
    .from('attendance')
    .select('id, checked_in_at, result, method, members(id, full_name, initials)')
    .gte('checked_in_at', todayStart.toISOString())
    .order('checked_in_at', { ascending: false })

  // This month's attendance for heatmap
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthAttendance } = await supabase
    .from('attendance')
    .select('checked_in_at, result')
    .gte('checked_in_at', firstOfMonth)
    .eq('result', 'allowed')

  // Count per day
  const dayCount: Record<number, number> = {}
  ;(monthAttendance ?? []).forEach(a => {
    const day = new Date(a.checked_in_at).getDate()
    dayCount[day] = (dayCount[day] ?? 0) + 1
  })

  // Expiring count for sidebar
  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const { data: expiringData } = await supabase
    .from('member_subscriptions')
    .select('id')
    .gte('end_date', today)
    .lte('end_date', in7Days)
    .eq('status', 'active')
  const expiringCount = expiringData?.length ?? 0

  return (
    <div className="flex min-h-screen">
      <Sidebar gymName={org?.name} orgPlan={org?.platform_plan} expiringCount={expiringCount} />
      <AttendanceClient
        todayCheckIns={(todayCheckIns ?? []) as any[]}
        dayCount={dayCount}
        currentMonth={new Date().getMonth()}
        currentYear={new Date().getFullYear()}
      />
    </div>
  )
}
