import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, MessageSquareQuote, Pencil, Save, Trash2, Trophy, X } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa, shortDate, toLatinDigits } from '../lib/fa'
import type { PerformedBlock, RecordHit, WorkoutLog } from '../lib/types'
import { Thumb } from './Exercises'
import { useToast } from '../components/Toast'
import { formatField } from '../components/Numpad'

const RECORD_LABEL: Record<RecordHit['kind'], string> = {
  est_1rm: 'یک تکرار بیشینه (تخمینی)',
  max_weight: 'سنگین‌ترین وزنه',
  max_volume: 'بیشترین حجم ست',
  max_reps: 'بیشترین تکرار',
}

export default function WorkoutDetail() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const fresh = sp.get('done') === '1'
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { bySlug } = useExercises()
  const q = useQuery({ queryKey: ['workouts', id], queryFn: () => api<WorkoutLog>(`/workouts/${id}/`) })
  const asRoutine = useMutation({
    mutationFn: (w: WorkoutLog) =>
      api('/routines/', {
        method: 'POST',
        json: {
          title: w.title,
          exercises: w.exercises.map((e) => ({
            exercise_id: e.exercise_id, superset_group: e.superset_group, rest_seconds: e.rest_seconds,
            sets: e.sets.map((s) => ({ type: s.type, reps: s.reps ? String(s.reps) : '', weight_kg: s.weight_kg })),
          })),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] })
      toast('به روتین‌های شما اضافه شد.')
    },
    onError: (e: Error) => toast(e.message),
  })

  const [draft, setDraft] = useState<{ title: string; exercises: PerformedBlock[] } | null>(null)
  const saveEdit = useMutation({
    mutationFn: () => api<WorkoutLog>(`/workouts/${id}/`, { method: 'PATCH', json: draft }),
    onSuccess: (log) => {
      qc.setQueryData(['workouts', id], log)
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setDraft(null)
      toast('تغییرات ذخیره شد')
    },
    onError: (e: Error) => toast(e.message),
  })
  const remove = useMutation({
    mutationFn: () => api(`/workouts/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      nav('/history', { replace: true })
    },
  })

  const w = q.data
  if (!w) return <div className="page"><div className="skeleton" style={{ height: 200 }} /></div>
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => nav(fresh ? '/' : '/history')} aria-label="بازگشت">
          <ChevronRight size={26} />
        </button>
        <div className="grow">
          {fresh && <p className="small" style={{ color: '#6ee7b7', fontWeight: 700 }}>تمرین ذخیره شد</p>}
          <h1 className="page-title" style={{ fontSize: '1.35rem' }}>{w.title}</h1>
          <p className="small muted">{shortDate(w.completed_at)}</p>
        </div>
        {!draft && (
          <button className="btn btn-ghost btn-sm" onClick={() => setDraft({ title: w.title, exercises: structuredClone(w.exercises) })}>
            <Pencil size={16} /> ویرایش
          </button>
        )}
      </div>

      {draft && (
        <EditWorkout
          draft={draft}
          setDraft={setDraft}
          saving={saveEdit.isPending}
          onSave={() => saveEdit.mutate()}
          onDelete={() => confirm('این تمرین برای همیشه حذف شود؟') && remove.mutate()}
        />
      )}

      {!draft && (
        <>
      <div className="wk-stats panel" style={{ borderBottom: 0 }}>
        <div><span className="muted small">مدت</span><b className="num">{clock(w.duration_seconds)}</b></div>
        <div><span className="muted small">حجم</span><b className="num">{fa(Math.round(w.total_volume_kg))} <small>کیلو</small></b></div>
        <div><span className="muted small">ست کاری</span><b className="num">{fa(w.total_sets)}</b></div>
      </div>

      {w.records.length > 0 && (
        <section className="panel panel-pad records">
          <div className="section-title"><span className="row" style={{ gap: 8 }}><Trophy size={20} color="var(--gold)" /> رکوردهای جدید</span></div>
          <div className="stack" style={{ gap: 8 }}>
            {w.records.map((r, i) => (
              <div key={i} className="row">
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{bySlug.get(r.exercise_id)?.title_fa}</div>
                  <div className="small muted">{RECORD_LABEL[r.kind]}</div>
                </div>
                <div className="num" style={{ textAlign: 'left' }}>
                  <b style={{ color: 'var(--gold)' }}>{fa(r.value)}</b>
                  <div className="small faint">قبلی {fa(r.previous)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {w.coach_feedback && (
        <p className="coach-note"><MessageSquareQuote size={18} /> <span><b>بازخورد مربی:</b> {w.coach_feedback}</span></p>
      )}

      <div className="stack">
        {w.exercises.map((e, i) => {
          const ex = bySlug.get(e.exercise_id)
          return (
            <section key={i} className="panel panel-pad">
              <Link to={`/exercises/${e.exercise_id}`} className="row" style={{ marginBottom: 10 }}>
                {ex && <Thumb e={ex} />}
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--title)' }}>{ex?.title_fa}</h3>
              </Link>
              <div className="stack" style={{ gap: 4 }}>
                {e.sets.map((s, j) => (
                  <div key={j} className="row small num" style={{ gap: 12 }}>
                    <span className={`set-no ${s.type}`} style={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                      {s.type === 'warmup' ? 'W' : s.type === 'normal' ? fa(e.sets.slice(0, j + 1).filter((x) => x.type !== 'warmup').length) : s.type[0].toUpperCase()}
                    </span>
                    <span>
                      {[
                        s.weight_kg !== null && `${fa(s.weight_kg)} کیلو`,
                        s.reps !== null && `${fa(s.reps)} تکرار`,
                        s.duration_s !== null && formatField('duration_s', s.duration_s),
                        s.distance_m !== null && `${formatField('distance_m', s.distance_m)} کیلومتر`,
                        s.rpe !== null && `RPE ${fa(s.rpe)}`,
                      ].filter(Boolean).join('، ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {!w.routine && (
        <button className="btn btn-ghost btn-block" disabled={asRoutine.isPending || asRoutine.isSuccess} onClick={() => asRoutine.mutate(w)}>
          <Save size={18} /> {asRoutine.isSuccess ? 'ذخیره شد' : 'ذخیره به‌عنوان روتین'}
        </button>
      )}
        </>
      )}
    </div>
  )
}

const faDigits = (v: string | number) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace('.', '٫')
const num = (raw: string) => {
  const v = toLatinDigits(raw).replace('٫', '.').replace(/[^\d.]/g, '')
  return v === '' ? null : +v
}

type Draft = { title: string; exercises: PerformedBlock[] }

function EditWorkout({ draft, setDraft, saving, onSave, onDelete }: {
  draft: Draft; setDraft: (d: Draft | null) => void; saving: boolean; onSave: () => void; onDelete: () => void
}) {
  const { bySlug } = useExercises()
  const setBlock = (i: number, b: PerformedBlock | null) =>
    setDraft({ ...draft, exercises: draft.exercises.flatMap((x, j) => (j === i ? (b ? [b] : []) : [x])) })
  return (
    <div className="stack">
      <input className="title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="عنوان تمرین" />
      {draft.exercises.map((b, i) => {
        const ex = bySlug.get(b.exercise_id)
        return (
          <section key={i} className="panel re-block">
            <div className="row">
              {ex && <Thumb e={ex} />}
              <b className="grow ellipsis" style={{ color: 'var(--title)' }}>{ex?.title_fa ?? b.exercise_id}</b>
              <button className="icon-btn" onClick={() => setBlock(i, null)} aria-label="حذف حرکت"><Trash2 size={18} /></button>
            </div>
            <div className="re-sets">
              <span className="set-hd">ست</span><span className="set-hd">کیلو</span><span className="set-hd">تکرار</span><span />
              {b.sets.map((s, k) => (
                <div key={k} className="re-row">
                  <span className="num" style={{ textAlign: 'center', fontWeight: 800 }}>{s.type === 'warmup' ? 'W' : s.type === 'normal' ? fa(b.sets.slice(0, k + 1).filter((x) => x.type !== 'warmup').length) : s.type[0].toUpperCase()}</span>
                  <input className="input num" inputMode="decimal" value={faDigits(s.weight_kg ?? '')} aria-label={`وزنه ست ${k + 1}`}
                    onChange={(e) => setBlock(i, { ...b, sets: b.sets.map((y, m) => (m === k ? { ...y, weight_kg: num(e.target.value) } : y)) })} />
                  <input className="input num" inputMode="numeric" value={faDigits(s.reps ?? '')} aria-label={`تکرار ست ${k + 1}`}
                    onChange={(e) => setBlock(i, { ...b, sets: b.sets.map((y, m) => (m === k ? { ...y, reps: num(e.target.value) } : y)) })} />
                  <button className="icon-btn" onClick={() => setBlock(i, { ...b, sets: b.sets.filter((_, m) => m !== k) })} aria-label="حذف ست"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm btn-block" onClick={() => setBlock(i, { ...b, sets: [...b.sets, { ...b.sets[b.sets.length - 1] }] })}>افزودن ست</button>
          </section>
        )
      })}
      <div className="row">
        <button className="btn btn-primary grow" disabled={saving} onClick={onSave}>{saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
        <button className="btn btn-ghost" onClick={() => setDraft(null)}>انصراف</button>
      </div>
      <button className="btn btn-danger btn-block" onClick={onDelete}><Trash2 size={18} /> حذف تمرین</button>
    </div>
  )
}
