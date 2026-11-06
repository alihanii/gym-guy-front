import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Plus, Ruler, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { fa, toLatinDigits } from '../lib/fa'
import { LineChart } from '../components/LineChart'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'

interface Measurement {
  id: number
  date: string
  weight_kg: number | null
  body_fat: number | null
  waist_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  hip_cm: number | null
  notes: string
}
type Field = 'weight_kg' | 'body_fat' | 'waist_cm' | 'chest_cm' | 'arm_cm' | 'thigh_cm' | 'hip_cm'
const FIELDS: { key: Field; label: string; unit: string }[] = [
  { key: 'weight_kg', label: 'وزن', unit: 'کیلو' },
  { key: 'body_fat', label: 'چربی بدن', unit: 'درصد' },
  { key: 'waist_cm', label: 'دور کمر', unit: 'سانت' },
  { key: 'chest_cm', label: 'دور سینه', unit: 'سانت' },
  { key: 'arm_cm', label: 'دور بازو', unit: 'سانت' },
  { key: 'thigh_cm', label: 'دور ران', unit: 'سانت' },
  { key: 'hip_cm', label: 'دور باسن', unit: 'سانت' },
]
const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })
const faDigits = (v: string) => v.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace('.', '٫')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MeasurementsPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['measurements'], queryFn: () => api<Measurement[]>('/measurements/') })
  const [field, setField] = useState<Field>('weight_kg')
  const [form, setForm] = useState<Record<string, string> | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { date: todayIso() }
      for (const f of FIELDS) {
        const v = toLatinDigits(form?.[f.key] ?? '').replace('٫', '.').trim()
        body[f.key] = v === '' ? null : +v
      }
      return api<Measurement>('/measurements/', { method: 'POST', json: body })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['measurements'] }); setForm(null); toast('اندازه‌ها ثبت شد') },
    onError: (e: Error) => toast(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/measurements/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements'] }),
  })

  const list = q.data ?? []
  const f = FIELDS.find((x) => x.key === field)!
  const points = [...list].reverse().filter((x) => x[field] !== null).map((x) => ({ t: new Date(x.date).getTime(), y: x[field] as number }))
  const latest = points.at(-1)?.y
  const first = points[0]?.y
  const tracked = FIELDS.filter((x) => list.some((m) => m[x.key] !== null))

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <h1 className="page-title grow">اندازه‌های بدن</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({})}><Plus size={16} /> ثبت جدید</button>
      </div>

      {q.isLoading && <div className="skeleton" style={{ height: 240 }} />}
      {q.data && list.length === 0 && (
        <div className="panel empty">
          <Ruler size={30} />
          <p>وزن و دور کمر را هر هفته ثبت کنید تا روند تغییرات بدن کنار رکوردهای تمرینی دیده شود.</p>
          <button className="btn btn-primary" onClick={() => setForm({})}>اولین ثبت</button>
        </div>
      )}

      {list.length > 0 && (
        <section className="panel panel-pad stack">
          <div className="chips">
            {(tracked.length ? tracked : FIELDS.slice(0, 1)).map((x) => (
              <button key={x.key} className="chip" aria-pressed={field === x.key} onClick={() => setField(x.key)}>{x.label}</button>
            ))}
          </div>
          {latest !== undefined ? (
            <>
              <div className="row" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b className="num" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{fa(latest)}</b>
                <span className="muted small">{f.unit}</span>
                {first !== undefined && points.length > 1 && (
                  <span className="badge num" style={{ marginInlineStart: 'auto' }}>
                    {latest - first > 0 ? '+' : latest - first < 0 ? '−' : ''}{fa(Math.abs(Math.round((latest - first) * 10) / 10))} از اولین ثبت
                  </span>
                )}
              </div>
              <LineChart points={points} label={`روند ${f.label}`} format={(y) => fa(Math.round(y * 10) / 10)} formatX={(t) => dayMonth.format(new Date(t))} />
            </>
          ) : (
            <p className="muted small">برای {f.label} هنوز عددی ثبت نشده است.</p>
          )}
        </section>
      )}

      {list.length > 0 && (
        <section className="panel list" style={{ overflow: 'hidden' }}>
          {list.map((m) => (
            <div key={m.id} className="list-item" style={{ cursor: 'default' }}>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{longDate.format(new Date(m.date))}</div>
                <div className="small muted num">
                  {FIELDS.filter((x) => m[x.key] !== null).map((x) => `${x.label} ${fa(m[x.key] as number)}`).join('، ')}
                </div>
              </div>
              <button className="icon-btn" onClick={() => confirm('این ثبت حذف شود؟') && remove.mutate(m.id)} aria-label="حذف"><Trash2 size={18} /></button>
            </div>
          ))}
        </section>
      )}

      <Sheet open={!!form} onClose={() => setForm(null)} title="ثبت اندازه‌های امروز">
        {form && (
          <div className="stack">
            <div className="grid-2">
              {FIELDS.map((x) => (
                <label key={x.key} className="field">
                  <span>{x.label} ({x.unit})</span>
                  <input
                    className="input num" inputMode="decimal" placeholder="–"
                    value={faDigits(form[x.key] ?? '')}
                    onChange={(e) => setForm({ ...form, [x.key]: toLatinDigits(e.target.value).replace('٫', '.').replace(/[^\d.]/g, '') })}
                  />
                </label>
              ))}
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'در حال ثبت…' : 'ثبت'}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
