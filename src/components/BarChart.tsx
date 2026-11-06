import { useEffect, useRef, useState } from 'react'

export interface Bar { key: string; label: string; y: number; tip: string }

/** One-series bar chart: thin bars with 4px rounded tops on the baseline, 2px gaps, hover/tap tooltip. */
export function BarChart({ bars, format, height = 200, label }: { bars: Bar[]; format: (y: number) => string; height?: number; label: string }) {
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
  const pad = { l: 44, r: 8, t: 12, b: 26 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const raw = Math.max(1, ...bars.map((b) => b.y))
  const mag = 10 ** Math.floor(Math.log10(raw))
  const max = ([1, 2, 2.5, 5, 10].find((f) => f * mag >= raw) ?? 10) * mag
  const slot = iw / Math.max(1, bars.length)
  const bw = Math.max(4, Math.min(28, slot - 6))
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const ticks = [0, 0.5, 1].map((f) => max * f)
  const h = hover !== null ? bars[hover] : null
  return (
    <div ref={wrap} className="chart" dir="ltr">
      <svg width={w} height={height} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{format(t)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = pad.l + slot * i + (slot - bw) / 2
          const top = y(b.y)
          const hh = Math.max(0, pad.t + ih - top)
          return (
            <g key={b.key} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
              {hh > 0 && (
                <path
                  className={`chart-bar${hover === i ? ' on' : ''}`}
                  d={`M${x},${pad.t + ih} V${top + Math.min(4, hh)} Q${x},${top} ${x + Math.min(4, bw / 2)},${top} H${x + bw - Math.min(4, bw / 2)} Q${x + bw},${top} ${x + bw},${top + Math.min(4, hh)} V${pad.t + ih} Z`}
                />
              )}
              {(i === 0 || i === bars.length - 1 || i === Math.floor(bars.length / 2)) && (
                <text x={x + bw / 2} y={height - 6} className="chart-axis" textAnchor="middle">{b.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(pad.l + slot * hover! + slot / 2, 70), w - 70), top: Math.max(y(h.y) - 56, 0) }}>
          <b className="num">{format(h.y)}</b>
          <span>{h.tip}</span>
        </div>
      )}
    </div>
  )
}
