import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[PATCH /api/admin/gyms/:id] Called, id:', id)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { plan, status, extend_trial_days } = body

    console.log('[AdminGym] Updating:', id, { plan, status, extend_trial_days })

    const updates: Record<string, any> = {
      platform_plan: plan,
      platform_status: status,
      updated_at: new Date().toISOString(),
    }

    // Extend trial if requested
    if (status === 'trial' && extend_trial_days && Number(extend_trial_days) > 0) {
      updates.platform_trial_ends_at = new Date(
        Date.now() + Number(extend_trial_days) * 86400000
      ).toISOString()
    }

    // If activating, set trial_ends_at to now (trial over)
    if (status === 'active') {
      updates.platform_trial_ends_at = new Date().toISOString()
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.log('[AdminGym] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[AdminGym] Done ✅')
    return NextResponse.json({ org })

  } catch (err) {
    console.error('[AdminGym] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
