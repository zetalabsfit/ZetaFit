import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('id, organization_id').eq('auth_user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { exercise_name, weight_kg, reps, notes } = await request.json()
  const { data, error } = await supabase.from('personal_bests').insert({
    organization_id: member.organization_id,
    member_id: member.id,
    exercise_name, weight_kg: weight_kg ?? null, reps: reps ?? null, notes: notes ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pb: data }, { status: 201 })
}
