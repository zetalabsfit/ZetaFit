'use client'

const HOURS = ['12','1','2','3','4','5','6','7','8','9','10','11']
const MINUTES = ['00','30']
const PERIODS = ['AM','PM']

function parseTime(val: string) {
  const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match) return { hour: match[1], minute: match[2], period: match[3].toUpperCase() }
  return { hour: '6', minute: '00', period: 'AM' }
}

function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { hour, minute, period } = parseTime(value)
  const update = (h: string, m: string, p: string) => onChange(`${h}:${m} ${p}`)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-ink-secondary">{label}</label>
      <div className="flex gap-1">
        <select
          value={hour}
          onChange={e => update(e.target.value, minute, period)}
          className="h-10 flex-1 rounded-lg border border-border-medium bg-bg-input px-2 text-sm text-ink focus:border-brand-light focus:outline-none"
        >
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={minute}
          onChange={e => update(hour, e.target.value, period)}
          className="h-10 w-16 rounded-lg border border-border-medium bg-bg-input px-2 text-sm text-ink focus:border-brand-light focus:outline-none"
        >
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={period}
          onChange={e => update(hour, minute, e.target.value)}
          className="h-10 w-16 rounded-lg border border-border-medium bg-bg-input px-2 text-sm text-ink focus:border-brand-light focus:outline-none"
        >
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function TimeRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split('–').map(s => s.trim())
  const openTime = parts[0] || '5:00 AM'
  const closeTime = parts[1] || '10:00 PM'

  return (
    <div className="grid grid-cols-2 gap-3">
      <TimePicker label="Opens" value={openTime} onChange={val => onChange(`${val} – ${closeTime}`)} />
      <TimePicker label="Closes" value={closeTime} onChange={val => onChange(`${openTime} – ${val}`)} />
    </div>
  )
}
