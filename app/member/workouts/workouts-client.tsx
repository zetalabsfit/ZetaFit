'use client'
import { useState } from 'react'
import {
  Dumbbell, ExternalLink, Plus, Clock,
  Calendar, CheckCircle2, Loader2, X, Trophy,
} from 'lucide-react'

interface Assignment {
  id: string; share_token: string; assigned_at: string
  viewed_at: string | null; status: string
  workout_templates: any
}
interface WorkoutLog {
  id: string; workout_type: string; duration_minutes: number | null
  notes: string | null; logged_at: string
}
interface Props {
  memberId: string; orgId: string
  assignments: Assignment[]; logs: WorkoutLog[]
}

const WORKOUT_TYPES = [
  { value: 'strength', label: 'Strength', icon: '🏋️', color: 'bg-blue-50 text-blue-700' },
  { value: 'cardio', label: 'Cardio', icon: '🏃', color: 'bg-green-50 text-green-700' },
  { value: 'flexibility', label: 'Flexibility', icon: '🧘', color: 'bg-purple-50 text-purple-700' },
  { value: 'hiit', label: 'HIIT', icon: '⚡', color: 'bg-orange-50 text-orange-700' },
  { value: 'yoga', label: 'Yoga', icon: '🌿', color: 'bg-teal-50 text-teal-700' },
  { value: 'sports', label: 'Sports', icon: '⚽', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'other', label: 'Other', icon: '💪', color: 'bg-gray-50 text-gray-700' },
]

function typeInfo(type: string) {
  return WORKOUT_TYPES.find(t => t.value === type) ?? WORKOUT_TYPES[6]
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  const dow = new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return dow
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700',
  intermediate: 'bg-blue-50 text-blue-700',
  advanced: 'bg-red-50 text-red-700',
}

export default function MemberWorkoutsClient({ memberId, orgId, assignments, logs: initialLogs }: Props) {
  const [tab, setTab] = useState<'assigned' | 'my'>('assigned')
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workoutType, setWorkoutType] = useState('strength')
  const [duration, setDuration] = useState('45')
  const [notes, setNotes] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])

  // Summary stats
  const totalSessions = logs.length
  const avgDuration = totalSessions > 0
    ? Math.round(logs.filter(l => l.duration_minutes).reduce((s, l) => s + (l.duration_minutes ?? 0), 0) / Math.max(1, logs.filter(l => l.duration_minutes).length))
    : 0
  const favouriteType = logs.length > 0
    ? Object.entries(logs.reduce((acc, l) => { acc[l.workout_type] = (acc[l.workout_type] ?? 0) + 1; return acc }, {} as Record<string,number>))
        .sort(([,a],[,b]) => b-a)[0]?.[0] ?? 'strength'
    : 'strength'

  async function handleLog() {
    setSaving(true)
    const res = await fetch('/api/member/workout-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_type: workoutType, duration_minutes: Number(duration), notes: notes || null, logged_at: new Date(logDate).toISOString() }),
    })
    const json = await res.json()
    if (res.ok) {
      setLogs(prev => [json.log, ...prev])
      setShowModal(false)
      setWorkoutType('strength'); setDuration('45'); setNotes('')
      setLogDate(new Date().toISOString().split('T')[0])
    }
    setSaving(false)
  }

  const shareBase = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="px-4 py-3 space-y-4">
      <h2 className="text-lg font-bold text-ink">Workouts</h2>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-bg-page p-1">
        {[{ key: 'assigned', label: 'Assigned' }, { key: 'my', label: 'My workouts' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === key ? 'bg-bg-card text-brand shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ASSIGNED */}
      {tab === 'assigned' && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-10 w-10 text-ink-muted mb-3" />
              <p className="text-sm font-medium text-ink">No workouts assigned yet</p>
              <p className="text-xs text-ink-muted mt-1">Your trainer will assign workouts here</p>
            </div>
          ) : (
            assignments.map(a => {
              const template = Array.isArray(a.workout_templates) ? a.workout_templates[0] : a.workout_templates
              const exerciseCount = template?.workout_template_items?.length ?? 0
              const shareUrl = `${shareBase}/w/${a.share_token}`
              const isActive = a.status === 'active'
              return (
                <div key={a.id} className={`rounded-2xl border bg-bg-card p-4 shadow-sm ${isActive ? 'border-border' : 'border-border opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink truncate">{template?.title ?? 'Untitled'}</p>
                        {!isActive && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Archived</span>}
                      </div>
                      {template?.goal && <p className="text-xs text-ink-muted mt-0.5">Goal: {template.goal}</p>}
                    </div>
                    {template?.level && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${LEVEL_COLORS[template.level] ?? ''}`}>
                        {template.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted mb-3">
                    <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{exerciseCount} exercises</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{timeAgo(a.assigned_at)}</span>
                    {a.viewed_at && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />Viewed</span>}
                  </div>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                    <ExternalLink className="h-4 w-4" /> Open workout plan
                  </a>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* MY WORKOUTS */}
      {tab === 'my' && (
        <div className="space-y-3">
          {/* Summary stats */}
          {totalSessions > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sessions', value: String(totalSessions) },
                { label: 'Avg time', value: avgDuration ? `${avgDuration}m` : '—' },
                { label: 'Favourite', value: typeInfo(favouriteType).icon + ' ' + typeInfo(favouriteType).label },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-bg-card p-3 text-center">
                  <p className="text-sm font-bold text-ink">{value}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Log button */}
          <button onClick={() => setShowModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-light bg-brand-muted py-3 text-sm font-semibold text-brand">
            <Plus className="h-4 w-4" /> Log a workout
          </button>

          {/* History */}
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-8 w-8 text-ink-muted mb-2" />
              <p className="text-sm text-ink-muted">No workouts logged yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
              <ul className="divide-y divide-border">
                {logs.map(log => {
                  const info = typeInfo(log.workout_type)
                  return (
                    <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${info.color}`}>
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{info.label}</p>
                        <p className="text-xs text-ink-muted">
                          {log.duration_minutes ? `${log.duration_minutes} min` : '—'}
                          {log.notes ? ` · ${log.notes}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-muted">{timeAgo(log.logged_at)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Log modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-semibold text-ink">Log a workout</h3>
              <button onClick={() => setShowModal(false)}><X className="h-4 w-4 text-ink-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-2 block">Workout type</label>
                <div className="grid grid-cols-2 gap-2">
                  {WORKOUT_TYPES.map(({ value, label, icon }) => (
                    <label key={value}>
                      <input type="radio" value={value} checked={workoutType === value} onChange={() => setWorkoutType(value)} className="peer sr-only" />
                      <div className="cursor-pointer rounded-xl border border-border py-2.5 text-center text-sm font-medium text-ink-secondary transition-all peer-checked:border-brand peer-checked:bg-brand-muted peer-checked:text-brand">
                        {icon} {label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-ink-secondary">Duration (min)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
                <div><label className="text-xs font-medium text-ink-secondary">Date</label>
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
              </div>
              <div><label className="text-xs font-medium text-ink-secondary">Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Felt strong today"
                  className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-ink-secondary hover:bg-bg-page">Cancel</button>
              <button onClick={handleLog} disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? 'Saving…' : 'Log workout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
