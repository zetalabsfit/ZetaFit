import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GymDetailClient from './gym-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GymDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org) notFound()

  const [
    { data: members },
    { data: payments },
    { data: recentCheckins },
    { data: owner },
  ] = await Promise.all([
    supabase
      .from('members_with_subscription')
      .select('id, full_name, phone, status, plan_name, end_date, days_remaining')
      .eq('organization_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, total_amount, payment_status, paid_at, created_at')
      .eq('organization_id', id)
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(10),
    supabase
      .from('attendance')
      .select('id, checked_in_at, result')
      .eq('organization_id', id)
      .order('checked_in_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('full_name, id')
      .eq('organization_id', id)
      .single(),
  ])

  const totalRevenue = (payments ?? []).reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const activeMembers = (members ?? []).filter(m => m.status === 'active').length
  const expiredMembers = (members ?? []).filter(m => m.status === 'expired').length

  return (
    <GymDetailClient
      org={org}
      ownerName={owner?.full_name ?? '—'}
      members={(members ?? []) as any[]}
      payments={payments ?? []}
      recentCheckins={recentCheckins ?? []}
      totalRevenue={totalRevenue}
      activeMembers={activeMembers}
      expiredMembers={expiredMembers}
    />
  )
}
