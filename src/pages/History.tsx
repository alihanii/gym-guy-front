import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, History as HistoryIcon, MessageSquareQuote } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa, shortDate } from '../lib/fa'
import type { WorkoutLog } from '../lib/types'

export default function HistoryPage() {
  const q = useQuery({ queryKey: ['workouts'], queryFn: () => api<WorkoutLog[]>('/workouts/') })
  const { bySlug } = useExercises()
  return (
    <div className="page">
      <h1 className="page-title">تاریخچه</h1>
      {q.isLoading && <div className="skeleton" style={{ height: 120 }} />}
      {q.data?.length === 0 && (
        <div className="panel empty">
          <HistoryIcon size={32} />
          <p>هنوز تمرینی ثبت نکرده‌اید. بعد از اولین جلسه، رکوردها و حجم تمرین اینجا جمع می‌شود.</p>
        </div>
      )}
      <div className="stack">
        {q.data?.map((w) => (
          <Link key={w.id} to={`/history/${w.id}`} className="panel panel-pad stack" style={{ gap: 8 }}>
            <div className="row">
              <div className="grow">
                <div style={{ fontWeight: 800 }}>{w.title}</div>
                <div className="small muted">{shortDate(w.completed_at)}</div>
              </div>
              {w.records.length > 0 && (
                <span className="badge gold"><Trophy size={14} /> {fa(w.records.length)} رکورد</span>
              )}
              {w.coach_feedback && <MessageSquareQuote size={18} color="var(--primary)" aria-label="بازخورد مربی" />}
            </div>
            <div className="row small muted num" style={{ gap: 16 }}>
              <span>{clock(w.duration_seconds)}</span>
              <span>{fa(Math.round(w.total_volume_kg))} کیلو</span>
              <span>{fa(w.total_sets)} ست</span>
            </div>
            <div className="small faint ellipsis">
              {w.exercises.map((e) => `${fa(e.sets.length)}× ${bySlug.get(e.exercise_id)?.title_fa ?? ''}`).join('، ')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
