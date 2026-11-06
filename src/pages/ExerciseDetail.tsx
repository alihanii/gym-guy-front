import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, TriangleAlert, Trophy, LineChart as ChartIcon } from 'lucide-react'
import { api } from '../lib/api'
import { useExercises, useTaxonomy } from '../lib/data'
import { fa, shortDate } from '../lib/fa'
import { LineChart } from '../components/LineChart'
import { Thumb } from './Exercises'

interface Session {
  workout_id: number
  title: string
  date: string
  sets: { type: string; weight_kg: number | null; reps: number | null; duration_s: number | null; distance_m: number | null; rpe: number | null }[]
  best_set: { weight_kg: number | null; reps: number | null } | null
  est_1rm: number
  max_weight: number
  max_reps: number
  volume: number
}
interface History {
  sessions: Session[]
  records: { kind: 'est_1rm' | 'max_weight' | 'max_volume' | 'max_reps'; value: number; achieved_at: string; workout: number | null }[]
}

type Metric = 'est_1rm' | 'max_weight' | 'volume' | 'max_reps'
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'est_1rm', label: 'یک‌تکرار بیشینه', unit: 'کیلو' },
  { key: 'max_weight', label: 'سنگین‌ترین وزنه', unit: 'کیلو' },
  { key: 'volume', label: 'حجم جلسه', unit: 'کیلو' },
  { key: 'max_reps', label: 'بیشترین تکرار', unit: 'تکرار' },
]
const RECORD_LABEL = { est_1rm: 'یک‌تکرار بیشینه (تخمینی)', max_weight: 'سنگین‌ترین وزنه', max_volume: 'بیشترین حجم یک ست', max_reps: 'بیشترین تکرار' }
const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' })
const SET_LETTER: Record<string, string> = { warmup: 'W', dropset: 'D', failure: 'F' }

