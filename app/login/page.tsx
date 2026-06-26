'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <span className="text-2xl font-black text-brand">Z</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">ZetaFit</h1>
            <p className="text-sm text-white/70">Gym management · ZetaLabs</p>
          </div>
        </div>

        <div className="rounded-2xl bg-bg-card p-6 shadow-xl">
          <h2 className="mb-5 text-lg font-semibold text-ink">Sign in to your gym</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-secondary">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ironfitness.in"
                required
                className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-secondary">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-brand font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-white/50">© 2026 ZetaLabs · zeta-labs.dev</p>
      </div>
    </div>
  )
}