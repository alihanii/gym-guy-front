import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, MessageCircle } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa, shortDate } from '../lib/fa'
import type { PublicUser, WorkoutLog } from '../lib/types'
import { CommentsSheet } from '../components/CommentsSheet'
import { formatField } from '../components/Numpad'
import { Thumb } from './Exercises'

type Social = WorkoutLog & { user: PublicUser; like_count: number; liked: boolean; comment_count: number }

/** Someone else's workout, read-only, with its comments. */
export default function SocialWorkout() {
  const { id } = useParams()
  const nav = useNavigate()
  const { bySlug } = useExercises()
  const [comments, setComments] = useState(false)
  const q = useQuery({ queryKey: ['social-workout', id], queryFn: () => api<Social>(`/social/workouts/${id}/`) })
  const w = q.data
  if (q.isError) return <div className="page"><p className="muted">این تمرین در دسترس نیست.</p></div>
  if (!w) return <div className="page"><div className="skeleton" style={{ height: 220 }} /></div>
  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{w.title}</h1>
          <p className="small muted"><Link to={`/u/${w.user.id}`} style={{ fontWeight: 700 }}>{w.user.name}</Link>، {shortDate(w.started_at)}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setComments(true)}><MessageCircle size={16} /> {fa(w.comment_count)}</button>
      </div>
      <div className="kv3 panel panel-pad">
        <div><small>مدت</small><b className="num">{clock(w.duration_seconds)}</b></div>
        <div><small>حجم</small><b className="num">{fa(Math.round(w.total_volume_kg))}</b></div>
        <div><small>ست کاری</small><b className="num">{fa(w.total_sets)}</b></div>
      </div>
      {w.notes && <p className="muted">{w.notes}</p>}
      {w.exercises.map((e, i) => {
        const ex = bySlug.get(e.exercise_id)
        return (
          <section key={i} className="panel panel-pad stack" style={{ gap: 8 }}>
            <Link to={`/exercises/${e.exercise_id}`} className="row">
              {ex && <Thumb e={ex} />}
              <b style={{ color: 'var(--title)' }}>{ex?.title_fa ?? e.exercise_id}</b>
            </Link>
            <ol className="set-lines">
              {e.sets.map((s, j) => (
                <li key={j} className="num">
                  <span className={`set-tag ${s.type}`}>{s.type === 'warmup' ? 'W' : s.type === 'dropset' ? 'D' : s.type === 'failure' ? 'F' : fa(e.sets.slice(0, j + 1).filter((x) => x.type !== 'warmup').length)}</span>
                  {[
                    s.weight_kg !== null && `${fa(s.weight_kg)} کیلو`,
                    s.reps !== null && `${fa(s.reps)} تکرار`,
                    s.duration_s !== null && formatField('duration_s', s.duration_s),
                  ].filter(Boolean).join(' × ')}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
      {comments && <CommentsSheet workoutId={w.id} onClose={() => setComments(false)} />}
    </div>
  )
}
