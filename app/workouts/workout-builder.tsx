'use client'
import { useState } from 'react'
import {
  Plus, Trash2, Search, Copy, Check,
  Dumbbell, ChevronDown, ChevronUp, Link,
  Save, Users, X, Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Exercise {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
}

interface WorkoutItem {
  exercise_id: string
  exercise_name: string
  muscle_group: string | null
  sets: string
  reps: string
  weight: string
  rest_seconds: string
  notes: string
}

interface Member {
  id: string
  full_name: string
  initials: string
}

interface Props {
  exercises: Exercise[]
  members: Member[]
  trainerId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']

function avatarColor(name: string) {
  const colors = ['#1D9E75', '#378ADD', '#5B53C6', '#C2587A', '#E08A3C', '#0F6E56']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkoutBuilder({ exercises, members, trainerId }: Props) {
  // Builder state
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [items, setItems] = useState<WorkoutItem[]>([])

  // Exercise library state
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('All')

  // Assign state
  const [assignMemberId, setAssignMemberId] = useState(members[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Filter exercises
  const filteredExercises = exercises.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    const matchMuscle = muscleFilter === 'All' || e.muscle_group === muscleFilter
    return matchSearch && matchMuscle
  })

  // Group by muscle group
  const grouped = filteredExercises.reduce<Record<string, Exercise[]>>((acc, e) => {
    const group = e.muscle_group ?? 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(e)
    return acc
  }, {})

  function addExercise(exercise: Exercise) {
    if (items.find(i => i.exercise_id === exercise.id)) return // already added
    setItems(prev => [...prev, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      sets: '3',
      reps: '10',
      weight: '',
      rest_seconds: '60',
      notes: '',
    }])
  }

  function removeExercise(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof WorkoutItem, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setItems(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
  }

  function moveDown(idx: number) {
    if (idx === items.length - 1) return
    setItems(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  async function handleSave() {
    if (!title.trim()) { setSaveError('Workout title is required'); return }
    if (items.length === 0) { setSaveError('Add at least one exercise'); return }

    setSaving(true)
    setSaveError('')
    console.log('[WorkoutBuilder] Saving template:', { title, goal, level, items: items.length })

    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        goal: goal.trim() || null,
        level,
        items: items.map((item, idx) => ({
          exercise_id: item.exercise_id,
          position: idx,
          sets: Number(item.sets) || null,
          reps: item.reps || null,
          weight: item.weight || null,
          rest_seconds: Number(item.rest_seconds) || null,
          notes: item.notes || null,
        })),
      }),
    })

    const json = await res.json()
    console.log('[WorkoutBuilder] Save response:', json)

    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    setSavedTemplateId(json.template_id)
    setSaving(false)
  }

  async function handleAssign() {
    if (!savedTemplateId) { setSaveError('Save the workout first'); return }
    if (!assignMemberId) return

    setAssigning(true)
    console.log('[WorkoutBuilder] Assigning to member:', assignMemberId)

    const res = await fetch('/api/workouts/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: savedTemplateId,
        member_id: assignMemberId,
      }),
    })

    const json = await res.json()
    console.log('[WorkoutBuilder] Assign response:', json)

    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to assign')
      setAssigning(false)
      return
    }

    const url = `${window.location.origin}/w/${json.share_token}`
    setShareUrl(url)
    setAssigning(false)
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedMember = members.find(m => m.id === assignMemberId)

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border bg-bg-card px-6 py-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Workout builder</h1>
            <p className="text-xs text-ink-muted">Create a workout plan and share it with a member</p>
          </div>
          <div className="flex items-center gap-2">
            {savedTemplateId && (
              <span className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : savedTemplateId ? 'Update' : 'Save workout'}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-600">
            {saveError}
          </div>
        )}

        {/* 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Exercise library ── */}
          <div className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Exercise library</p>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-full rounded-lg border border-border-medium bg-bg-input pl-8 pr-3 text-xs text-ink focus:border-brand-light focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {MUSCLE_GROUPS.map(g => (
                  <button
                    key={g}
                    onClick={() => setMuscleFilter(g)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      muscleFilter === g ? 'bg-brand text-white' : 'bg-bg-page text-ink-muted hover:bg-border'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {Object.entries(grouped).map(([group, exs]) => (
                <div key={group}>
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{group}</p>
                  {exs.map(e => {
                    const alreadyAdded = items.some(i => i.exercise_id === e.id)
                    return (
                      <button
                        key={e.id}
                        onClick={() => addExercise(e)}
                        disabled={alreadyAdded}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-brand-muted hover:text-brand'
                        }`}
                      >
                        <Dumbbell className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-ink">{e.name}</p>
                          {e.equipment && <p className="text-[10px] text-ink-muted">{e.equipment}</p>}
                        </div>
                        {!alreadyAdded && <Plus className="h-3.5 w-3.5 shrink-0 text-ink-muted ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              ))}
              {filteredExercises.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-ink-muted">No exercises found</p>
              )}
            </div>
          </div>

          {/* ── CENTER: Workout builder ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Workout meta */}
            <div className="border-b border-border p-4 flex gap-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Workout title (e.g. Push Day A)"
                className="h-9 flex-1 rounded-lg border border-border-medium bg-bg-input px-3 text-sm font-semibold text-ink placeholder:text-ink-muted focus:border-brand-light focus:outline-none"
              />
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Goal (e.g. Muscle gain)"
                className="h-9 w-44 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-light focus:outline-none"
              />
              <select
                value={level}
                onChange={e => setLevel(e.target.value as any)}
                className="h-9 w-36 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <Dumbbell className="h-12 w-12 text-ink-muted mb-3" />
                  <p className="text-sm font-medium text-ink">No exercises added yet</p>
                  <p className="text-xs text-ink-muted mt-1">Click exercises from the library on the left to add them</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.exercise_id} className="rounded-xl border border-border bg-bg-card p-4">
                    {/* Exercise header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink">{item.exercise_name}</p>
                        {item.muscle_group && <p className="text-xs text-ink-muted">{item.muscle_group}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="rounded p-1 text-ink-muted hover:bg-bg-page disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1} className="rounded p-1 text-ink-muted hover:bg-bg-page disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeExercise(idx)} className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sets/Reps/Weight/Rest */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[
                        { label: 'Sets', field: 'sets' as const, placeholder: '3' },
                        { label: 'Reps', field: 'reps' as const, placeholder: '10' },
                        { label: 'Weight', field: 'weight' as const, placeholder: 'BW / 20kg' },
                        { label: 'Rest (s)', field: 'rest_seconds' as const, placeholder: '60' },
                      ].map(({ label, field, placeholder }) => (
                        <div key={field}>
                          <label className="text-[10px] font-medium text-ink-muted">{label}</label>
                          <input
                            value={item[field]}
                            onChange={e => updateItem(idx, field, e.target.value)}
                            placeholder={placeholder}
                            className="mt-0.5 h-8 w-full rounded-lg border border-border-medium bg-bg-input px-2 text-xs text-ink focus:border-brand-light focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <input
                      value={item.notes}
                      onChange={e => updateItem(idx, 'notes', e.target.value)}
                      placeholder="Notes (optional)"
                      className="h-7 w-full rounded-lg border border-border bg-bg-page px-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand-light focus:outline-none"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: Assign panel ── */}
          <div className="flex w-64 shrink-0 flex-col border-l border-border bg-bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Assign to member</p>

              {members.length === 0 ? (
                <p className="text-xs text-ink-muted">No active members found.</p>
              ) : (
                <>
                  <select
                    value={assignMemberId}
                    onChange={e => setAssignMemberId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none mb-3"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>

                  {selectedMember && (
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: avatarColor(selectedMember.full_name) }}
                      >
                        {selectedMember.initials}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-ink">{selectedMember.full_name}</p>
                        <p className="text-[10px] text-ink-muted">Active member</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAssign}
                    disabled={assigning || !savedTemplateId}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    {assigning ? 'Assigning…' : 'Assign & share'}
                  </button>

                  {!savedTemplateId && (
                    <p className="mt-2 text-center text-[10px] text-ink-muted">Save the workout first</p>
                  )}
                </>
              )}
            </div>

            {/* Share link */}
            {shareUrl && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <Check className="h-3.5 w-3.5" /> Assigned successfully!
                </div>

                <div className="rounded-lg border border-border bg-bg-page p-2">
                  <p className="text-[10px] text-ink-muted mb-1">Share link</p>
                  <p className="break-all text-[10px] text-ink font-mono">{shareUrl}</p>
                </div>

                <button
                  onClick={copyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium text-ink-secondary hover:bg-bg-page"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-brand-muted py-2 text-xs font-medium text-brand hover:bg-brand-muted/80"
                >
                  <Link className="h-3.5 w-3.5" /> Preview workout
                </a>
              </div>
            )}

            {/* Stats */}
            <div className="mt-auto border-t border-border p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Exercises', value: items.length },
                  { label: 'Total sets', value: items.reduce((s, i) => s + (Number(i.sets) || 0), 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border p-2 text-center">
                    <p className="text-lg font-bold text-ink">{value}</p>
                    <p className="text-[10px] text-ink-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
