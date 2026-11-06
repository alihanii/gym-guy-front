import { useEffect, useRef, useState } from 'react'

export interface Point { t: number; y: number }

interface Props {
  points: Point[] // oldest first
  format: (y: number) => string
  formatX: (t: number) => string
  height?: number
  label: string
}

/** One-series line chart: 2px line, 8px markers, recessive grid, crosshair + tooltip on hover/touch. Time runs left to right. */
export function LineChart({ points, format, formatX, height = 200, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (points.length === 0) return null
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const ys = points.map((p) => p.y)
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (lo === hi) { lo -= 1; hi += 1 }
  const span = hi - lo
  lo = Math.max(0, lo - span * 0.15)
  hi = hi + span * 0.15
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih
  const ticks = [0, 0.5, 1].map((f) => lo + (hi - lo) * f)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('')

  const pick = (clientX: number) => {
    const r = wrap.current!.getBoundingClientRect()
    const px = clientX - r.left
    let best = 0
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
    setHover(best)
  }
  const h = hover !== null ? points[hover] : null

  return (
    <div ref={wrap} className="chart" dir="ltr">
      <svg
        width={w} height={height} role="img" aria-label={label}
        onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{format(t)}</text>
          </g>
        ))}
        <text x={pad.l} y={height - 6} className="chart-axis" textAnchor="start">{formatX(points[0].t)}</text>
        {points.length > 1 && (
          <text x={w - pad.r} y={height - 6} className="chart-axis" textAnchor="end">{formatX(points[points.length - 1].t)}</text>
        )}
        <path d={path} className="chart-line" />
        {h && <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={pad.t + ih} className="chart-cross" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.y)} r={hover === i ? 6 : 4} className="chart-dot" />
        ))}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover!), 70), w - 70), top: Math.max(y(h.y) - 56, 0) }}>
          <b className="num">{format(h.y)}</b>
          <span>{formatX(h.t)}</span>
        </div>
      )}
    </div>
  )
}
