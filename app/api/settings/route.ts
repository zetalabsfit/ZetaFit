import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  console.log('[PATCH /api/settings] Called')
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

    const body = await request.json()
    const {
      name, phone, email, address, city,
      state, pincode, gst_number, operating_hours, website,
    } = body

    console.log('[Settings] Updating org:', profile.organization_id, { name, phone })

    const { data: org, error } = await supabase
      .from('organizations')
      .update({
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        gst_number: gst_number || null,
        operating_hours: operating_hours || null,
        website: website || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.log('[Settings] Update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Settings] Done ✅')
    return NextResponse.json({ org })

  } catch (err) {
    console.error('[Settings] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
