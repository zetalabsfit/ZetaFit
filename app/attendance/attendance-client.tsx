'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Search, CheckCircle2, XCircle, Phone,
  CalendarCheck, ScanLine, Loader2, Camera,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/qr-scanner'), { ssr: false })

type Tab = 'checkin' | 'log' | 'scanner'

interface CheckIn {
  id: string
  checked_in_at: string
  result: string
  method: string
  members: any
}

interface Props {
  todayCheckIns: CheckIn[]
  dayCount: Record<number, number>
  currentMonth: number
  currentYear: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#1D9E75','#378ADD','#5B53C6','#C2587A','#E08A3C','#0F6E56']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function heatColor(count: number) {
  if (count === 0) return 'bg-border'
  if (count <= 3) return 'bg-green-200'
  if (count <= 7) return 'bg-green-400'
  if (count <= 12) return 'bg-green-600'
  return 'bg-green-800'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AttendanceClient({ todayCheckIns: initial, dayCount, currentMonth, currentYear }: Props) {
  const [tab, setTab] = useState<Tab>('checkin')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>(initial)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanLoading, setScanLoading] = useState(false)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS = ['M','T','W','T','F','S','S']
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const startOffset = (firstDayOfMonth + 6) % 7 // Mon=0

  async function handleQueryChange(val: string) {
    setQuery(val)
    setResult(null)
    setError('')
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    if (/^\d+$/.test(val)) { setSuggestions([]); setShowSuggestions(false); return }
    const res = await fetch(`/api/attendance/search?q=${encodeURIComponent(val)}`)
    const json = await res.json()
    if (json.members?.length) { setSuggestions(json.members); setShowSuggestions(true) }
    else { setSuggestions([]); setShowSuggestions(false) }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setShowSuggestions(false)
    await doCheckin(query.trim(), 'phone')
  }

