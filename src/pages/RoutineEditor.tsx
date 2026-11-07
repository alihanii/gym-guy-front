import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronRight, Plus, Timer, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa, toLatinDigits } from '../lib/fa'
import type { Routine, TemplateBlock } from '../lib/types'
import { ExercisePicker } from '../components/ExercisePicker'
import { useToast } from '../components/Toast'
import { Thumb } from './Exercises'

const faDigits = (v: string | number) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace('.', '٫')
const REST = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300]

function newBlock(slug: string): TemplateBlock {
  return {
    exercise_id: slug, superset_group: null, rest_seconds: 90, tempo: '', target_rpe: null, notes: '',
    sets: Array.from({ length: 3 }, () => ({ type: 'normal' as const, reps: '10', weight_kg: null })),
  }
}

export default function RoutineEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { bySlug } = useExercises()
  const routines = useQuery({ queryKey: ['routines'], queryFn: () => api<Routine[]>('/routines/') })
  const existing = id ? routines.data?.find((r) => String(r.id) === id) : undefined
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('')
  const [blocks, setBlocks] = useState<TemplateBlock[]>([])
  const [picker, setPicker] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true
      setTitle(existing.title)
      setFolder(existing.folder ?? '')
      setBlocks(existing.exercises)
    }
  }, [existing])

  const folders = [...new Set((routines.data ?? []).map((r) => r.folder).filter(Boolean))] as string[]

  const save = useMutation({
    mutationFn: () =>
      api<Routine>(id ? `/routines/${id}/` : '/routines/', {
        method: id ? 'PATCH' : 'POST',
        json: { title: title.trim() || 'روتین بدون نام', folder: folder.trim(), exercises: blocks },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] })
      toast('روتین ذخیره شد')
      nav('/routines')
    },
    onError: (e: Error) => toast(e.message),
  })

  const patch = (i: number, fn: (b: TemplateBlock) => TemplateBlock) => setBlocks((bs) => bs.map((b, j) => (j === i ? fn(b) : b)))
  const move = (i: number, d: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + d
      if (j < 0 || j >= bs.length) return bs
      const c = [...bs]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  if (id && routines.isLoading) return <div className="page"><div className="skeleton" style={{ height: 240 }} /></div>
  if (id && existing?.program) {
    return <div className="page"><p className="muted">این روتین از برنامه مربی است و فقط مربی می‌تواند آن را تغییر دهد. از منوی روتین یک کپی بسازید.</p></div>
  }

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <h1 className="page-title grow" style={{ fontSize: '1.3rem' }}>{id ? 'ویرایش روتین' : 'روتین جدید'}</h1>
        <button className="btn btn-primary" disabled={!blocks.length || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>

      <div className="stack">
        <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم روتین، مثلاً «پا و باسن»" aria-label="اسم روتین" />
        <label className="field">
          <span>پوشه (اختیاری)</span>
          <input className="input" list="folders" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="مثلاً «برنامه حجمی»" />
          <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
        </label>
      </div>

      {blocks.length === 0 && (
        <div className="panel empty">
          <Plus size={28} />
          <p>حرکت‌های این روتین را اضافه کنید. تعداد ست، تکرار و وزنه هدف را برای هر حرکت می‌توانید تعیین کنید.</p>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        {blocks.map((b, i) => {
          const ex = bySlug.get(b.exercise_id)
          return (
            <section key={i} className="panel re-block">
              <div className="row">
                {ex && <Thumb e={ex} />}
                <b className="grow ellipsis" style={{ color: 'var(--title)' }}>{ex?.title_fa ?? b.exercise_id}</b>
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="بالا"><ArrowUp size={18} /></button>
                <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="پایین"><ArrowDown size={18} /></button>
                <button className="icon-btn" onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))} aria-label="حذف حرکت"><Trash2 size={18} /></button>
              </div>
              <input className="wk-note" value={b.notes} onChange={(e) => patch(i, (x) => ({ ...x, notes: e.target.value }))} placeholder="یادداشت این حرکت…" />
              <label className="row small muted" style={{ gap: 6 }}>
                <Timer size={16} /> استراحت
                <select className="select re-rest" value={b.rest_seconds} onChange={(e) => patch(i, (x) => ({ ...x, rest_seconds: +e.target.value }))}>
                  {REST.map((r) => <option key={r} value={r}>{r === 0 ? 'خاموش' : clock(r)}</option>)}
                </select>
              </label>
              <div className="re-sets">
                <span className="set-hd">ست</span><span className="set-hd">کیلو</span><span className="set-hd">تکرار</span><span />
                {b.sets.map((s, k) => (
                  <div key={k} className="re-row">
                    <span className="num" style={{ textAlign: 'center', fontWeight: 800 }}>{fa(k + 1)}</span>
                    <input
                      className="input num" inputMode="decimal" placeholder="–" aria-label={`وزنه ست ${k + 1}`}
                      value={faDigits(s.weight_kg ?? '')}
                      onChange={(e) => {
                        const v = toLatinDigits(e.target.value).replace('٫', '.').replace(/[^\d.]/g, '')
                        patch(i, (x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, weight_kg: v === '' ? null : +v } : y)) }))
                      }}
                    />
                    <input
                      className="input num" inputMode="numeric" placeholder="۸-۱۲" aria-label={`تکرار ست ${k + 1}`}
                      value={faDigits(s.reps)}
                      onChange={(e) => {
                        const v = toLatinDigits(e.target.value).replace(/[^\d-]/g, '')
                        patch(i, (x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, reps: v } : y)) }))
                      }}
                    />
                    <button className="icon-btn" disabled={b.sets.length === 1} onClick={() => patch(i, (x) => ({ ...x, sets: x.sets.filter((_, m) => m !== k) }))} aria-label="حذف ست">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-block btn-sm" onClick={() => patch(i, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}>
                <Plus size={16} /> افزودن ست
              </button>
            </section>
          )
        })}
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={() => setPicker(true)}>
        <Plus size={20} /> افزودن حرکت
      </button>
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(s) => setBlocks((bs) => [...bs, ...s.map(newBlock)])} />
    </div>
  )
}
