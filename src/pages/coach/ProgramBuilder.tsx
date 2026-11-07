import { useConfirm } from '../../components/Confirm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  ArrowDown, ArrowUp, ChevronRight, Copy, Link2, Minus, Plus, Share2, Trash2, TriangleAlert, Unlink, RefreshCw,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useExercises, useTaxonomy } from '../../lib/data'
import { clock, fa, toLatinDigits } from '../../lib/fa'
import { heatmapOf } from '../../lib/muscles'
import type { Client, Program, ProgramDay, TemplateBlock } from '../../lib/types'
import { SUPERSET_LETTERS } from '../../lib/workout'
import { ExercisePicker } from '../../components/ExercisePicker'
import { MuscleBars } from '../../components/MuscleBars'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'

const REST = [30, 45, 60, 90, 120, 150, 180, 240]
const SPLIT_PRESETS: Record<number, string[]> = {
  2: ['روز اول - بالاتنه', 'روز دوم - پایین‌تنه'],
  3: ['روز اول - Push (سینه، سرشانه، پشت بازو)', 'روز دوم - Pull (پشت، جلوبازو)', 'روز سوم - پا'],
  4: ['روز اول - بالاتنه', 'روز دوم - پایین‌تنه', 'روز سوم - بالاتنه', 'روز چهارم - پایین‌تنه'],
}

function newBlock(slug: string): TemplateBlock {
  return {
    exercise_id: slug, superset_group: null, rest_seconds: 90, tempo: '', target_rpe: null, notes: '',
    sets: Array.from({ length: 3 }, () => ({ type: 'normal' as const, reps: '8-12' })),
  }
}

function shape(b: TemplateBlock) {
  const warm = b.sets.filter((s) => s.type === 'warmup').length
  const work = b.sets.filter((s) => s.type !== 'warmup')
  return { warm, work: work.length, reps: work[0]?.reps ?? '' }
}

function withShape(b: TemplateBlock, patch: Partial<ReturnType<typeof shape>>): TemplateBlock {
  const cur = { ...shape(b), ...patch }
  return {
    ...b,
    sets: [
      ...Array.from({ length: cur.warm }, () => ({ type: 'warmup' as const, reps: '' })),
      ...Array.from({ length: cur.work }, () => ({ type: 'normal' as const, reps: cur.reps })),
    ],
  }
}

