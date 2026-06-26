import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[POST /api/join] Called')
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })

    const body = await request.json()
    const { email, gym_code } = body

    console.log('[Join] Email:', email, 'Gym code:', gym_code)

    if (!email || !gym_code) {
      return NextResponse.json({ error: 'Email and gym code are required' }, { status: 400 })
    }

    // Find the gym
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('gym_code', gym_code.toUpperCase())
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Invalid gym code' }, { status: 404 })
    }

    // Find member by email at this gym
    const { data: member } = await supabase
      .from('members')
      .select('id, full_name, email, auth_user_id')
      .eq('organization_id', org.id)
      .eq('email', email.toLowerCase().trim())
      .is('deleted_at', null)
      .single()

    if (!member) {
      console.log('[Join] No member found with email:', email, 'at gym:', org.name)
      return NextResponse.json({
        error: `No member found with email "${email}" at ${org.name}. Make sure the gym admin has your exact email on file.`,
      }, { status: 404 })
    }

    // Check if already linked to a different auth account
    if (member.auth_user_id && member.auth_user_id !== user.id) {
      return NextResponse.json({
        error: 'This email is already linked to another account.',
      }, { status: 409 })
    }

    // Link the auth account to the member
    const { error: updateError } = await supabase
      .from('members')
      .update({ auth_user_id: user.id })
      .eq('id', member.id)

    if (updateError) {
      console.log('[Join] Update error:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[Join] Linked ✅', member.full_name, '→', user.id)
    return NextResponse.json({ success: true, memberName: member.full_name })

  } catch (err) {
    console.error('[Join] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
