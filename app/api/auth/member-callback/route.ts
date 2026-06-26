import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('[MemberCallback] Called')
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.log('[MemberCallback] OAuth error:', error)
    return NextResponse.redirect(`${origin}/member/login?error=${error}`)
  }

  if (!code) {
    console.log('[MemberCallback] No code')
    return NextResponse.redirect(`${origin}/member/login`)
  }

  const supabase = await createClient()
  const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !user) {
    console.log('[MemberCallback] Session error:', sessionError?.message)
    return NextResponse.redirect(`${origin}/member/login?error=auth_failed`)
  }

  console.log('[MemberCallback] User authenticated:', user.id, user.email)

  // Check if this Google account is linked to a member
  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  if (member) {
    console.log('[MemberCallback] Member found:', member.full_name)
    return NextResponse.redirect(`${origin}/member/home`)
  }

  // Try to match by email
  if (user.email) {
    const { data: memberByEmail } = await supabase
      .from('members')
      .select('id, full_name, organization_id')
      .eq('email', user.email)
      .is('deleted_at', null)
      .single()

    if (memberByEmail) {
      console.log('[MemberCallback] Matched by email:', memberByEmail.full_name)
      // Link auth account to member record
      await supabase
        .from('members')
        .update({ auth_user_id: user.id })
        .eq('id', memberByEmail.id)

      return NextResponse.redirect(`${origin}/member/home`)
    }
  }

  // No matching member found
  console.log('[MemberCallback] No member found for this Google account')
  await supabase.auth.signOut()
  return NextResponse.redirect(`${origin}/member/login?error=not_a_member`)
}
