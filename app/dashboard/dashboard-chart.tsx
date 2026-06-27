'use client'
import { useState } from 'react'

interface DataPoint { month: string; revenue: number }
interface Props { data: DataPoint[]; totalRevenue: number }

function formatINR(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}
function formatINRFull(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export default function DashboardChart({ data, totalRevenue }: Props) {
  const [range, setRange] = useState<'3M' | '6M'>('6M')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null)

  const displayed = range === '3M' ? data.slice(-3) : data

  const max = Math.max(...displayed.map(d => d.revenue), 1)
  const W = 600
  const H = 160
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const points = displayed.map((d, i) => ({
    x: PAD.left + (i / Math.max(displayed.length - 1, 1)) * chartW,
    y: PAD.top + chartH - (d.revenue / max) * chartH,
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`
    : ''

  // Y axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    value: max * t,
    y: PAD.top + chartH - t * chartH,
  }))

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Revenue trend</p>
          <p className="mt-0.5 text-2xl font-bold text-ink">{formatINRFull(totalRevenue)}</p>
          <p className="text-xs text-ink-muted">last {range === '3M' ? '3' : '6'} months</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-bg-page p-0.5">
          {(['3M', '6M'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${range === r ? 'bg-bg-card text-brand shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '160px' }}
          onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid lines */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray={i > 0 ? '4 4' : '0'} />
              <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                {formatINR(t.value)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

          {/* Line */}
          {linePath && <path d={linePath} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data points + hover areas */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#1D9E75" strokeWidth="2" />
              <text x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{p.month}</text>
              {/* invisible hover target */}
              <rect x={p.x - 20} y={0} width={40} height={H} fill="transparent"
                onMouseEnter={e => {
                  const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
                  setTooltip({ x: p.x, y: p.y, point: p })
                }}
              />
            </g>
          ))}

          {/* Tooltip dot highlight */}
          {tooltip && (
            <circle cx={tooltip.x} cy={tooltip.y} r={6} fill="#1D9E75" />
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg text-xs"
            style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100}%`, transform: 'translate(-50%, -120%)' }}>
            <p className="font-semibold text-ink">{formatINRFull(tooltip.point.revenue)}</p>
            <p className="text-ink-muted">{tooltip.point.month}</p>
          </div>
        )}
      </div>
    </div>
  )
}
