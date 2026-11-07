import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardPlus, Copy, KeyRound, MoreHorizontal, Pencil, Play, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { fa } from '../lib/fa'
import type { Routine } from '../lib/types'
import { useStartWorkout } from '../lib/useStartWorkout'
import { Thumb } from './Exercises'
import { Sheet } from '../components/Sheet'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { CodeEntry } from './Join'

export default function RoutinesPage() {
  const start = useStartWorkout()
  const confirm = useConfirm()
  const toast = useToast()
  const qc = useQueryClient()
  const { bySlug } = useExercises()
  const [codeOpen, setCodeOpen] = useState(false)
  const [preview, setPreview] = useState<Routine | null>(null)
  const [menuFor, setMenuFor] = useState<Routine | null>(null)
  const routines = useQuery({ queryKey: ['routines'], queryFn: () => api<Routine[]>('/routines/') })
  const done = (msg: string) => () => {
    qc.invalidateQueries({ queryKey: ['routines'] })
    setMenuFor(null)
    toast(msg)
  }
  const duplicate = useMutation({
    mutationFn: (id: number) => api<Routine>(`/routines/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: done('کپی روتین ساخته شد'),
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/routines/${id}/`, { method: 'DELETE' }),
    onSuccess: done('روتین حذف شد'),
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const askRemove = async (r: Routine) => {
    if (await confirm({ title: `حذف «${r.title}»؟`, body: 'این روتین برای همیشه حذف می‌شود.', confirm: 'حذف', danger: true })) remove.mutate(r.id)
  }

  const groups = new Map<string, Routine[]>()
  for (const r of routines.data ?? []) {
    const k = r.program_title ? `${r.program_title}|${r.coach_name}` : r.folder ? `${r.folder}|` : 'mine'
    groups.set(k, [...(groups.get(k) ?? []), r])
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">روتین‌ها</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCodeOpen(true)}>
            <KeyRound size={16} /> کد مربی
          </button>
          <Link className="btn btn-primary btn-sm" to="/routines/new">
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
                onClick={() => askRemove(menuFor)}
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
