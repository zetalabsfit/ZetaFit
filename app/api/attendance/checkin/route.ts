import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[POST /api/attendance/checkin] Called')
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const orgId = profile.organization_id
    const body = await request.json()
    const { phone, method = 'phone' } = body

    console.log('[Checkin] Looking up phone:', phone)

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Find member by phone
    const { data: member, error: memberError } = await supabase
      .from('members_with_subscription')
      .select('*')
      .eq('organization_id', orgId)
      .eq('phone', phone.trim())
      .is('deleted_at', null)
      .single()

    if (memberError || !member) {
      console.log('[Checkin] Member not found for phone:', phone)
      return NextResponse.json({ error: 'No member found with this phone number' }, { status: 404 })
    }

    console.log('[Checkin] Found member:', member.full_name, '| Status:', member.status, '| Days remaining:', member.days_remaining)

    // Determine allow/block
    const isActive = member.status === 'active' &&
      member.subscription_status === 'active' &&
      member.days_remaining !== null &&
      member.days_remaining >= 0

    const result: 'allowed' | 'blocked' = isActive ? 'allowed' : 'blocked'

    console.log('[Checkin] Result:', result)

    // Record attendance
    const { error: attError } = await supabase
      .from('attendance')
      .insert({
        organization_id: orgId,
        member_id: member.id,
        method,
        result,
        staff_id: user.id,
        checked_in_at: new Date().toISOString(),
      })

    if (attError) {
      console.log('[Checkin] Attendance insert error:', attError.message)
      return NextResponse.json({ error: attError.message }, { status: 500 })
    }

    console.log('[Checkin] Done ✅')

    return NextResponse.json({
      result,
      member: {
        id: member.id,
        full_name: member.full_name,
        initials: member.initials,
        phone: member.phone,
        plan_name: member.plan_name,
        end_date: member.end_date,
        days_remaining: member.days_remaining,
      },
    })

  } catch (err) {
    console.error('[Checkin] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
