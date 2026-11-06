import { useEffect, useRef, useState } from 'react'
import { workout, type Rest } from '../lib/workout'
import { clock, fa } from '../lib/fa'
import { beep, haptic } from '../lib/haptics'

/** Countdown that survives re-renders and reloads (it is anchored to an absolute end time). */
export function RestTimer({ rest, lifted }: { rest: Rest; lifted: boolean }) {
  const [now, setNow] = useState(Date.now())
  const fired = useRef<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const left = Math.ceil((rest.endsAt - now) / 1000)
  useEffect(() => {
    if (left <= 0 && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt
      haptic.alarm()
      beep()
      const id = window.setTimeout(() => workout.clearRest(), 1500)
      return () => window.clearTimeout(id)
    }
  }, [left, rest.endsAt])

  const progress = Math.min(1, Math.max(0, 1 - (rest.endsAt - now) / (rest.duration * 1000)))
  const done = left <= 0

  return (
    <div className={`rest${lifted ? ' lifted' : ''}${done ? ' done' : ''}`} role="timer" aria-label="تایمر استراحت">
      <div className="rest-fill" style={{ transform: `scaleX(${progress})` }} />
      <button dir="ltr" className="rest-btn num" onClick={() => workout.adjustRest(-15)} aria-label="۱۵ ثانیه کمتر">
        −{fa(15)}
      </button>
      <div className="rest-time num">{done ? 'استراحت تمام شد' : clock(left)}</div>
      <button dir="ltr" className="rest-btn num" onClick={() => workout.adjustRest(15)} aria-label="۱۵ ثانیه بیشتر">
        +{fa(15)}
      </button>
      <button className="rest-btn" onClick={() => workout.clearRest()}>
        رد کردن
      </button>
    </div>
  )
}
