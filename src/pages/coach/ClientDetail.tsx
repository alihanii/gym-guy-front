import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ClipboardList, Pencil, Send, Trash2, TriangleAlert } from 'lucide-react'
import { api } from '../../lib/api'
import { useExercises, useTaxonomy } from '../../lib/data'
import { clock, fa, relativeDays } from '../../lib/fa'
import type { Client, WorkoutLog } from '../../lib/types'
import { MuscleBars } from '../../components/MuscleBars'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { statusBadge } from './CoachHome'

interface Monitor {
  linked: boolean
  program: { id: number; title: string } | null
  planned_heatmap?: Record<string, number>
  actual_heatmap?: Record<string, number>
  compliance?: number
  sessions_this_week?: number
  planned_sessions?: number
  workouts: WorkoutLog[]
}

const GOAL: Record<Client['goal'], string> = { hypertrophy: 'عضله‌سازی', fat_loss: 'کاهش وزن', strength: 'قدرت', fitness: 'آمادگی جسمانی' }

export default function ClientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const tax = useTaxonomy()
  const c = useQuery({ queryKey: ['clients', id], queryFn: () => api<Client>(`/coach/clients/${id}/`) })
  const m = useQuery({ queryKey: ['monitor', id], queryFn: () => api<Monitor>(`/coach/clients/${id}/monitor/`) })
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const remove = useMutation({
    mutationFn: () => api(`/coach/clients/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast('شاگرد حذف شد')
      nav('/coach', { replace: true })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const client = c.data
  if (!client) return <div className="page"><div className="skeleton" style={{ height: 220 }} /></div>
  const p = client.active_program

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => nav('/coach')} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: '1.4rem' }}>{client.name}</h1>
          <div className="small muted num">
            {[client.age && `${fa(client.age)} ساله`, client.height_cm && `${fa(client.height_cm)} سانت`, client.weight_kg && `${fa(+client.weight_kg)} کیلو`, GOAL[client.goal], `${fa(client.days_per_week)} روز در هفته`].filter(Boolean).join('، ')}
          </div>
        </div>
        <Link to={`/coach/clients/${id}/edit`} className="icon-btn" aria-label="ویرایش پرونده"><Pencil size={20} /></Link>
      </div>

      {client.injury_tags.length > 0 && (
        <div className="row small" style={{ color: '#fcd34d', flexWrap: 'wrap' }}>
          <TriangleAlert size={16} /> {client.injury_tags.map(tax.injury).join('، ')}
        </div>
      )}

      <section className="panel panel-pad stack">
        <div className="row">
          <ClipboardList size={20} color="var(--primary)" />
          <div className="grow" style={{ fontWeight: 800 }}>{p?.title ?? 'برنامه تمرینی'}</div>
          {statusBadge(client)}
        </div>
        {p ? (
          <Link to={`/coach/programs/${p.id}`} className="btn btn-primary btn-block">ویرایش برنامه و کد دعوت</Link>
        ) : (
          <Link to={`/coach/programs/new?client=${client.id}`} className="btn btn-primary btn-block">نوشتن برنامه</Link>
        )}
      </section>

      {m.data?.linked && m.data.program && (
        <>
          <section className="grid-2">
            <div className="panel panel-pad">
              <div className="small muted">پایبندی این هفته</div>
              <b className="num" style={{ fontSize: '1.6rem', color: (m.data.compliance ?? 0) >= 80 ? '#6ee7b7' : (m.data.compliance ?? 0) >= 50 ? '#fcd34d' : '#ff8a8a' }}>
                {fa(m.data.compliance ?? 0)}٪
              </b>
            </div>
            <div className="panel panel-pad">
              <div className="small muted">جلسه‌ها</div>
              <b className="num" style={{ fontSize: '1.6rem' }}>{fa(m.data.sessions_this_week ?? 0)}<span className="muted" style={{ fontSize: '1rem' }}> از {fa(m.data.planned_sessions ?? 0)}</span></b>
            </div>
          </section>
          <section className="panel panel-pad">
            <div className="section-title">برنامه در برابر اجرا (۷ روز اخیر)</div>
            <MuscleBars planned={m.data.planned_heatmap ?? {}} actual={m.data.actual_heatmap ?? {}} compact />
          </section>
          <section>
            <div className="section-title">آخرین تمرین‌ها</div>
            {m.data.workouts.length === 0 ? (
              <p className="small muted">شاگرد هنوز تمرینی از این برنامه ثبت نکرده است.</p>
            ) : (
              <div className="stack">{m.data.workouts.map((w) => <LogCard key={w.id} w={w} clientId={client.id} />)}</div>
            )}
          </section>
        </>
      )}
      {m.data && !m.data.linked && p?.invite_code && (
        <p className="small muted">بعد از اینکه شاگرد کد را وارد کند، تمرین‌هایش و مقایسه با برنامه اینجا نمایش داده می‌شود.</p>
      )}

      <button
        className="btn btn-danger btn-block"
        disabled={remove.isPending}
        onClick={async () => {
          if (await confirm({
            title: `حذف ${client.name}؟`,
            body: 'برنامه‌های این شاگرد از روتین‌هایش برداشته می‌شود. تمرین‌هایی که ثبت کرده برای خودش می‌ماند.',
            confirm: 'حذف شاگرد',
            danger: true,
          })) remove.mutate()
        }}
      >
        <Trash2 size={18} /> حذف شاگرد
      </button>
    </div>
  )
}

function LogCard({ w, clientId }: { w: WorkoutLog; clientId: number }) {
  const { bySlug } = useExercises()
  const qc = useQueryClient()
  const toast = useToast()
  const [text, setText] = useState(w.coach_feedback)
  const send = useMutation({
    mutationFn: () => api(`/coach/clients/${clientId}/workouts/${w.id}/feedback/`, { method: 'POST', json: { text } }),
    onSuccess: () => {
      toast('بازخورد برای شاگرد ثبت شد.')
      qc.invalidateQueries({ queryKey: ['monitor'] })
    },
  })
  return (
    <div className="panel panel-pad stack" style={{ gap: 8 }}>
      <div className="row">
        <div className="grow" style={{ fontWeight: 700 }}>{w.title}</div>
        <span className="small muted">{relativeDays(w.completed_at)}</span>
      </div>
      <div className="row small muted num" style={{ gap: 14 }}>
        <span>{clock(w.duration_seconds)}</span><span>{fa(Math.round(w.total_volume_kg))} کیلو</span><span>{fa(w.total_sets)} ست</span>
      </div>
      <div className="small faint">
        {w.exercises.map((e) => `${bySlug.get(e.exercise_id)?.title_fa}: ${e.sets.map((s) => (s.weight_kg !== null ? `${fa(s.weight_kg)}×${fa(s.reps ?? 0)}` : fa(s.reps ?? 0))).join('، ')}`).join(' | ')}
      </div>
      <div className="row">
        <input className="input" placeholder="بازخورد برای جلسه بعد…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="icon-btn" style={{ background: 'var(--primary)', color: '#fff', flex: 'none' }} disabled={send.isPending} onClick={() => send.mutate()} aria-label="ارسال بازخورد">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
