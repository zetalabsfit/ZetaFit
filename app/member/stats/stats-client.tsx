'use client'
import { useState } from 'react'
import { Plus, X, Trophy, TrendingDown, Target, Loader2 } from 'lucide-react'

interface ChartPoint { date: string; weight: number }
interface PersonalBest { id: string; exercise_name: string; weight_kg: number | null; reps: number | null; achieved_at: string }

interface Props {
  memberId: string
  orgId: string
  latestWeight: number | null
  goalKg: number | null
  bodyStats: any[]
  chartData: ChartPoint[]
  personalBests: PersonalBest[]
}

function calcBMI(weight: number, heightCm = 170) {
  const h = heightCm / 100
  return +(weight / (h * h)).toFixed(1)
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' }
  if (bmi < 25) return { label: 'Normal', color: '#1baf7a' }
  if (bmi < 30) return { label: 'Overweight', color: '#EDA100' }
  return { label: 'Obese', color: '#EF4444' }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

// BMI gauge (speedometer SVG)
function BMIGauge({ bmi }: { bmi: number }) {
  const { label, color } = bmiLabel(bmi)
  const minBMI = 15, maxBMI = 40
  const pct = Math.max(0, Math.min(1, (bmi - minBMI) / (maxBMI - minBMI)))
  const angle = -180 + pct * 180 // -180 to 0 degrees
  const rad = (angle * Math.PI) / 180
  const cx = 80, cy = 80, r = 60
  const nx = cx + r * Math.cos(rad)
  const ny = cy + r * Math.sin(rad)

  const segments = [
    { color: '#3B82F6', from: -180, to: -126 },
    { color: '#1baf7a', from: -126, to: -54 },
    { color: '#EDA100', from: -54, to: -18 },
    { color: '#EF4444', from: -18, to: 0 },
  ]

  function arcPath(from: number, to: number) {
    const f = (from * Math.PI) / 180
    const t = (to * Math.PI) / 180
    const x1 = cx + r * Math.cos(f), y1 = cy + r * Math.sin(f)
    const x2 = cx + r * Math.cos(t), y2 = cy + r * Math.sin(t)
    const large = to - from > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 90" className="w-40 h-20">
        {segments.map(s => (
          <path key={s.color} d={arcPath(s.from, s.to)} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="round" />
        ))}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#1F2937" />
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1F2937" fontFamily="Inter">{bmi}</text>
      </svg>
      <p className="text-xs font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  )
}

// Weight trend line SVG
function WeightChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) return (
    <div className="flex items-center justify-center h-24 text-sm text-ink-muted">Log more entries to see trend</div>
  )
  const weights = data.map(d => d.weight)
  const min = Math.min(...weights) - 1
  const max = Math.max(...weights) + 1
  const W = 300, H = 80
  const pts = data.map((d, i) => ({
    x: 10 + (i / (data.length - 1)) * (W - 20),
    y: H - 10 - ((d.weight - min) / (max - min)) * (H - 20),
    ...d,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '80px' }}>
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wGrad)" />
      <path d={line} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke="#3B82F6" strokeWidth="1.5" />
      ))}
      <text x={pts[0].x} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{pts[0].date}</text>
      <text x={pts[pts.length-1].x} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{pts[pts.length-1].date}</text>
    </svg>
  )
}