  async function doCheckin(phone: string, method: string) {
    setSearching(true); setResult(null); setError('')
    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, method }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Member not found'); setSearching(false); return }
    setResult(json)
    if (json.member) {
      setTodayCheckIns(prev => [{
        id: Date.now().toString(),
        checked_in_at: new Date().toISOString(),
        result: json.result,
        method,
        members: { full_name: json.member.full_name, initials: json.member.initials },
      }, ...prev])
    }
    setSearching(false)
  }

  async function handleSimulateScan() {
    setScanLoading(true)
    setScanResult(null)
    // Find first active member
    if (initial.length > 0) {
      const m = initial[0].members
      await new Promise(r => setTimeout(r, 1000))
      setScanResult({ result: 'allowed', member: { full_name: m?.full_name ?? 'Demo Member', initials: m?.initials ?? 'DM', plan_name: 'Standard', days_remaining: 45 } })
    } else {
      setScanResult({ result: 'allowed', member: { full_name: 'Demo Member', initials: 'DM', plan_name: 'Standard', days_remaining: 45 } })
    }
    setScanLoading(false)
  }

  async function handleQRScan(code: string) {
    setScannerOpen(false)
    setScanLoading(true)
    setScanResult(null)
    const res = await fetch('/api/join/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gym_code: code }),
    })
    const json = await res.json()
    setScanResult(json)
    setScanLoading(false)
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'checkin', label: "Today's check-ins", icon: CalendarCheck },
    { key: 'log', label: 'Attendance log', icon: ScanLine },
    { key: 'scanner', label: 'QR scanner', icon: Camera },
  ]

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-bg-page p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-bg-card text-brand shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Today's check-ins ── */}
      {tab === 'checkin' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Search */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-ink">Member check-in</p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    value={query}
                    onChange={e => handleQueryChange(e.target.value)}
                    placeholder="Phone number or member name…"
                    className="h-11 w-full rounded-lg border border-border-medium bg-bg-input pl-10 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-bg-card shadow-lg overflow-hidden">
                      {suggestions.map((m: any) => (
                        <button key={m.id} type="button"
                          onClick={() => { setQuery(m.full_name); setShowSuggestions(false); doCheckin(m.phone, 'phone') }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-page"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: avatarColor(m.full_name) }}>{m.initials}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink">{m.full_name}</p>
                            <p className="text-xs text-ink-muted">{m.phone}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{m.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={searching || !query.trim()}
                  className="flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {searching ? 'Checking…' : 'Check in'}
                </button>
              </form>
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3">
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}
            </div>

            {result && (
              <div className={`rounded-xl border-2 p-5 shadow-sm ${result.result === 'allowed' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow" style={{ background: avatarColor(result.member.full_name) }}>{result.member.initials}</div>
                    <div>
                      <p className="text-lg font-bold text-ink">{result.member.full_name}</p>
                      <p className="text-sm text-ink-secondary">{result.member.phone}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${result.result === 'allowed' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {result.result === 'allowed' ? <><CheckCircle2 className="h-4 w-4" /> ALLOWED</> : <><XCircle className="h-4 w-4" /> BLOCKED</>}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Plan', value: result.member.plan_name ?? 'No plan' },
                    { label: 'Expires', value: result.member.end_date ? formatDate(result.member.end_date) : '—' },
                    { label: 'Days left', value: result.member.days_remaining !== null ? `${result.member.days_remaining}d` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-white/70 p-2.5 text-center">
                      <p className="text-xs text-ink-muted">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                {result.result === 'blocked' && <p className="mt-3 text-sm font-medium text-red-700">⚠️ Membership expired. Ask member to renew.</p>}
                <button onClick={() => { setResult(null); setQuery('') }} className="mt-4 w-full rounded-lg border border-current py-2 text-sm font-semibold text-ink-secondary hover:bg-white/50">
                  Clear · check next member
                </button>
              </div>
            )}

            {!result && !error && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-medium py-14">
                <ScanLine className="h-10 w-10 text-ink-muted mb-3" />
                <p className="text-sm font-medium text-ink">Enter phone or name to check in</p>
                <p className="mt-1 text-xs text-ink-muted">Or use the QR scanner tab</p>
              </div>
            )}
          </div>

          {/* Today's log */}
          <div className="rounded-xl border border-border bg-bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                <span className="text-sm font-semibold text-ink">Updating live</span>
              </div>
              <span className="rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-bold text-brand">{todayCheckIns.length}</span>
            </div>
            {todayCheckIns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarCheck className="h-8 w-8 text-ink-muted mb-2" />
                <p className="text-sm text-ink-muted">No check-ins yet today</p>
              </div>
            ) : (
              <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
                {todayCheckIns.map(c => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: avatarColor(c.members?.full_name ?? '') }}>
                      {c.members?.initials ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.members?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs capitalize text-ink-muted">{c.method === 'qr' ? 'QR scan' : 'Phone'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-ink-muted">{timeAgo(c.checked_in_at)}</span>
                      {c.result === 'allowed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Attendance log / heatmap ── */}
      {tab === 'log' && (
        <div className="rounded-xl border border-border bg-bg-card p-6 shadow-sm max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-ink">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-ink-muted">Darker = busier</p>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-ink-muted">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const count = dayCount[day] ?? 0
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth()
              return (
                <div
                  key={day}
                  title={`${day} ${MONTHS[currentMonth]}: ${count} check-in${count !== 1 ? 's' : ''}`}
                  className={`relative aspect-square rounded-md transition-all cursor-default ${heatColor(count)} ${isToday ? 'ring-2 ring-brand ring-offset-1' : ''}`}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[10px] text-ink-muted">Less</span>
            {['bg-border', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'].map((c, i) => (
              <div key={i} className={`h-3.5 w-3.5 rounded-sm ${c}`} />
            ))}
            <span className="text-[10px] text-ink-muted">More</span>
          </div>

          {/* Month total */}
          <p className="mt-4 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{Object.values(dayCount).reduce((a, b) => a + b, 0)}</span> check-ins this month across{' '}
            <span className="font-semibold text-ink">{Object.keys(dayCount).length}</span> active days
          </p>
        </div>
      )}

      {/* ── TAB: QR scanner ── */}
      {tab === 'scanner' && (
        <div className="grid gap-5 lg:grid-cols-2 max-w-3xl">
          {/* Camera viewfinder */}
          <div className="rounded-xl overflow-hidden bg-gray-900 relative aspect-[4/3] flex flex-col items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-brand rounded-xl w-48 h-48 relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-brand animate-[scan_2s_linear_infinite]" style={{ top: '50%', animation: 'scan 2s linear infinite' }} />
              </div>
            </div>
            <p className="absolute bottom-4 text-sm text-white/70">Point camera at member QR</p>

            {scannerOpen && (
              <QRScanner onScan={handleQRScan} onClose={() => setScannerOpen(false)} />
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Result */}
            {scanResult && (
              <div className={`rounded-xl p-4 flex items-center gap-3 ${scanResult.result === 'allowed' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${scanResult.result === 'allowed' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {scanResult.result === 'allowed' ? <CheckCircle2 className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${scanResult.result === 'allowed' ? 'text-green-700' : 'text-red-700'}`}>
                    Check-in {scanResult.result === 'allowed' ? 'recorded' : 'blocked'}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {scanResult.member?.full_name} · {scanResult.member?.plan_name} · {scanResult.result === 'allowed' ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-bg-card p-5">
              <p className="text-sm font-semibold text-ink mb-1">Scan a member</p>
              <p className="text-xs text-ink-muted mb-4">Each member has a unique QR in their app. Scan to log entry instantly.</p>

              <button
                onClick={() => setScannerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-hover mb-2"
              >
                <Camera className="h-4 w-4" /> Open camera scanner
              </button>

              <button
                onClick={handleSimulateScan}
                disabled={scanLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-ink-secondary hover:bg-bg-page disabled:opacity-60"
              >
                {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {scanLoading ? 'Scanning…' : 'Simulate scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </main>
  )
}
