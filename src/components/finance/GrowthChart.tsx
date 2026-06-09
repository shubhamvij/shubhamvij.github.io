'use client'
import { useMemo, useRef, useState } from 'react'
import s from './finance.module.css'
import type { LifecyclePoint } from '@/lib/finance/types'

const W = 320
const H = 152
const PAD = { l: 30, r: 8, t: 10, b: 18 }

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

/** Round, evenly-spaced axis values from 0 up to about `max`. */
function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0]
  const rough = max / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const step = niceNorm * pow
  const ticks: number[] = []
  for (let v = 0; v <= max * 1.0001; v += step) ticks.push(v)
  return ticks
}

export default function GrowthChart({
  series,
  target,
  currentAge,
  retirementAge,
  lifeExpectancy,
  goalAge,
  depletionAge,
}: {
  series: LifecyclePoint[]
  target: number
  currentAge: number
  retirementAge: number
  lifeExpectancy: number
  goalAge: number | null
  depletionAge: number | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ age: number; balance: number; x: number; y: number } | null>(null)
  const [hovering, setHovering] = useState(false)

  const geo = useMemo(() => {
    const pts = series.length ? series : [{ age: currentAge, balance: 0 }]
    const minAge = currentAge
    const maxAge = Math.max(lifeExpectancy, pts[pts.length - 1].age, minAge + 1)
    const maxBalance = Math.max(target * 1.08, ...pts.map((p) => p.balance), 1)
    const xS = (age: number) => PAD.l + ((age - minAge) / (maxAge - minAge)) * (W - PAD.l - PAD.r)
    const yS = (b: number) => H - PAD.b - (b / maxBalance) * (H - PAD.t - PAD.b)

    const balanceAtAge = (age: number): number => {
      if (age <= pts[0].age) return pts[0].balance
      const last = pts[pts.length - 1]
      if (age >= last.age) return last.balance
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].age >= age) {
          const a = pts[i - 1]
          const b = pts[i]
          const t = (age - a.age) / (b.age - a.age)
          return a.balance + t * (b.balance - a.balance)
        }
      }
      return last.balance
    }

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.age).toFixed(1)},${yS(p.balance).toFixed(1)}`).join(' ')
    const lastX = xS(pts[pts.length - 1].age)
    const area = `${line} L${lastX.toFixed(1)},${(H - PAD.b).toFixed(1)} L${xS(pts[0].age).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`
    const targetY = yS(target)

    const span = maxAge - minAge
    const step = span <= 20 ? 5 : 10
    const xTicks: { x: number; label: string }[] = []
    for (let a = Math.ceil(minAge / step) * step; a <= maxAge; a += step) xTicks.push({ x: xS(a), label: `${a}` })
    const yTicks = niceTicks(maxBalance, 4).map((v) => ({ y: yS(v), label: shortMoney(v) }))

    const retireX = retirementAge > minAge && retirementAge < maxAge ? xS(retirementAge) : null
    const goalMarker = goalAge != null && goalAge >= minAge && goalAge <= maxAge ? { x: xS(goalAge), y: targetY } : null
    const depletionMarker = depletionAge != null && depletionAge <= maxAge ? { x: xS(depletionAge), y: yS(0) } : null
    return { line, area, targetY, xTicks, yTicks, retireX, goalMarker, depletionMarker, minAge, maxAge, xS, yS, balanceAtAge }
  }, [series, target, currentAge, retirementAge, lifeExpectancy, goalAge, depletionAge])

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const loc = pt.matrixTransform(ctm.inverse())
    const clampedX = Math.max(PAD.l, Math.min(W - PAD.r, loc.x))
    const age = geo.minAge + ((clampedX - PAD.l) / (W - PAD.l - PAD.r)) * (geo.maxAge - geo.minAge)
    const balance = geo.balanceAtAge(age)
    setCursor({ age, balance, x: geo.xS(age), y: geo.yS(balance) })
    setHovering(true)
  }

  const lasts = depletionAge == null
  const stroke = lasts ? '#2f6fb5' : '#c4492a'
  const fillId = lasts ? 'fpGreen' : 'fpAmber'

  const ageBadgeX = cursor ? Math.max(PAD.l + 14, Math.min(W - PAD.r - 14, cursor.x)) : 0
  const balBadgeY = cursor ? Math.max(PAD.t + 6, Math.min(H - PAD.b - 6, cursor.y)) : 0

  return (
    <div className={s.chart}>
      <svg
        ref={svgRef}
        className={s.chartSvg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Projected balance from now through retirement to life expectancy"
        onMouseMove={handleMove}
        onMouseLeave={() => setHovering(false)}
      >
        <defs>
          <linearGradient id="fpGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a6ea5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3a6ea5" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="fpAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4492a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c4492a" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* y axis: faint gridlines + dollar labels */}
        {geo.yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#e6e3d6" strokeWidth="1" />
            <text x={PAD.l - 4} y={t.y + 2.5} textAnchor="end" fontSize="7.5" fill="#7a7766" fontFamily="Tahoma, sans-serif">
              {t.label}
            </text>
          </g>
        ))}

        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#aca899" strokeWidth="1" />

        {/* retirement marker */}
        {geo.retireX != null && (
          <g>
            <line x1={geo.retireX} y1={PAD.t} x2={geo.retireX} y2={H - PAD.b} stroke="#7a96c8" strokeWidth="1" strokeDasharray="1 2" />
            <text x={geo.retireX} y={PAD.t + 2} textAnchor="middle" fontSize="7.5" fill="#3a5a92" fontFamily="Tahoma, sans-serif">
              retire {retirementAge}
            </text>
          </g>
        )}

        {/* target line */}
        <line x1={PAD.l} y1={geo.targetY} x2={W - PAD.r} y2={geo.targetY} stroke="#9a8f6a" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - PAD.r} y={geo.targetY - 3} textAnchor="end" fontSize="8" fill="#7a6f4a" fontFamily="Tahoma, sans-serif">
          goal {shortMoney(target)}
        </text>

        {/* area + line */}
        <path d={geo.area} fill={`url(#${fillId})`} />
        <path d={geo.line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />

        {/* age ticks */}
        {geo.xTicks.map((t, i) => (
          <text key={i} x={t.x} y={H - 5} textAnchor="middle" fontSize="8" fill="#6a6a5a" fontFamily="Tahoma, sans-serif">
            {t.label}
          </text>
        ))}

        {/* FI milestone */}
        {geo.goalMarker && (
          <g>
            <path
              d={`M${geo.goalMarker.x},${geo.goalMarker.y - 5} L${geo.goalMarker.x + 5},${geo.goalMarker.y} L${geo.goalMarker.x},${geo.goalMarker.y + 5} L${geo.goalMarker.x - 5},${geo.goalMarker.y} Z`}
              fill="#ffd700"
              stroke="#b8860b"
              strokeWidth="1"
            />
            <text x={geo.goalMarker.x} y={geo.goalMarker.y - 8} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b8860b" fontFamily="Tahoma, sans-serif">
              FI!
            </text>
          </g>
        )}

        {/* depletion marker */}
        {geo.depletionMarker && (
          <g>
            <circle cx={geo.depletionMarker.x} cy={geo.depletionMarker.y} r="3" fill="#c4492a" stroke="#7a2010" strokeWidth="1" />
            <text x={geo.depletionMarker.x} y={geo.depletionMarker.y - 5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#a83418" fontFamily="Tahoma, sans-serif">
              runs out
            </text>
          </g>
        )}

        {/* interactive crosshair */}
        {cursor && (
          <g className={s.crosshair} style={{ opacity: hovering ? 1 : 0 }} fontFamily="Tahoma, sans-serif">
            <line x1={cursor.x} y1={PAD.t} x2={cursor.x} y2={H - PAD.b} stroke="#33384a" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.55" />
            <line x1={PAD.l} y1={cursor.y} x2={cursor.x} y2={cursor.y} stroke="#33384a" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.55" />
            <circle className={s.crosshairDot} cx={cursor.x} cy={cursor.y} r="3.2" fill="#fff" stroke={stroke} strokeWidth="1.6" />

            {/* y-axis value badge */}
            <rect x={1} y={balBadgeY - 6} width={27} height={12} rx={2} fill="#1c3a5e" />
            <text x={14.5} y={balBadgeY + 2.5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">
              {shortMoney(cursor.balance)}
            </text>

            {/* x-axis (age) value badge */}
            <rect x={ageBadgeX - 16} y={H - PAD.b + 1.5} width={32} height={12} rx={2} fill="#1c3a5e" />
            <text x={ageBadgeX} y={H - PAD.b + 10} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">
              age {Math.round(cursor.age)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
