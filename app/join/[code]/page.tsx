import { createClient } from '@/lib/supabase/server'
import JoinClient from './join-client'
import { Dumbbell } from 'lucide-react'

interface Props {
  params: Promise<{ code: string }>
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params
  const gymCode = code.toUpperCase()

  console.log('[Join] Code:', gymCode)

  const supabase = await createClient()

  // Find the gym by code
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, gym_code, city')
    .eq('gym_code', gymCode)
    .single()

  if (error || !org) {
    console.log('[Join] Gym not found for code:', gymCode)
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand px-4">
        <div className="w-full max-w-sm rounded-2xl bg-bg-card p-6 text-center shadow-xl">
          <div className="mb-3 text-4xl">❌</div>
          <h2 className="text-lg font-semibold text-ink">Invalid gym code</h2>
          <p className="mt-2 text-sm text-ink-muted">
            No gym found with code <strong className="font-mono">{gymCode}</strong>.
            Make sure you scanned the right QR code.
          </p>
        </div>
      </div>
    )
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  let memberData = null
  let alreadyLinked = false

  if (user) {
    // Check if this user is linked to a member at this gym
    const { data: member } = await supabase
      .from('members_with_subscription')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('organization_id', org.id)
      .maybeSingle()

    if (member) {
      alreadyLinked = true
      memberData = member
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Gym header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Dumbbell className="h-8 w-8 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            {org.city && <p className="text-sm text-white/70">{org.city}</p>}
          </div>
        </div>

        <JoinClient
          gymCode={gymCode}
          gymName={org.name}
          orgId={org.id}
          isLoggedIn={!!user}
          userEmail={user?.email ?? null}
          alreadyLinked={alreadyLinked}
          memberData={memberData}
        />
      </div>
    </div>
  )
}