export default function ProgramBuilder() {
  const confirm = useConfirm()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const tax = useTaxonomy()
  const { bySlug } = useExercises()

  const clients = useQuery({ queryKey: ['clients'], queryFn: () => api<Client[]>('/coach/clients/') })
  const existing = useQuery({ queryKey: ['programs', id], queryFn: () => api<Program>(`/coach/programs/${id}/`), enabled: !!id })

  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState<number | null>(sp.get('client') ? Number(sp.get('client')) : null)
  const [days, setDays] = useState<ProgramDay[]>([])
  const [active, setActive] = useState(0)
  const [picker, setPicker] = useState(false)
  const [invite, setInvite] = useState<Program | null>(null)
  const [dirty, setDirty] = useState(false)

  const client = clients.data?.find((c) => c.id === clientId) ?? null
  const injuries = useMemo(() => client?.injury_tags ?? [], [client])

  useEffect(() => {
    const p = existing.data
    if (!p) return
    setTitle(p.title)
    setClientId(p.client)
    setDays(p.workouts.days.length ? p.workouts.days : [{ title: 'روز اول', exercises: [] }])
  }, [existing.data])

  // New program: pre-fill day titles from the client's weekly frequency.
  useEffect(() => {
    if (id || days.length) return
    const n = client?.days_per_week ?? 3
    const preset = SPLIT_PRESETS[n] ?? Array.from({ length: n }, (_, i) => `روز ${fa(i + 1)}`)
    setDays(preset.map((t) => ({ title: t, exercises: [] })))
  }, [id, client, days.length])
  const titled = useRef(false)
  useEffect(() => {
    if (id || !client || titled.current) return
    titled.current = true
    setTitle((t) => t || `برنامه ${client.name}`)
  }, [id, client])

  const heat = useMemo(() => heatmapOf(days.flatMap((d) => d.exercises), bySlug), [days, bySlug])
  const conflicts = useMemo(
    () =>
      days.flatMap((d, di) =>
        d.exercises
          .map((b, bi) => ({ di, bi, ex: bySlug.get(b.exercise_id) }))
          .filter(({ ex }) => ex?.injury_warnings.some((t) => injuries.includes(t))),
      ),
    [days, bySlug, injuries],
  )

  const editDays = (fn: (d: ProgramDay[]) => ProgramDay[]) => {
    setDays(fn)
    setDirty(true)
  }
  const editBlock = (bi: number, fn: (b: TemplateBlock) => TemplateBlock) =>
    editDays((ds) => ds.map((d, i) => (i === active ? { ...d, exercises: d.exercises.map((b, j) => (j === bi ? fn(b) : b)) } : d)))
  const editExercises = (fn: (e: TemplateBlock[]) => TemplateBlock[]) =>
    editDays((ds) => ds.map((d, i) => (i === active ? { ...d, exercises: fn(d.exercises) } : d)))

  const save = useMutation({
    mutationFn: async () => {
      const body = { title: title.trim() || 'برنامه بدون نام', client: clientId, workouts: { days } }
      return id
        ? api<Program>(`/coach/programs/${id}/`, { method: 'PATCH', json: body })
        : api<Program>('/coach/programs/', { method: 'POST', json: body })
    },
    onSuccess: (p) => {
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.setQueryData(['programs', String(p.id)], p)
      if (!id) nav(`/coach/programs/${p.id}`, { replace: true })
    },
    onError: (e: Error) => toast(e.message),
  })

  const publish = useMutation({
    mutationFn: async () => {
      const saved = await save.mutateAsync()
      return api<Program>(`/coach/programs/${saved.id}/publish/`, { method: 'POST' })
    },
    onSuccess: (p) => {
      qc.setQueryData(['programs', String(p.id)], p)
      qc.invalidateQueries({ queryKey: ['clients'] })
      setInvite(p)
    },
    onError: (e: Error) => toast(e.message),
  })

  const day = days[active]
  const program = existing.data
  const letters = new Map<number, string>()
  day?.exercises.forEach((b) => b.superset_group !== null && !letters.has(b.superset_group) && letters.set(b.superset_group, SUPERSET_LETTERS[letters.size]))

  return (
    <div className="page builder">
      <div className="page-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <input className="title-input grow" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true) }} placeholder="نام برنامه، مثلاً «هایپرتروفی ۸ هفته»" aria-label="نام برنامه" />
        {program?.status === 'active' && <span className="badge green">فعال، {program.athlete_name}</span>}
      </div>

      <div className="builder-grid">
        <div className="stack" style={{ gap: 16 }}>
          <label className="field">
            <span>شاگرد</span>
            <select className="select" value={clientId ?? ''} onChange={(e) => { setClientId(e.target.value ? Number(e.target.value) : null); setDirty(true) }}>
              <option value="">بدون شاگرد مشخص (برنامه عمومی)</option>
              {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {injuries.length > 0 && (
            <p className="small row" style={{ color: '#fcd34d' }}><TriangleAlert size={16} /> آسیب‌ها: {injuries.map(tax.injury).join('، ')}</p>
          )}

          <div className="chip-scroll" role="tablist" aria-label="روزهای تمرین">
            {days.map((d, i) => (
              <button key={i} role="tab" className="chip" aria-pressed={i === active} aria-selected={i === active} onClick={() => setActive(i)}>
                {fa(i + 1)}. {d.title.split(' - ')[1] ?? d.title}
                <span className="faint num">({fa(d.exercises.length)})</span>
              </button>
            ))}
            <button className="chip" onClick={() => { editDays((ds) => [...ds, { title: `روز ${fa(ds.length + 1)}`, exercises: [] }]); setActive(days.length) }}>
              <Plus size={16} /> روز
            </button>
          </div>

          {day && (
            <div className="row">
              <input className="input grow" value={day.title} aria-label="نام روز"
                onChange={(e) => editDays((ds) => ds.map((d, i) => (i === active ? { ...d, title: e.target.value } : d)))} />
              {days.length > 1 && (
                <button className="icon-btn" aria-label="حذف این روز"
                  onClick={async () => { if (await confirm({ title: `حذف «${day.title}»؟`, confirm: 'حذف روز', danger: true })) { editDays((ds) => ds.filter((_, i) => i !== active)); setActive(Math.max(0, active - 1)) } }}>
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}

          {day?.exercises.map((b, bi) => {
            const ex = bySlug.get(b.exercise_id)
            const s = shape(b)
            const risky = ex?.injury_warnings.filter((t) => injuries.includes(t)) ?? []
            const letter = b.superset_group !== null ? letters.get(b.superset_group) : null
            const linkedNext = b.superset_group !== null && day.exercises[bi + 1]?.superset_group === b.superset_group
            return (
              <section key={bi} className={`panel pb-block${linkedNext ? ' ss-next' : ''}`}>
                <div className="row">
                  {letter && <span className="ss-tag">{letter}</span>}
                  <div className="grow">
                    <h3 className="ellipsis" style={{ fontWeight: 800 }}>{ex?.title_fa}</h3>
                    <div className="small faint">{ex && tax.label(ex.primary_muscle)}{ex?.secondary_muscles.length ? ` + ${ex.secondary_muscles.map(tax.label).join('، ')}` : ''}</div>
                  </div>
                  <button className="icon-btn" aria-label="بالا" disabled={bi === 0} onClick={() => editExercises((e) => { const c = [...e]; [c[bi - 1], c[bi]] = [c[bi], c[bi - 1]]; return c })}><ArrowUp size={18} /></button>
                  <button className="icon-btn" aria-label="پایین" disabled={bi === day.exercises.length - 1} onClick={() => editExercises((e) => { const c = [...e]; [c[bi + 1], c[bi]] = [c[bi], c[bi + 1]]; return c })}><ArrowDown size={18} /></button>
                  <button className="icon-btn" aria-label="حذف" onClick={() => editExercises((e) => e.filter((_, j) => j !== bi))}><Trash2 size={18} /></button>
                </div>
                {risky.length > 0 && (
                  <p className="warn-line small"><TriangleAlert size={16} /> این حرکت برای «{risky.map(tax.injury).join('، ')}» شاگرد پرخطر است. جایگزین امن‌تری در نظر بگیرید.</p>
                )}
                <div className="pb-fields">
                  <Stepper label="ست کاری" value={s.work} min={1} max={10} onChange={(v) => editBlock(bi, (x) => withShape(x, { work: v }))} />
                  <Stepper label="گرم‌کردنی" value={s.warm} min={0} max={4} onChange={(v) => editBlock(bi, (x) => withShape(x, { warm: v }))} />
                  <label className="field"><span>تکرار</span>
                    <input className="input num" dir="ltr" value={s.reps} placeholder="8-12" onChange={(e) => editBlock(bi, (x) => withShape(x, { reps: toLatinDigits(e.target.value) }))} />
                  </label>
                  <label className="field"><span>استراحت</span>
                    <select className="select num" value={b.rest_seconds} onChange={(e) => editBlock(bi, (x) => ({ ...x, rest_seconds: Number(e.target.value) }))}>
                      {REST.map((r) => <option key={r} value={r}>{clock(r)}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>تمپو</span>
                    <input className="input num" dir="ltr" value={b.tempo} placeholder="3-1-1-0" onChange={(e) => editBlock(bi, (x) => ({ ...x, tempo: toLatinDigits(e.target.value) }))} />
                  </label>
                  <label className="field"><span>RPE هدف</span>
                    <input className="input num" dir="ltr" inputMode="decimal" value={b.target_rpe ?? ''} placeholder="8"
                      onChange={(e) => { const v = parseFloat(toLatinDigits(e.target.value)); editBlock(bi, (x) => ({ ...x, target_rpe: Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : null })) }} />
                  </label>
                </div>
                <input className="input" value={b.notes} placeholder="یادداشت مربی برای این حرکت…" onChange={(e) => editBlock(bi, (x) => ({ ...x, notes: e.target.value }))} />
                {(b.superset_group !== null || bi < day.exercises.length - 1) && (
                  <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', minHeight: 40 }}
                    onClick={() => editExercises((list) => {
                      const c = [...list]
                      if (c[bi].superset_group !== null) {
                        const g = c[bi].superset_group
                        const n = c.filter((x) => x.superset_group === g).length
                        return c.map((x, j) => (j === bi || (n <= 2 && x.superset_group === g) ? { ...x, superset_group: null } : x))
                      }
                      const g = c[bi + 1].superset_group ?? Math.max(0, ...days.flatMap((d) => d.exercises.map((x) => x.superset_group ?? 0))) + 1
                      c[bi] = { ...c[bi], superset_group: g }
                      c[bi + 1] = { ...c[bi + 1], superset_group: g }
                      return c
                    })}>
                    {b.superset_group !== null ? <><Unlink size={16} /> جدا از سوپرست</> : <><Link2 size={16} /> سوپرست با حرکت بعدی</>}
                  </button>
                )}
              </section>
            )
          })}

          {day && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setPicker(true)}>
              <Plus size={20} /> افزودن حرکت به {day.title.split(' - ')[0]}
            </button>
          )}
        </div>

        <aside className="builder-side stack">
          <section className="panel panel-pad">
            <div className="section-title">تعادل عضلانی هفته <span className="small faint">ست کاری</span></div>
            <MuscleBars planned={heat} />
          </section>
          {conflicts.length > 0 && (
            <section className="panel panel-pad">
              <div className="section-title" style={{ color: '#fcd34d' }}><span className="row" style={{ gap: 6 }}><TriangleAlert size={18} /> هشدار آسیب ({fa(conflicts.length)})</span></div>
              <ul className="small muted" style={{ margin: 0, paddingInlineStart: 18 }}>
                {conflicts.map((c, i) => <li key={i}>{days[c.di].title.split(' - ')[0]}: {c.ex?.title_fa}</li>)}
              </ul>
            </section>
          )}
          <div className="stack builder-actions">
            <button className="btn btn-ghost btn-block" disabled={save.isPending || (!dirty && !!id)} onClick={() => save.mutate(undefined, { onSuccess: () => toast('ذخیره شد') })}>
              {save.isPending ? 'در حال ذخیره…' : dirty || !id ? 'ذخیره پیش‌نویس' : 'ذخیره شده'}
            </button>
            <button className="btn btn-primary btn-lg btn-block" disabled={publish.isPending || !days.some((d) => d.exercises.length)} onClick={() => publish.mutate()}>
              <Share2 size={18} />
              {program?.status === 'active' ? 'ذخیره و ارسال تغییرات به شاگرد' : program?.invite_code ? 'ذخیره و نمایش کد دعوت' : 'انتشار و ساخت کد دعوت'}
            </button>
            {program?.status === 'active' && <p className="small muted">تغییرات ذخیره‌شده همان لحظه در روتین‌های شاگرد اعمال می‌شود.</p>}
          </div>
        </aside>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} injuryTags={injuries}
        onPick={(slugs) => editExercises((e) => [...e, ...slugs.map(newBlock)])} />
      <InviteSheet program={invite} onClose={() => setInvite(null)} onChange={setInvite} />
    </div>
  )
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`افزایش ${label}`}><Plus size={16} /></button>
        <b className="num">{fa(value)}</b>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`کاهش ${label}`}><Minus size={16} /></button>
      </div>
    </div>
  )
}

