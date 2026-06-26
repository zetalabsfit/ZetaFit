import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get org
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const body = await request.json()
    const { name, duration_days, price, features, is_popular } = body

    if (!name || !duration_days || !price) {
      return NextResponse.json({ error: 'Name, duration and price are required' }, { status: 400 })
    }

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .insert({
        organization_id: profile.organization_id,
        name,
        duration_days: Number(duration_days),
        price: Number(price),
        gst_rate: 18,
        features: features ?? [],
        is_popular: is_popular ?? false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Plan insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan }, { status: 201 })

  } catch (err) {
    console.error('POST /api/plans error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
