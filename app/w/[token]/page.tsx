import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Dumbbell, Clock, Target, BarChart3 } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export default async function WorkoutSharePage({ params }: Props) {
  const { token } = await params
  console.log('[WorkoutShare] Token:', token)

  if (!token || token.length < 16) notFound()

  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('workout_assignments')
    .select(`
      id, assigned_at, viewed_at,
      members(full_name),
      workout_templates(
        id, title, goal, level,
        workout_template_items(
          id, position, sets, reps, weight, rest_seconds, notes,
          exercises(name, muscle_group, equipment)
        )
      )
    `)
    .eq('share_token', token)
    .eq('status', 'active')
    .single()

  if (!assignment) {
    console.log('[WorkoutShare] Not found for token:', token)
    notFound()
  }

  // Log viewed_at on first open
  if (!assignment.viewed_at) {
    await supabase
      .from('workout_assignments')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', assignment.id)
    console.log('[WorkoutShare] Logged first view')
  }

  const template = Array.isArray(assignment.workout_templates)
    ? assignment.workout_templates[0]
    : assignment.workout_templates as any

  const member = Array.isArray(assignment.members)
    ? assignment.members[0]
    : assignment.members as any

  const items = ((template?.workout_template_items ?? []) as any[])
    .sort((a: any, b: any) => a.position - b.position)

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">Z</div>
          <span className="font-semibold text-brand">ZetaFit</span>
          <span className="ml-auto text-xs text-ink-muted">Workout plan</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-10">
        {/* Plan card */}
        <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-sm opacity-80 mb-1">For {member?.full_name}</p>
          <h1 className="text-2xl font-bold">{template?.title ?? 'Workout plan'}</h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {template?.goal && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                <Target className="h-3 w-3" /> {template.goal}
              </span>
            )}
            {template?.level && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium capitalize">
                <BarChart3 className="h-3 w-3" /> {template.level}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
              <Dumbbell className="h-3 w-3" /> {items.length} exercises
            </span>
          </div>
        </div>

        {/* Exercise list */}
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No exercises in this workout.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item: any, idx: number) => (
              <div key={item.id} className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-bold text-brand">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{item.exercises?.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {[item.exercises?.muscle_group, item.exercises?.equipment].filter(Boolean).join(' · ')}
                    </p>

                    {/* Sets / Reps / Weight / Rest */}
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        { label: 'Sets', value: item.sets ?? '—' },
                        { label: 'Reps', value: item.reps ?? '—' },
                        { label: 'Weight', value: item.weight ?? 'BW' },
                        { label: 'Rest', value: item.rest_seconds ? `${item.rest_seconds}s` : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-bg-page py-2 text-center">
                          <p className="text-sm font-bold text-ink">{value}</p>
                          <p className="text-[10px] text-ink-muted">{label}</p>
                        </div>
                      ))}
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-xs text-ink-secondary italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 text-center">
          <p className="text-xs text-ink-muted">
            Assigned by your trainer via{' '}
            <span className="font-semibold text-brand">ZetaFit</span>
          </p>
          <p className="text-xs text-ink-muted mt-0.5">zeta-labs.dev</p>
        </div>
      </main>
    </div>
  )
}
