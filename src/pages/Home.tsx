import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Flame, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fa } from '../lib/fa'
import type { WorkoutLog } from '../lib/types'
import { useStartWorkout } from '../lib/useStartWorkout'
import { FeedSection } from './Feed'

interface Stats { total_workouts: number; streak_weeks: number }

/** Home: start training, this week at a glance, then the feed. */
export default function Home() {
  const { user } = useAuth()
  const start = useStartWorkout()
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/workouts/stats/') })
  const logs = useQuery({ queryKey: ['workouts'], queryFn: () => api<WorkoutLog[]>('/workouts/') })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted small">سلام {user?.name}</p>
          <h1 className="page-title">خانه</h1>
        </div>
        {!!stats.data?.streak_weeks && (
          <span className="badge gold" style={{ height: 32, fontSize: '0.9rem' }}>
            <Flame size={16} /> {fa(stats.data.streak_weeks)} هفته پیاپی
          </span>
        )}
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={() => start()}>
        <Plus size={20} /> شروع تمرین
      </button>

      <WeekPanel logs={logs.data ?? []} />
      <Link to="/history" className="row muted small" style={{ justifyContent: 'center', minHeight: 36, marginTop: -8 }}>
        {fa(stats.data?.total_workouts ?? 0)} تمرین ثبت‌شده <ChevronLeft size={16} />
      </Link>

      <FeedSection />
    </div>
  )
}

const PERSIAN_DAY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' })
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/** This week (Saturday to Friday, the Iranian week) with trained days filled in. */
function WeekPanel({ logs }: { logs: WorkoutLog[] }) {
  const today = new Date()
  const sat = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 1) % 7))
  const days = WEEKDAYS.map((label, i) => {
    const d = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + i)
    const key = d.toDateString()
    return { label, key, isToday: key === today.toDateString(), future: d > today, n: PERSIAN_DAY.format(d) }
  })
  const inWeek = logs.filter((w) => new Date(w.started_at) >= sat)
  const trained = new Set(inWeek.map((w) => new Date(w.started_at).toDateString()))
  const volume = inWeek.reduce((a, w) => a + w.total_volume_kg, 0)
  const minutes = inWeek.reduce((a, w) => a + w.duration_seconds, 0) / 60
  return (
    <section className="panel panel-pad stack" style={{ gap: 14 }}>
      <h2 className="section-title" style={{ margin: 0 }}>این هفته</h2>
      <div className="week">
        {days.map((d) => (
          <div key={d.key} className={`week-day${trained.has(d.key) ? ' on' : ''}${d.isToday ? ' today' : ''}${d.future ? ' future' : ''}`}>
            <span>{d.label}</span>
            <b className="num">{d.n}</b>
          </div>
        ))}
      </div>
      <div className="kv3">
        <div><small>جلسه</small><b className="num">{fa(inWeek.length)}</b></div>
        <div><small>حجم (کیلو)</small><b className="num">{fa(Math.round(volume))}</b></div>
        <div><small>دقیقه</small><b className="num">{fa(Math.round(minutes))}</b></div>
      </div>
    </section>
  )
}
