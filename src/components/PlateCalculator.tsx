import { useState } from 'react'
import { Sheet } from './Sheet'
import { fa } from '../lib/fa'

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
const COLORS: Record<number, string> = {
  25: '#e5484d', 20: '#3b82f6', 15: '#f5c451', 10: '#10b981', 5: '#e8eaf0', 2.5: '#9aa3b5', 1.25: '#6b7385',
}

export function platesFor(target: number, bar: number): { plates: number[]; remainder: number } {
  let side = Math.max(0, (target - bar) / 2)
  const plates: number[] = []
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      plates.push(p)
      side -= p
    }
  }
  return { plates, remainder: +(side * 2).toFixed(2) }
}

export function PlateCalculator({ open, onClose, weight }: { open: boolean; onClose: () => void; weight: number }) {
  const [bar, setBar] = useState(20)
  const { plates, remainder } = platesFor(weight, bar)
  return (
    <Sheet open={open} onClose={onClose} title={`صفحه‌ها برای ${fa(weight)} کیلو`}>
      <div className="stack" style={{ gap: 18 }}>
        <div className="segmented">
          {[20, 15, 10].map((b) => (
            <button key={b} aria-pressed={bar === b} onClick={() => setBar(b)}>
              هالتر {fa(b)} کیلویی
            </button>
          ))}
        </div>
        <div className="barbell" dir="ltr" aria-hidden="true">
          <div className="bar-sleeve" />
          <div className="bar-collar" />
          {plates.map((p, i) => (
            <div
              key={i}
              className="plate"
              style={{ background: COLORS[p], height: `${40 + (p / 25) * 60}%`, width: p >= 10 ? 18 : 12 }}
            />
          ))}
          <div className="bar-shaft" />
        </div>
        {weight <= bar ? (
          <p className="muted">وزنه هدف از وزن خود هالتر کمتر یا برابر است.</p>
        ) : (
          <div>
            <div className="section-title">در هر طرف</div>
            <div className="chips">
              {plates.length === 0 && <span className="muted">صفحه‌ای لازم نیست.</span>}
              {Object.entries(
                plates.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {}),
              )
                .sort((a, b) => +b[0] - +a[0])
                .map(([p, n]) => (
                  <span key={p} className="badge" style={{ height: 32, fontSize: '0.95rem' }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[+p], display: 'inline-block' }} />
                    {fa(n)} × {fa(+p)} کیلو
                  </span>
                ))}
            </div>
            {remainder > 0 && <p className="small muted" style={{ marginTop: 10 }}>{fa(remainder)} کیلو با صفحه‌های موجود جور نمی‌شود.</p>}
          </div>
        )}
      </div>
    </Sheet>
  )
}
