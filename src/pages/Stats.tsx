import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { fa } from '../lib/fa'
import { BarChart } from '../components/BarChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { MuscleBars } from '../components/MuscleBars'

interface Stats {
  total_workouts: number
  streak_weeks: number
  days: string[]
  muscles_30d: Record<string, number>
  weekly: { week: string; volume_kg: number; sessions: number; minutes: number; sets: number }[]
}

type Metric = 'volume_kg' | 'minutes' | 'sets' | 'sessions'
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'volume_kg', label: 'حجم', unit: 'کیلو' },
  { key: 'minutes', label: 'مدت', unit: 'دقیقه' },
  { key: 'sets', label: 'ست', unit: 'ست' },
  { key: 'sessions', label: 'جلسه', unit: 'جلسه' },
]
const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' })

/** Fill the last 12 weeks so empty weeks show as gaps instead of disappearing. */
function last12(weekly: Stats['weekly']) {
  const byWeek = new Map(weekly.map((w) => [w.week, w]))
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - (11 - i) * 7)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { date: d, ...(byWeek.get(key) ?? { week: key, volume_kg: 0, sessions: 0, minutes: 0, sets: 0 }) }
  })
}

export default function StatsPage() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/workouts/stats/') })
  const [metric, setMetric] = useState<Metric>('volume_kg')
  const m = METRICS.find((x) => x.key === metric)!
  const weeks = q.data ? last12(q.data.weekly) : []
  const weekly = Object.fromEntries(Object.entries(q.data?.muscles_30d ?? {}).map(([k, v]) => [k, Math.round((v / (30 / 7)) * 10) / 10]))

  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <h1 className="page-title">آمار</h1>
      </div>
      {q.isLoading && <div className="skeleton" style={{ height: 260 }} />}
      {q.data && (
        <div className="stats-grid">
          <section className="panel panel-pad stack stats-wide">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <h2 className="section-title" style={{ margin: 0 }}>۱۲ هفته اخیر</h2>
              <div className="chips">
                {METRICS.map((x) => <button key={x.key} className="chip" aria-pressed={metric === x.key} onClick={() => setMetric(x.key)}>{x.label}</button>)}
              </div>
            </div>
            <BarChart
              label={`${m.label} هفتگی`}
              format={(y) => fa(Math.round(y))}
              bars={weeks.map((w) => ({ key: w.week, label: dayMonth.format(w.date), y: w[metric], tip: `${m.unit}، هفته ${dayMonth.format(w.date)}` }))}
            />
          </section>
          <section className="panel panel-pad">
            <MonthCalendar days={new Set(q.data.days)} />
          </section>
          <section className="panel panel-pad stack">
            <h2 className="section-title" style={{ margin: 0 }}>توزیع عضلات</h2>
            <p className="small muted">میانگین ست کاری در هفته، ۳۰ روز اخیر</p>
            <MuscleBars planned={weekly} compact />
          </section>
        </div>
      )}
    </div>
  )
}
