import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa, relativeDays } from '../lib/fa'
import type { FeedCard } from '../lib/types'
import { formatField } from './Numpad'
import { CommentsSheet } from './CommentsSheet'
import { Thumb } from '../pages/Exercises'

function bestText(b: FeedCard['exercises'][number]['best']) {
  if (b.weight_kg !== null && b.reps !== null) return `${fa(b.weight_kg)} کیلو × ${fa(b.reps)}`
  if (b.reps !== null) return `${fa(b.reps)} تکرار`
  if (b.duration_s !== null) return formatField('duration_s', b.duration_s)
  if (b.distance_m !== null) return `${formatField('distance_m', b.distance_m)} کیلومتر`
  return ''
}

/** One workout in the feed: who, what, totals, exercises with their best set, likes and comments. */
export function WorkoutCard({ w }: { w: FeedCard }) {
  const { bySlug } = useExercises()
  const qc = useQueryClient()
  const [liked, setLiked] = useState(w.liked)
  const [likes, setLikes] = useState(w.like_count)
  const [comments, setComments] = useState(w.comment_count)
  const [open, setOpen] = useState(false)
  const like = useMutation({
    mutationFn: (on: boolean) => api<{ like_count: number; liked: boolean }>(`/social/workouts/${w.id}/like/`, { method: on ? 'POST' : 'DELETE' }),
    onMutate: (on) => { setLiked(on); setLikes((n) => n + (on ? 1 : -1)) },
    onSuccess: (r) => { setLiked(r.liked); setLikes(r.like_count) },
    onError: () => { setLiked(w.liked); setLikes(w.like_count) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
  const detail = w.user.is_me ? `/history/${w.id}` : `/w/${w.id}`
  const shown = w.exercises.slice(0, 4)
  return (
    <article className="panel feed-card">
      <header className="row">
        <Link to={`/u/${w.user.id}`} className="avatar">{w.user.name.slice(0, 1)}</Link>
        <div className="grow">
          <Link to={`/u/${w.user.id}`} style={{ fontWeight: 800 }}>{w.user.name}</Link>
          <div className="small faint">{relativeDays(w.started_at)}</div>
        </div>
        {w.user.is_coach && <span className="badge blue">مربی</span>}
      </header>
      <Link to={detail} className="stack" style={{ gap: 10 }}>
        <h3 className="feed-title">{w.title}</h3>
        {w.notes && <p className="muted small">{w.notes}</p>}
        <div className="kv3">
          <div><small>مدت</small><b className="num">{clock(w.duration_seconds)}</b></div>
          <div><small>حجم</small><b className="num">{fa(Math.round(w.total_volume_kg))} <span className="small muted">کیلو</span></b></div>
          <div><small>رکورد</small><b className="num" style={w.records ? { color: 'var(--gold)' } : undefined}>{w.records ? <><Trophy size={16} /> {fa(w.records)}</> : '۰'}</b></div>
        </div>
        <ul className="routine-ex">
          {shown.map((e, i) => {
            const ex = bySlug.get(e.exercise_id)
            return (
              <li key={i}>
                {ex && <Thumb e={ex} />}
                <span className="grow ellipsis">{fa(e.sets)} ست {ex?.title_fa ?? ''}</span>
                <span className="small faint num">{bestText(e.best)}</span>
              </li>
            )
          })}
        </ul>
        {w.exercises.length > shown.length && <span className="small faint">و {fa(w.exercises.length - shown.length)} حرکت دیگر</span>}
      </Link>
      <footer className="feed-actions">
        <button className={`feed-btn${liked ? ' on' : ''}`} onClick={() => like.mutate(!liked)} aria-pressed={liked} aria-label="لایک">
          <Heart size={20} fill={liked ? 'currentColor' : 'none'} /> <span className="num">{fa(likes)}</span>
        </button>
        <button className="feed-btn" onClick={() => setOpen(true)} aria-label="کامنت‌ها">
          <MessageCircle size={20} /> <span className="num">{fa(comments)}</span>
        </button>
      </footer>
      {open && <CommentsSheet workoutId={w.id} onClose={() => setOpen(false)} onCount={setComments} />}
    </article>
  )
}