export default function StatsClient({ memberId, orgId, latestWeight, goalKg, bodyStats, chartData, personalBests: initialPBs }: Props) {
  const [personalBests, setPersonalBests] = useState(initialPBs)
  const [showLogWeight, setShowLogWeight] = useState(false)
  const [showLogPB, setShowLogPB] = useState(false)
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState(goalKg ? String(goalKg) : '')
  const [pbExercise, setPbExercise] = useState('')
  const [pbWeight, setPbWeight] = useState('')
  const [pbReps, setPbReps] = useState('')
  const [saving, setSaving] = useState(false)

  const bmi = latestWeight ? calcBMI(latestWeight) : null
  const toGo = latestWeight && goalKg ? Math.max(0, +(latestWeight - goalKg).toFixed(1)) : null
  const startWeight = bodyStats.length > 0 ? bodyStats[bodyStats.length - 1].weight_kg : null
  const totalLost = startWeight && latestWeight ? +(startWeight - latestWeight).toFixed(1) : null

  async function handleLogWeight() {
    if (!weight || isNaN(Number(weight))) return
    setSaving(true)
    const res = await fetch('/api/member/body-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: Number(weight), goal_kg: goal ? Number(goal) : null }),
    })
    if (res.ok) {
      setShowLogWeight(false)
      setWeight('')
      window.location.reload()
    }
    setSaving(false)
  }

  async function handleLogPB() {
    if (!pbExercise) return
    setSaving(true)
    const res = await fetch('/api/member/personal-best', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_name: pbExercise, weight_kg: pbWeight ? Number(pbWeight) : null, reps: pbReps ? Number(pbReps) : null }),
    })
    const json = await res.json()
    if (res.ok) {
      setPersonalBests(prev => [json.pb, ...prev])
      setShowLogPB(false); setPbExercise(''); setPbWeight(''); setPbReps('')
    }
    setSaving(false)
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <h2 className="text-lg font-bold text-ink">My stats</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'Weight', value: latestWeight ? `${latestWeight}kg` : '—', color: 'text-ink' },
          { label: 'BMI', value: bmi ? String(bmi) : '—', color: bmi ? bmiLabel(bmi).color : 'var(--text-primary)' },
          { label: 'Goal', value: goalKg ? `${goalKg}kg` : 'Not set', color: 'text-green-600' },
          { label: 'To go', value: toGo !== null ? `${toGo}kg` : '—', color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-bg-card p-3">
            <p className="text-xs text-ink-muted mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Log weight button */}
      <button onClick={() => setShowLogWeight(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
        <Plus className="h-4 w-4" /> Log weight
      </button>

      {/* BMI gauge */}
      {bmi && (
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-ink mb-3">Body mass index</p>
          <BMIGauge bmi={bmi} />
          <div className="mt-3 flex justify-between text-[9px] text-ink-muted">
            <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
          </div>
        </div>
      )}

      {/* Weight trend */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Weight trend</p>
            {totalLost !== null && totalLost > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingDown className="h-3.5 w-3.5" /> -{totalLost}kg total
              </span>
            )}
          </div>
          <WeightChart data={chartData} />
        </div>
      )}

      {/* Goal progress */}
      {goalKg && latestWeight && (
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-brand" />
            <p className="text-sm font-semibold text-ink">Goal · Reach {goalKg}kg</p>
            <span className="ml-auto text-xs text-ink-muted">
              {Math.max(0, +(latestWeight - goalKg).toFixed(1))}kg to go
            </span>
          </div>
          {startWeight && (
            <>
              <div className="h-2 rounded-full bg-border overflow-hidden mb-1">
                <div className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, ((startWeight - latestWeight) / (startWeight - goalKg)) * 100))}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-ink-muted">
                <span>{startWeight}kg start</span>
                <span>{goalKg}kg goal</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Personal bests */}
      <div className="rounded-2xl border border-border bg-bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <p className="text-sm font-semibold text-ink">Personal bests</p>
          </div>
          <button onClick={() => setShowLogPB(true)} className="text-xs font-medium text-brand hover:underline">+ Add PR</button>
        </div>
        {personalBests.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">No PRs yet. Log your first personal best!</p>
        ) : (
          <ul className="divide-y divide-border">
            {personalBests.slice(0, 5).map(pb => (
              <li key={pb.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">🏆</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{pb.exercise_name}</p>
                  <p className="text-xs text-ink-muted">
                    {pb.weight_kg ? `${pb.weight_kg}kg` : ''}
                    {pb.weight_kg && pb.reps ? ' · ' : ''}
                    {pb.reps ? `${pb.reps} reps` : ''}
                  </p>
                </div>
                <span className="text-xs text-ink-muted">{formatDate(pb.achieved_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Log Weight Modal */}
      {showLogWeight && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-semibold text-ink">Log weight</h3>
              <button onClick={() => setShowLogWeight(false)}><X className="h-4 w-4 text-ink-muted" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-medium text-ink-secondary">Current weight (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="76.4"
                  className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
              <div><label className="text-xs font-medium text-ink-secondary">Goal weight (kg, optional)</label>
                <input type="number" value={goal} onChange={e => setGoal(e.target.value)} placeholder="72"
                  className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button onClick={() => setShowLogWeight(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-ink-secondary hover:bg-bg-page">Cancel</button>
              <button onClick={handleLogWeight} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log PR Modal */}
      {showLogPB && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-semibold text-ink">Log personal best</h3>
              <button onClick={() => setShowLogPB(false)}><X className="h-4 w-4 text-ink-muted" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-medium text-ink-secondary">Exercise *</label>
                <input value={pbExercise} onChange={e => setPbExercise(e.target.value)} placeholder="e.g. Bench Press"
                  className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-ink-secondary">Weight (kg)</label>
                  <input type="number" value={pbWeight} onChange={e => setPbWeight(e.target.value)} placeholder="80"
                    className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
                <div><label className="text-xs font-medium text-ink-secondary">Reps</label>
                  <input type="number" value={pbReps} onChange={e => setPbReps(e.target.value)} placeholder="5"
                    className="mt-1 h-10 w-full rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button onClick={() => setShowLogPB(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-ink-secondary hover:bg-bg-page">Cancel</button>
              <button onClick={handleLogPB} disabled={saving || !pbExercise} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '🏆'}{saving ? 'Saving…' : 'Save PR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
