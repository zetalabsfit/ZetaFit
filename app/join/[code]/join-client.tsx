'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Mail, LogIn } from 'lucide-react'

interface MemberData {
  id: string
  full_name: string
  initials: string
  plan_name: string | null
  end_date: string | null
  days_remaining: number | null
  subscription_status: string | null
}

interface Props {
  gymCode: string
  gymName: string
  orgId: string
  isLoggedIn: boolean
  userEmail: string | null
  alreadyLinked: boolean
  memberData: MemberData | null
}

export default function JoinClient({
  gymCode, gymName, orgId,
  isLoggedIn, userEmail, alreadyLinked, memberData,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState(userEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkinResult, setCheckinResult] = useState<'allowed' | 'blocked' | null>(null)
  const [checkedMember, setCheckedMember] = useState<MemberData | null>(null)
  const [joined, setJoined] = useState(false)

  // ── State 1: Already linked → show check-in ────────────────────────────────
  if (alreadyLinked && memberData && checkinResult === null) {
    return (
      <div className="rounded-2xl bg-bg-card p-6 shadow-xl space-y-4">
        <div className="text-center">
          <p className="text-sm text-ink-muted">Welcome back</p>
          <p className="text-xl font-bold text-ink">{memberData.full_name}</p>
        </div>
        <div className="rounded-xl border border-border p-3 grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-ink-muted">Plan</p><p className="font-semibold text-ink">{memberData.plan_name ?? '—'}</p></div>
          <div><p className="text-xs text-ink-muted">Days left</p><p className="font-semibold text-ink">{memberData.days_remaining ?? '—'}</p></div>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={checkinLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {checkinLoading ? 'Logging attendance…' : 'Tap to check in'}
        </button>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  // ── State 2: Check-in result ───────────────────────────────────────────────
  if (checkinResult !== null) {
    const isAllowed = checkinResult === 'allowed'
    const m = checkedMember ?? memberData
    return (
      <div className={`rounded-2xl p-6 shadow-xl text-center space-y-4 ${isAllowed ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'}`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isAllowed ? 'bg-green-500' : 'bg-red-500'}`}>
          {isAllowed
            ? <CheckCircle2 className="h-8 w-8 text-white" />
            : <XCircle className="h-8 w-8 text-white" />
          }
        </div>
        <div>
          <p className={`text-2xl font-black ${isAllowed ? 'text-green-700' : 'text-red-700'}`}>
            {isAllowed ? 'ALLOWED' : 'BLOCKED'}
          </p>
          <p className="text-lg font-semibold text-ink mt-1">{m?.full_name}</p>
          <p className={`text-sm mt-0.5 ${isAllowed ? 'text-green-600' : 'text-red-600'}`}>
            {isAllowed
              ? `${m?.plan_name} · ${m?.days_remaining} days left`
              : 'Membership expired or inactive. Please renew.'
            }
          </p>
        </div>
        <button
          onClick={() => router.push('/member/home')}
          className="w-full rounded-xl border border-current py-2.5 text-sm font-semibold text-ink-secondary hover:bg-white/50"
        >
          Go to member portal
        </button>
      </div>
    )
  }

  // ── State 3: Joined successfully ───────────────────────────────────────────
  if (joined) {
    return (
      <div className="rounded-2xl bg-bg-card p-6 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-ink">You&apos;re linked! 🎉</p>
          <p className="text-sm text-ink-muted mt-1">Your account is now connected to {gymName}.</p>
        </div>
        <button
          onClick={() => router.push('/member/home')}
          className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover"
        >
          Go to member portal
        </button>
      </div>
    )
  }

  // ── State 4: Not logged in → Google login ──────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl bg-bg-card p-6 shadow-xl space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">Join {gymName}</p>
          <p className="text-xs text-ink-muted mt-1">Sign in with Google to link your membership.</p>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border-medium bg-white py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-bg-page"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  // ── State 5: Logged in, not linked → email form ────────────────────────────
  return (
    <div className="rounded-2xl bg-bg-card p-6 shadow-xl space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">Link your membership</p>
        <p className="text-xs text-ink-muted mt-1">
          Enter the email you gave to {gymName} when registering.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-ink-secondary">Registered email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
          />
        </div>
        <p className="text-[11px] text-ink-muted">Signed in as: {userEmail}</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleLink}
        disabled={loading || !email.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {loading ? 'Linking…' : 'Link my membership'}
      </button>
    </div>
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/join/${gymCode}`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleLink() {
    setLoading(true)
    setError('')
    console.log('[Join] Linking email:', email, 'to gym:', gymCode)

    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), gym_code: gymCode }),
    })

    const json = await res.json()
    console.log('[Join] Link response:', json)

    if (!res.ok) {
      setError(json.error ?? 'Failed to link account')
      setLoading(false)
      return
    }

    setJoined(true)
    setLoading(false)
  }

  async function handleCheckIn() {
    setCheckinLoading(true)
    setError('')
    console.log('[Join] Checking in at gym:', gymCode)

    const res = await fetch('/api/join/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gym_code: gymCode }),
    })

    const json = await res.json()
    console.log('[Join] Checkin response:', json)

    if (!res.ok) {
      setError(json.error ?? 'Check-in failed')
      setCheckinLoading(false)
      return
    }

    setCheckinResult(json.result)
    setCheckedMember(json.member)
    setCheckinLoading(false)
  }
}