export default function ExerciseDetail() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const { bySlug, isLoading } = useExercises()
  const tax = useTaxonomy()
  const ex = bySlug.get(slug)
  const [tab, setTab] = useState<'summary' | 'history' | 'howto'>('summary')
  const weighted = ex ? ['weight_reps', 'bodyweight_reps', 'assisted_bodyweight'].includes(ex.tracking_type) : true
  const [metric, setMetric] = useState<Metric>(weighted ? 'est_1rm' : 'max_reps')
  const hist = useQuery({ queryKey: ['exercise-history', slug], queryFn: () => api<History>(`/workouts/exercise/?id=${slug}`) })

  if (isLoading) return <div className="page"><div className="skeleton" style={{ height: 240 }} /></div>
  if (!ex) return <div className="page"><p className="muted">این حرکت پیدا نشد.</p><Link to="/exercises" className="btn btn-ghost">بانک حرکات</Link></div>

  const sessions = hist.data?.sessions ?? []
  const metrics = weighted ? METRICS : METRICS.filter((m) => m.key === 'max_reps')
  const m = metrics.find((x) => x.key === metric) ?? metrics[0]
  const points = [...sessions].reverse().map((s) => ({ t: new Date(s.date).getTime(), y: s[m.key] })).filter((p) => p.y > 0)

  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <Thumb e={ex} />
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: '1.35rem' }}>{ex.title_fa}</h1>
          <div className="small faint ellipsis" dir="ltr" style={{ textAlign: 'right' }}>{ex.title_en}</div>
        </div>
      </div>

      <div className="segmented" role="tablist">
        <button role="tab" aria-pressed={tab === 'summary'} onClick={() => setTab('summary')}>خلاصه</button>
        <button role="tab" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>تاریخچه</button>
        <button role="tab" aria-pressed={tab === 'howto'} onClick={() => setTab('howto')}>طرز اجرا</button>
      </div>

      {tab === 'summary' && (
        <>
          {ex.thumbnail_url && (
            <div className="ex-images">
              <img src={ex.thumbnail_url} alt="شروع حرکت" onError={(ev) => { ev.currentTarget.style.display = 'none' }} />
              {ex.image_end_url && <img src={ex.image_end_url} alt="پایان حرکت" onError={(ev) => { ev.currentTarget.style.display = 'none' }} />}
            </div>
          )}
          <section className="panel panel-pad stack">
            <div className="chips">
              {metrics.map((x) => (
                <button key={x.key} className="chip" aria-pressed={m.key === x.key} onClick={() => setMetric(x.key)}>{x.label}</button>
              ))}
            </div>
            {hist.isLoading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : points.length === 0 ? (
              <div className="empty"><ChartIcon size={28} /><p>بعد از اولین جلسه با این حرکت، روند پیشرفت اینجا رسم می‌شود.</p></div>
            ) : (
              <>
                <div className="row" style={{ alignItems: 'baseline' }}>
                  <b className="num" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{fa(points[points.length - 1].y)}</b>
                  <span className="muted small">{m.unit}، آخرین جلسه</span>
                </div>
                <LineChart
                  points={points}
                  label={`روند ${m.label}`}
                  format={(y) => fa(Math.round(y))}
                  formatX={(t) => dayMonth.format(new Date(t))}
                />
              </>
            )}
          </section>

          {!!hist.data?.records.length && (
            <section className="panel">
              <h2 className="section-title panel-pad" style={{ margin: 0, paddingBottom: 4 }}><span className="row" style={{ gap: 8 }}><Trophy size={18} color="var(--gold)" /> رکوردهای شخصی</span></h2>
              <div className="list">
                {hist.data.records.map((r) => (
                  <div key={r.kind} className="list-item" style={{ cursor: 'default', minHeight: 56 }}>
                    <span className="grow">{RECORD_LABEL[r.kind]}</span>
                    <span className="small faint">{dayMonth.format(new Date(r.achieved_at))}</span>
                    <b className="num" style={{ color: 'var(--gold)', minWidth: 56, textAlign: 'left' }}>{fa(r.value)}</b>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="stack">
          {sessions.length === 0 && <div className="panel empty"><p>هنوز این حرکت را در هیچ تمرینی ثبت نکرده‌اید.</p></div>}
          {sessions.map((s) => (
            <Link key={s.workout_id} to={`/history/${s.workout_id}`} className="panel panel-pad stack" style={{ gap: 8 }}>
              <div className="row">
                <b className="grow">{s.title}</b>
                <span className="small muted">{shortDate(s.date)}</span>
              </div>
              <ol className="set-lines">
                {s.sets.map((x, i) => (
                  <li key={i} className="num">
                    <span className={`set-tag ${x.type}`}>{SET_LETTER[x.type] ?? fa(s.sets.slice(0, i + 1).filter((y) => y.type !== 'warmup').length)}</span>
                    {x.weight_kg !== null && `${fa(x.weight_kg)} کیلو`}
                    {x.weight_kg !== null && x.reps !== null && ' × '}
                    {x.reps !== null && `${fa(x.reps)} تکرار`}
                    {x.rpe !== null && <span className="faint"> ، RPE {fa(x.rpe)}</span>}
                  </li>
                ))}
              </ol>
            </Link>
          ))}
        </div>
      )}

      {tab === 'howto' && (
        <div className="stack">
          <div className="grid-2">
            <div className="panel panel-pad"><div className="small muted">عضله اصلی</div><b>{tax.label(ex.primary_muscle)}</b></div>
            <div className="panel panel-pad"><div className="small muted">وسیله</div><b>{tax.label(ex.equipment)}</b></div>
          </div>
          {ex.secondary_muscles.length > 0 && (
            <div><div className="section-title">عضلات کمکی</div><div className="chips">{ex.secondary_muscles.map((x) => <span key={x} className="badge">{tax.label(x)}</span>)}</div></div>
          )}
          {ex.persian_aliases.length > 0 && (
            <div><div className="section-title">اسم‌های رایج در باشگاه</div><div className="chips">{ex.persian_aliases.map((a) => <span key={a} className="badge blue">{a}</span>)}</div></div>
          )}
          {ex.injury_warnings.length > 0 && (
            <div className="warn-line small"><TriangleAlert size={18} /> با احتیاط برای: {ex.injury_warnings.map(tax.injury).join('، ')}</div>
          )}
          {ex.instructions.length > 0 ? (
            <ol dir="ltr" className="howto">{ex.instructions.map((t, i) => <li key={i}>{t}</li>)}</ol>
          ) : (
            <p className="muted small">توضیح اجرا برای این حرکت هنوز ثبت نشده است.</p>
          )}
          {ex.source === 'free-exercise-db' && <p className="small faint">تصاویر و توضیحات: free-exercise-db (Public Domain)</p>}
        </div>
      )}
    </div>
  )
}
