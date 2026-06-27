import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './admin-client'

export default async function AdminPage() {
  console.log('[Admin] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    redirect('/dashboard')
  }

  // All orgs with stats
  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      id, name, city, state, platform_plan, platform_status,
      platform_trial_ends_at, created_at, gym_code,
      profiles(id, full_name)
    `)
    .order('created_at', { ascending: false })

  // Member counts per org
  const { data: memberCounts } = await supabase
    .from('members')
    .select('organization_id')
    .is('deleted_at', null)
    .eq('status', 'active')

  // Revenue per org (all time)
  const { data: payments } = await supabase
    .from('payments')
    .select('organization_id, total_amount, created_at')
    .eq('payment_status', 'paid')

  // Check-ins per org (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: recentCheckins } = await supabase
    .from('attendance')
    .select('organization_id, checked_in_at')
    .gte('checked_in_at', sevenDaysAgo)

  // Aggregate
  const countByOrg: Record<string, number> = {}
  ;(memberCounts ?? []).forEach(m => {
    countByOrg[m.organization_id] = (countByOrg[m.organization_id] ?? 0) + 1
  })

  const revenueByOrg: Record<string, number> = {}
  ;(payments ?? []).forEach(p => {
    revenueByOrg[p.organization_id] = (revenueByOrg[p.organization_id] ?? 0) + (p.total_amount ?? 0)
  })

  const checkinsByOrg: Record<string, number> = {}
  ;(recentCheckins ?? []).forEach(c => {
    checkinsByOrg[c.organization_id] = (checkinsByOrg[c.organization_id] ?? 0) + 1
  })

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const revenueThisMonthByOrg: Record<string, number> = {}
  ;(payments ?? []).filter(p => p.created_at >= firstOfMonth).forEach(p => {
    revenueThisMonthByOrg[p.organization_id] = (revenueThisMonthByOrg[p.organization_id] ?? 0) + (p.total_amount ?? 0)
  })

  const gyms = (orgs ?? []).map(org => {
    const owner = Array.isArray(org.profiles) ? org.profiles[0] : org.profiles as any
    return {
      id: org.id,
      name: org.name,
      city: org.city ?? '',
      state: org.state ?? '',
      gym_code: org.gym_code ?? '',
      plan: org.platform_plan ?? 'starter',
      status: org.platform_status ?? 'trial',
      trial_ends_at: org.platform_trial_ends_at,
      created_at: org.created_at,
      owner_name: owner?.full_name ?? '—',
      active_members: countByOrg[org.id] ?? 0,
      revenue_all_time: revenueByOrg[org.id] ?? 0,
      revenue_this_month: revenueThisMonthByOrg[org.id] ?? 0,
      checkins_7d: checkinsByOrg[org.id] ?? 0,
    }
  })

  // Platform totals
  const totalMRR = gyms.filter(g => g.status === 'active').reduce((s, g) => {
    const planPrice = { starter: 999, growth: 1999, pro: 3499 }[g.plan] ?? 999
    return s + planPrice
  }, 0)

  const totalRevenue = gyms.reduce((s, g) => s + g.revenue_all_time, 0)
  const totalMembers = gyms.reduce((s, g) => s + g.active_members, 0)

  console.log('[Admin] Gyms:', gyms.length, 'Total MRR:', totalMRR)

  return (
    <AdminClient
      gyms={gyms}
      adminName={profile.full_name ?? 'zetaadmin'}
      totalMRR={totalMRR}
      totalRevenue={totalRevenue}
      totalMembers={totalMembers}
      totalGyms={gyms.length}
      activeGyms={gyms.filter(g => g.status === 'active').length}
      trialGyms={gyms.filter(g => g.status === 'trial').length}
    />
  )
}
