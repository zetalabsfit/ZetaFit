import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberLayout from '@/components/member-layout'
import { CheckCircle2, XCircle, CalendarCheck } from 'lucide-react'

export default async function MemberAttendancePage() {
  console.log('[MemberAttendance] Rendering...')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/member/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, initials, organization_id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) redirect('/member/login')

  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, checked_in_at, result, method')
    .eq('member_id', member.id)
    .order('checked_in_at', { ascending: false })
    .limit(60)

  // Stats
  const total = attendance?.length ?? 0
  const allowed = attendance?.filter(a => a.result === 'allowed').length ?? 0
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const thisMonth = attendance?.filter(a => new Date(a.checked_in_at) >= firstOfMonth).length ?? 0

  function formatDateTime(d: string) {
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    })
  }

  // Build heatmap for current month
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const attendedDays = new Set(
    (attendance ?? [])
      .filter(a => a.result === 'allowed' && new Date(a.checked_in_at).getMonth() === now.getMonth())
      .map(a => new Date(a.checked_in_at).getDate())
  )

  return (
    <MemberLayout activePage="attendance" memberName={member.full_name} memberId={member.id}>
      <div className="px-4 py-3 space-y-4">
        <h2 className="text-lg font-bold text-ink">My attendance</h2>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'This month', value: String(thisMonth) },
            { label: 'Total visits', value: String(allowed) },
            { label: 'All entries', value: String(total) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-bg-card p-3 text-center shadow-sm">
              <CalendarCheck className="mx-auto mb-1 h-4 w-4 text-brand-light" />
              <p className="text-lg font-bold text-ink">{value}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Month heatmap */}
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-ink">
            {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const attended = attendedDays.has(day)
              const isToday = day === now.getDate()
              return (
                <div
                  key={day}
                  title={`${day} ${now.toLocaleDateString('en-IN', { month: 'short' })}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    attended
                      ? 'bg-brand text-white'
                      : isToday
                      ? 'border-2 border-brand text-brand'
                      : 'bg-bg-page text-ink-muted'
                  }`}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-brand" />
              <span>Attended</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-bg-page border border-border" />
              <span>Not attended</span>
            </div>
          </div>
        </div>

        {/* Attendance log */}
        <div className="rounded-2xl border border-border bg-bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Recent entries</p>
          </div>
          {total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">No attendance recorded yet</p>
          ) : (
            <ul className="divide-y divide-border max-h-[360px] overflow-y-auto">
              {(attendance ?? []).map(a => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  {a.result === 'allowed'
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink capitalize">
                      {a.result === 'allowed' ? 'Checked in' : 'Entry blocked'}
                    </p>
                    <p className="text-xs capitalize text-ink-muted">{a.method}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">{formatDateTime(a.checked_in_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MemberLayout>
  )
}