function InviteSheet({ program, onClose, onChange }: { program: Program | null; onClose: () => void; onChange: (p: Program) => void }) {
  const confirm = useConfirm()
  const [qr, setQr] = useState<string | null>(null)
  const toast = useToast()
  const link = program?.invite_link ? program.invite_link.replace(/^https?:\/\/[^/]+/, window.location.origin) : ''
  useEffect(() => {
    if (!link) return
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#090A0F', light: '#FFFFFF' } }).then(setQr)
  }, [link])
  if (!program?.invite_code) return null
  const code = program.invite_code
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(msg)
    } catch {
      toast('کپی نشد؛ دستی انتخاب کنید.')
    }
  }
  const share = () =>
    navigator.share
      ? navigator.share({ title: program.title, text: `کد برنامه تمرینی شما: ${code}`, url: link }).catch(() => {})
      : copy(link, 'لینک کپی شد')
  const rotate = async () => {
    if (!(await confirm({ title: 'کد تازه بسازیم؟', body: 'کد فعلی دیگر کار نمی‌کند.', confirm: 'ساخت کد تازه' }))) return
    onChange(await api<Program>(`/coach/programs/${program.id}/new-code/`, { method: 'POST' }))
  }
  return (
    <Sheet open onClose={onClose} title="کد دعوت آماده است">
      <div className="stack" style={{ gap: 18, alignItems: 'center', textAlign: 'center' }}>
        <p className="muted">
          {program.status === 'active' ? `برنامه برای ${program.athlete_name} به‌روز شد.` : 'شاگرد این کد را در اپ وارد کند یا QR را اسکن کند؛ برنامه مستقیم در روتین‌هایش می‌نشیند.'}
        </p>
        <button className="invite-code num" dir="ltr" onClick={() => copy(code, 'کد کپی شد')} aria-label="کپی کد">
          {fa(code.slice(0, 3))}<span /> {fa(code.slice(3))}
        </button>
        {qr && <img src={qr} alt="QR کد دعوت" width={180} height={180} style={{ borderRadius: 6 }} />}
        <div className="row" style={{ width: '100%' }}>
          <button className="btn btn-primary grow" onClick={share}><Share2 size={18} /> ارسال لینک</button>
          <button className="btn btn-ghost" onClick={() => copy(link, 'لینک کپی شد')} aria-label="کپی لینک"><Copy size={18} /></button>
          {program.status !== 'active' && <button className="btn btn-ghost" onClick={rotate} aria-label="ساخت کد تازه"><RefreshCw size={18} /></button>}
        </div>
        <p className="small faint" dir="ltr" style={{ wordBreak: 'break-all' }}>{link}</p>
      </div>
    </Sheet>
  )
}
