import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const pDay = new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' })
const pMonth = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' })
const pYear = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' })
const faDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' })
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** First day of the Persian month that contains `d`. */
function monthStart(d: Date) {
  let x = d
  while (+pDay.format(x) !== 1) x = addDays(x, -1)
  return x
}

/** A Persian-calendar month grid (Saturday first) with trained days marked. */
export function MonthCalendar({ days }: { days: Set<string> }) {
  const [offset, setOffset] = useState(0)
  let start = monthStart(new Date())
  for (let i = 0; i < offset; i++) start = monthStart(addDays(start, -1))
  const cells: (Date | null)[] = Array((start.getDay() + 1) % 7).fill(null)
  cells.push(start)
  for (let d = addDays(start, 1); +pDay.format(d) !== 1; d = addDays(d, 1)) cells.push(d)
  const today = iso(new Date())
  const count = cells.filter((d) => d && days.has(iso(d))).length
  return (
    <div className="cal">
      <div className="row">
        <button className="icon-btn" onClick={() => setOffset((o) => o + 1)} aria-label="ماه قبل"><ChevronRight size={20} /></button>
        <b className="grow" style={{ textAlign: 'center' }}>{pMonth.format(start)} {pYear.format(start).replace(/[^۰-۹]/g, '')}</b>
        <button className="icon-btn" disabled={offset === 0} onClick={() => setOffset((o) => o - 1)} aria-label="ماه بعد"><ChevronLeft size={20} /></button>
      </div>
      <div className="cal-grid">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => <span key={w} className="cal-hd">{w}</span>)}
        {cells.map((d, i) =>
          d ? (
            <span key={i} className={`cal-day num${days.has(iso(d)) ? ' on' : ''}${iso(d) === today ? ' today' : ''}`}>{faDay.format(d)}</span>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>{count ? `${new Intl.NumberFormat('fa-IR').format(count)} روز تمرین در این ماه` : 'در این ماه تمرینی ثبت نشده'}</p>
    </div>
  )
}
