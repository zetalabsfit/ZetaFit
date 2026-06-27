import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  console.log('[Settings] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organization_id, organizations(*)')
    .eq('id', user.id)
    .single()

  const org = profile?.organizations as unknown as Record<string, any> | null
  console.log('[Settings] Org:', org?.name)


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
      <SettingsClient org={org} userFullName={profile?.full_name ?? ''} />
    </div>
  )
}
