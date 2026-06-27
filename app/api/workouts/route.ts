import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[POST /api/workouts] Called')
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
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const body = await request.json()
    const { title, goal, level, items } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!items?.length) {
      return NextResponse.json({ error: 'Add at least one exercise' }, { status: 400 })
    }

    console.log('[Workouts] Creating template:', title, 'with', items.length, 'exercises')

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('workout_templates')
      .insert({
        organization_id: profile.organization_id,
        trainer_id: user.id,
        title: title.trim(),
        goal: goal || null,
        level: level || 'intermediate',
      })
      .select()
      .single()

    if (templateError || !template) {
      console.log('[Workouts] Template error:', templateError?.message)
      return NextResponse.json({ error: templateError?.message ?? 'Failed to create template' }, { status: 500 })
    }

    // Create template items
    const { error: itemsError } = await supabase
      .from('workout_template_items')
      .insert(
        items.map((item: any, idx: number) => ({
          template_id: template.id,
          exercise_id: item.exercise_id,
          position: idx,
          sets: item.sets ?? null,
          reps: item.reps ?? null,
          weight: item.weight ?? null,
          rest_seconds: item.rest_seconds ?? null,
          notes: item.notes ?? null,
        }))
      )

    if (itemsError) {
      console.log('[Workouts] Items error:', itemsError.message)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    console.log('[Workouts] Done ✅ Template:', template.id)
    return NextResponse.json({ template_id: template.id }, { status: 201 })

  } catch (err) {
    console.error('[Workouts] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
