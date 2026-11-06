import { useTaxonomy } from '../lib/data'
import { fa } from '../lib/fa'
import { HIGH_SETS, loadOf, MUSCLE_ORDER } from '../lib/muscles'

interface Props {
  planned: Record<string, number>
  actual?: Record<string, number>
  compact?: boolean
}

const LABEL = { none: 'بدون تمرین', low: 'کم‌کار', ok: 'متعادل', high: 'پرفشار' }

/**
 * Weekly working sets per muscle. Blue = under-trained, green = balanced, red = heavy.
 * With `actual`, each row shows plan and logged volume on the same scale.
 */
export function MuscleBars({ planned, actual, compact }: Props) {
  const tax = useTaxonomy()
  const max = Math.max(HIGH_SETS + 4, ...Object.values(planned), ...Object.values(actual ?? {}))
  const rows = MUSCLE_ORDER.filter((m) => !compact || (planned[m] ?? 0) > 0 || (actual?.[m] ?? 0) > 0)
  return (
    <div className="mbars">
      {rows.length === 0 && <p className="small muted">با اضافه کردن حرکت، حجم هر عضله اینجا نمایش داده می‌شود.</p>}
      {rows.map((m) => {
        const p = planned[m] ?? 0
        const a = actual?.[m]
        const load = loadOf(actual ? (a ?? 0) : p)
        return (
          <div key={m} className="mbar" title={LABEL[load]}>
            <span className="mbar-label">{tax.label(m)}</span>
            <div className="mbar-track">
              {actual && <div className="mbar-plan" style={{ width: `${(p / max) * 100}%` }} />}
              <div className={`mbar-fill ${load}`} style={{ width: `${(((actual ? a : p) ?? 0) / max) * 100}%` }} />
            </div>
            <span className="mbar-val num">
              {actual ? `${fa(a ?? 0)} از ${fa(p)}` : fa(p)}
            </span>
          </div>
        )
      })}
      <div className="mbar-legend small">
        <span><i className="low" />کم‌کار (&lt;{fa(6)} ست)</span>
        <span><i className="ok" />متعادل</span>
        <span><i className="high" />پرفشار (&gt;{fa(20)})</span>
        {actual && <span><i className="plan" />برنامه</span>}
      </div>
    </div>
  )
}
