import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useTaxonomy } from '../../lib/data'
import { fa, toLatinDigits } from '../../lib/fa'
import type { Client } from '../../lib/types'

const GOALS = [
  ['hypertrophy', 'عضله‌سازی'],
  ['fat_loss', 'کاهش وزن'],
  ['strength', 'قدرت'],
  ['fitness', 'آمادگی جسمانی'],
] as const

type Form = {
  name: string; age: string; height_cm: string; weight_kg: string; experience_months: string
  goal: Client['goal']; days_per_week: number; injury_tags: string[]; notes: string
}
const EMPTY: Form = { name: '', age: '', height_cm: '', weight_kg: '', experience_months: '', goal: 'hypertrophy', days_per_week: 3, injury_tags: [], notes: '' }

export default function ClientForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const tax = useTaxonomy()
  const [f, setF] = useState<Form>(EMPTY)
  const existing = useQuery({ queryKey: ['clients', id], queryFn: () => api<Client>(`/coach/clients/${id}/`), enabled: !!id })

  useEffect(() => {
    const c = existing.data
    if (c) setF({
      name: c.name, age: String(c.age ?? ''), height_cm: String(c.height_cm ?? ''), weight_kg: String(c.weight_kg ?? ''),
      experience_months: String(c.experience_months ?? ''), goal: c.goal, days_per_week: c.days_per_week,
      injury_tags: c.injury_tags, notes: c.notes,
    })
  }, [existing.data])

  const save = useMutation({
    mutationFn: () => {
      const n = (s: string) => (s.trim() ? Number(toLatinDigits(s)) : null)
      const body = { ...f, age: n(f.age), height_cm: n(f.height_cm), weight_kg: n(f.weight_kg), experience_months: n(f.experience_months) }
      return id
        ? api<Client>(`/coach/clients/${id}/`, { method: 'PATCH', json: body })
        : api<Client>('/coach/clients/', { method: 'POST', json: body })
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      nav(`/coach/clients/${c.id}`, { replace: true })
    },
  })

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form className="page" onSubmit={submit}>
      <div className="page-head">
        <button type="button" className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <h1 className="page-title grow">{id ? 'ویرایش پرونده' : 'شاگرد جدید'}</h1>
      </div>

      <label className="field"><span>نام شاگرد</span><input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
      <div className="grid-2">
        <label className="field"><span>سن</span><input className="input num" inputMode="numeric" value={f.age} onChange={(e) => set('age', e.target.value)} /></label>
        <label className="field"><span>سابقه تمرین (ماه)</span><input className="input num" inputMode="numeric" value={f.experience_months} onChange={(e) => set('experience_months', e.target.value)} /></label>
        <label className="field"><span>قد (سانتی‌متر)</span><input className="input num" inputMode="numeric" value={f.height_cm} onChange={(e) => set('height_cm', e.target.value)} /></label>
        <label className="field"><span>وزن (کیلو)</span><input className="input num" inputMode="decimal" value={f.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} /></label>
      </div>

      <div className="field">
        <span>هدف</span>
        <div className="chips">
          {GOALS.map(([v, l]) => <button type="button" key={v} className="chip" aria-pressed={f.goal === v} onClick={() => set('goal', v)}>{l}</button>)}
        </div>
      </div>

      <div className="field">
        <span>روز تمرین در هفته</span>
        <div className="segmented">
          {[2, 3, 4, 5, 6].map((d) => <button type="button" key={d} aria-pressed={f.days_per_week === d} onClick={() => set('days_per_week', d)}>{fa(d)}</button>)}
        </div>
      </div>

      <div className="field">
        <span>آسیب‌ها و محدودیت‌ها</span>
        <div className="chips">
          {tax.data?.injury_tags.map((t) => {
            const on = f.injury_tags.includes(t.value)
            return (
              <button type="button" key={t.value} className="chip warn" aria-pressed={on}
                onClick={() => set('injury_tags', on ? f.injury_tags.filter((x) => x !== t.value) : [...f.injury_tags, t.value])}>
                {t.label}
              </button>
            )
          })}
        </div>
        <p className="small muted">هنگام طراحی برنامه، حرکت‌های پرخطر برای این آسیب‌ها علامت می‌خورند.</p>
      </div>

      <label className="field"><span>یادداشت</span><textarea className="textarea" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      {save.isError && <p className="form-error">{(save.error as Error).message}</p>}
      <button className="btn btn-primary btn-lg btn-block" disabled={save.isPending}>{save.isPending ? 'در حال ذخیره…' : 'ذخیره پرونده'}</button>
    </form>
  )
}
