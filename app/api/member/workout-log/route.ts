import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[POST /api/member/workout-log] Called')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('members')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const body = await request.json()
    const { workout_type, duration_minutes, notes, logged_at } = body

    const { data: log, error } = await supabase
      .from('workout_logs')
      .insert({
        organization_id: member.organization_id,
        member_id: member.id,
        workout_type: workout_type ?? 'other',
        duration_minutes: duration_minutes ?? null,
        notes: notes ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.log('[WorkoutLog] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[WorkoutLog] Done ✅')
    return NextResponse.json({ log }, { status: 201 })

  } catch (err) {
    console.error('[WorkoutLog] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
