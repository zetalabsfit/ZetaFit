import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[POST /api/join/checkin] Called')
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })

    const { gym_code } = await request.json()
    console.log('[QR Checkin] Gym code:', gym_code, 'User:', user.id)

    // Find the gym
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('gym_code', gym_code.toUpperCase())
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Invalid gym QR code' }, { status: 404 })
    }

    // Find member linked to this auth account at this gym
    const { data: member } = await supabase
      .from('members_with_subscription')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('organization_id', org.id)
      .single()

    if (!member) {
      return NextResponse.json({
        error: 'Your account is not linked to a member at this gym. Scan the QR and register first.',
      }, { status: 404 })
    }

    console.log('[QR Checkin] Member:', member.full_name, 'Status:', member.status, 'Days:', member.days_remaining)

    // Allow/block logic
    const isActive = member.status === 'active'
      && member.subscription_status === 'active'
      && member.days_remaining !== null
      && member.days_remaining >= 0

    const result: 'allowed' | 'blocked' = isActive ? 'allowed' : 'blocked'

    // Log attendance
    const { error: attError } = await supabase
      .from('attendance')
      .insert({
        organization_id: org.id,
        member_id: member.id,
        method: 'qr',
        result,
        checked_in_at: new Date().toISOString(),
      })

    if (attError) {
      console.log('[QR Checkin] Attendance insert error:', attError.message)
      return NextResponse.json({ error: attError.message }, { status: 500 })
    }

    console.log('[QR Checkin] Done ✅ Result:', result)

    return NextResponse.json({
      result,
      member: {
        id: member.id,
        full_name: member.full_name,
        initials: member.initials,
        plan_name: member.plan_name,
        end_date: member.end_date,
        days_remaining: member.days_remaining,
        subscription_status: member.subscription_status,
      },
    })

  } catch (err) {
    console.error('[QR Checkin] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
