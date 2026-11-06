import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ClipboardPlus, Copy, Flame, KeyRound, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useExercises } from '../lib/data'
import { fa } from '../lib/fa'
import type { Routine, WorkoutLog } from '../lib/types'
import { Thumb } from './Exercises'
import { useActiveWorkout, workout } from '../lib/workout'
import { Sheet } from '../components/Sheet'
import { CodeEntry } from './Join'

interface Stats { total_workouts: number; streak_weeks: number; weekly: { week: string; volume_kg: number; sessions: number }[] }

export default function Home() {
  const { user } = useAuth()
  const nav = useNavigate()
  const active = useActiveWorkout()
  const [codeOpen, setCodeOpen] = useState(false)
  const [preview, setPreview] = useState<Routine | null>(null)
  const routines = useQuery({ queryKey: ['routines'], queryFn: () => api<Routine[]>('/routines/') })
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/workouts/stats/') })
  const logs = useQuery({ queryKey: ['workouts'], queryFn: () => api<WorkoutLog[]>('/workouts/') })
  const { bySlug } = useExercises()
  const qc = useQueryClient()
  const [menuFor, setMenuFor] = useState<Routine | null>(null)
  const duplicate = useMutation({
    mutationFn: (id: number) => api<Routine>(`/routines/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); setMenuFor(null) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/routines/${id}/`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); setMenuFor(null) },
  })

  const start = (r?: Routine) => {
    if (active && !confirm('یک تمرین در جریان است. آن را کنار بگذارید و تمرین جدید شروع کنید؟')) return
    if (r) workout.startRoutine(r)
    else workout.startEmpty()
    nav('/workout')
  }

  const groups = new Map<string, Routine[]>()
  for (const r of routines.data ?? []) {
    const k = r.program_title ? `${r.program_title}|${r.coach_name}` : r.folder ? `${r.folder}|` : 'mine'
    groups.set(k, [...(groups.get(k) ?? []), r])
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted small">سلام {user?.name}</p>
          <h1 className="page-title">تمرین</h1>
        </div>
        {!!stats.data?.streak_weeks && (
          <span className="badge gold" style={{ height: 32, fontSize: '0.9rem' }}>
            <Flame size={16} /> {fa(stats.data.streak_weeks)} هفته پیاپی
          </span>
        )}
      </div>

      <div className="home-grid">
        <div className="stack" style={{ gap: 28 }}>
          <section>
            <h2 className="section-title">شروع سریع</h2>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => start()}>
              <Plus size={20} /> شروع تمرین خالی
            </button>
          </section>

          <section>
            <div className="section-title">
              <h2 style={{ fontSize: 'inherit' }}>روتین‌ها</h2>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setCodeOpen(true)}>
                  <KeyRound size={16} /> کد مربی
                </button>
                <Link className="btn btn-ghost btn-sm" to="/routines/new">
                  <ClipboardPlus size={16} /> روتین جدید
                </Link>
              </div>
            </div>

            {routines.isLoading && <div className="routine-grid"><div className="skeleton" style={{ height: 200 }} /><div className="skeleton" style={{ height: 200 }} /></div>}

            {routines.data?.length === 0 && (
              <div className="panel empty">
                <KeyRound size={32} />
                <p>هنوز روتینی ندارید. کد ۶ رقمی مربی‌تان را وارد کنید تا برنامه‌اش همین‌جا بنشیند، یا یک تمرین خالی شروع کنید.</p>
                <button className="btn btn-ghost" onClick={() => setCodeOpen(true)}>وارد کردن کد مربی</button>
              </div>
            )}

            <div className="stack" style={{ gap: 20 }}>
              {[...groups.entries()].map(([k, list]) => {
                const [title, coach] = k === 'mine' ? ['روتین‌های من', null] : k.split('|')
                return (
                  <div key={k} className="stack" style={{ gap: 10 }}>
                    <div className="row small muted" style={{ fontWeight: 700 }}>
                      <span className="grow">{title}</span>
                      {coach && <span className="badge blue">مربی: {coach}</span>}
                    </div>
                    <div className="routine-grid">
                      {list.map((r) => (
                        <article key={r.id} className="panel routine">
                          <button className="routine-body" onClick={() => setPreview(r)}>
                            <h3 className="row" style={{ justifyContent: 'space-between' }}>
                              <span className="ellipsis">{r.title}</span>
                            </h3>
                            <ul className="routine-ex">
                              {r.exercises.slice(0, 3).map((e, i) => {
                                const ex = bySlug.get(e.exercise_id)
                                return (
                                  <li key={i}>
                                    {ex && <Thumb e={ex} />}
                                    <span className="grow ellipsis">{ex?.title_fa ?? e.exercise_id}</span>
                                    <span className="faint small num">{fa(e.sets.length)} ست</span>
                                  </li>
                                )
                              })}
                            </ul>
                            {r.exercises.length > 3 && (
                              <span className="small faint">و {fa(r.exercises.length - 3)} حرکت دیگر</span>
                            )}
                          </button>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn btn-primary grow" onClick={() => start(r)}>
                              <Play size={16} fill="currentColor" /> شروع روتین
                            </button>
                            <button className="icon-btn" onClick={() => setMenuFor(r)} aria-label={`گزینه‌های ${r.title}`}>
                              <MoreHorizontal size={20} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="stack home-side" style={{ gap: 16 }}>
          <WeekPanel logs={logs.data ?? []} />
          <Link to="/history" className="row muted small" style={{ justifyContent: 'center', minHeight: 44 }}>
            {fa(stats.data?.total_workouts ?? 0)} تمرین ثبت‌شده <ChevronLeft size={16} />
          </Link>
        </aside>
      </div>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.title}>
        {menuFor && (
          <div className="list panel" style={{ overflow: 'hidden' }}>
            {!menuFor.program && (
              <Link className="list-item" to={`/routines/${menuFor.id}`}><Pencil size={20} /> ویرایش روتین</Link>
            )}
            <button className="list-item" onClick={() => duplicate.mutate(menuFor.id)}><Copy size={20} /> ساخت کپی</button>
            {!menuFor.program && (
              <button
                className="list-item"
                style={{ color: 'var(--failure)' }}
                onClick={() => confirm(`روتین «${menuFor.title}» حذف شود؟`) && remove.mutate(menuFor.id)}
              >
                <Trash2 size={20} /> حذف روتین
              </button>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={codeOpen} onClose={() => setCodeOpen(false)} title="کد مربی">
        <CodeEntry onDone={() => setCodeOpen(false)} />
      </Sheet>

      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview && (
          <div className="stack">
            <div className="list panel" style={{ overflow: 'hidden' }}>
              {preview.exercises.map((e, i) => (
                <div key={i} className="list-item" style={{ cursor: 'default' }}>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{bySlug.get(e.exercise_id)?.title_fa}</div>
                    <div className="small muted num">
                      {fa(e.sets.filter((s) => s.type !== 'warmup').length)} ست × {fa(e.sets.find((s) => s.type !== 'warmup')?.reps || '—')}
                      {e.tempo && `، تمپو ${fa(e.tempo)}`}
                      {e.target_rpe && `، RPE ${fa(e.target_rpe)}`}
                    </div>
                    {e.notes && <div className="small" style={{ color: '#cfe0ff', marginTop: 4 }}>{e.notes}</div>}
                  </div>
                  {e.superset_group !== null && <span className="badge" style={{ color: '#c4b5fd' }}>سوپرست</span>}
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => start(preview)}>
              <Play size={18} fill="currentColor" /> شروع این روتین
            </button>
          </div>
        )}
      </Sheet>

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
