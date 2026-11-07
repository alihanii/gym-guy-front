import { useConfirm } from '../components/Confirm'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown, ArrowUp, Check, ChevronRight, Link2, MoreVertical, Plus, Repeat2, Timer, Trash2, Unlink, MessageSquareQuote,
} from 'lucide-react'
import { api } from '../lib/api'
import { useExercises } from '../lib/data'
import { clock, fa } from '../lib/fa'
import { haptic } from '../lib/haptics'
import type { Exercise, PerformedSet, SetType, TrackingType, WorkoutLog } from '../lib/types'
import { SUPERSET_LETTERS, toPayload, useActiveWorkout, workout, type LiveBlock, type LiveSet } from '../lib/workout'
import { ExercisePicker } from '../components/ExercisePicker'
import { FIELD_META, formatField, Numpad, type NumField } from '../components/Numpad'
import { PlateCalculator } from '../components/PlateCalculator'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { Thumb } from './Exercises'

const COLUMNS: Record<TrackingType, NumField[]> = {
  weight_reps: ['weight_kg', 'reps'],
  bodyweight_reps: ['weight_kg', 'reps'],
  assisted_bodyweight: ['weight_kg', 'reps'],
  duration: ['duration_s'],
  duration_weight: ['weight_kg', 'duration_s'],
  distance_duration: ['distance_m', 'duration_s'],
  weight_distance: ['weight_kg', 'distance_m'],
  reps_only: ['reps'],
}

const COLUMN_HEAD: Partial<Record<TrackingType, Partial<Record<NumField, string>>>> = {
  bodyweight_reps: { weight_kg: '+کیلو' },
  assisted_bodyweight: { weight_kg: '−کیلو' },
}

const SET_TYPE_META: Record<SetType, { short: string; label: string; hint: string }> = {
  warmup: { short: 'W', label: 'گرم‌کردنی', hint: 'در حجم و رکوردها حساب نمی‌شود' },
  normal: { short: '', label: 'ست کاری', hint: 'ست استاندارد' },
  dropset: { short: 'D', label: 'دراپ‌ست', hint: 'کاهش وزنه بدون استراحت' },
  failure: { short: 'F', label: 'تا ناتوانی', hint: 'اجرا تا مرز ناتوانی عضلانی' },
}

type Prev = Record<string, Partial<PerformedSet>[]>
type Cursor = { block: string; set: string; field: NumField } | null

export default function WorkoutPage() {
  const confirm = useConfirm()
  const w = useActiveWorkout()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { bySlug } = useExercises()
  const [cursor, setCursor] = useState<Cursor>(null)
  const [picker, setPicker] = useState(false)
  const [replacing, setReplacing] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [typeFor, setTypeFor] = useState<{ block: string; set: string } | null>(null)
  const [plates, setPlates] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const slugs = useMemo(() => [...new Set(w?.blocks.map((b) => b.exercise_id) ?? [])].sort(), [w?.blocks])
  const prev = useQuery({
    queryKey: ['previous', slugs.join(',')],
    queryFn: () => api<Prev>(`/workouts/previous/?exercise_ids=${slugs.join(',')}`),
    enabled: slugs.length > 0,
    staleTime: 60_000,
  })

  const save = useMutation({
    mutationFn: () => api<WorkoutLog>('/workouts/', { method: 'POST', json: toPayload(w!) }),
    onSuccess: (log) => {
      // leave the page first, otherwise the empty-workout redirect wins the race
      nav(`/history/${log.id}?done=1`, { replace: true })
      window.setTimeout(() => workout.discard(), 0)
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['previous'] })
      if (log.records.length) haptic.record()
    },
    onError: (e: Error) => toast(e.message),
  })

  if (!w) return <Navigate to="/" replace />

  const doneSets = w.blocks.reduce((n, b) => n + b.sets.filter((s) => s.done).length, 0)
  const volume = w.blocks.reduce(
    (v, b) => v + b.sets.filter((s) => s.done && s.type !== 'warmup').reduce((x, s) => x + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
    0,
  )

  const prevFor = (b: LiveBlock, i: number) => {
    const list = prev.data?.[b.exercise_id]
    if (!list?.length) return undefined
    const workingIdx = b.sets.slice(0, i).filter((s) => s.type !== 'warmup').length
    const pool = b.sets[i].type === 'warmup' ? list.filter((s) => s.type === 'warmup') : list.filter((s) => s.type !== 'warmup')
    return b.sets[i].type === 'warmup' ? pool[i] : pool[workingIdx] ?? pool[pool.length - 1]
  }

  const fieldsOf = (b: LiveBlock): NumField[] => {
    const ex = bySlug.get(b.exercise_id)
    return [...COLUMNS[ex?.tracking_type ?? 'weight_reps'], 'rpe']
  }

  /** Fill blanks from last session or the plan, mark done, start rest. */
  const complete = (b: LiveBlock, s: LiveSet, i: number) => {
    const p = prevFor(b, i)
    const cols = COLUMNS[bySlug.get(b.exercise_id)?.tracking_type ?? 'weight_reps']
    if (!s.done) {
      for (const f of cols) {
        if (s[f] !== null) continue
        let v: number | null = (p?.[f] as number | null | undefined) ?? null
        if (v === null && f === 'reps' && s.target) v = parseInt(s.target, 10) || null
        if (v !== null) workout.setField(b.key, s.key, f, v)
      }
    }
    const nowDone = workout.toggleDone(b.key, s.key)
    if (!nowDone) return
    haptic.success()
    const group = b.superset_group
    const members = group === null ? [b] : w.blocks.filter((x) => x.superset_group === group)
    const isLastInRound = members[members.length - 1].key === b.key
    if (isLastInRound && s.type !== 'dropset') workout.startRest(b.rest_seconds)
  }

  const activeBlock = cursor && w.blocks.find((b) => b.key === cursor.block)
  const activeIdx = activeBlock ? activeBlock.sets.findIndex((s) => s.key === cursor!.set) : -1
  const activeSet = activeBlock?.sets[activeIdx]
  const activeEx = activeBlock && bySlug.get(activeBlock.exercise_id)

  const next = () => {
    if (!activeBlock || !activeSet || !cursor) return
    const cols = COLUMNS[activeEx?.tracking_type ?? 'weight_reps']
    const at = cols.indexOf(cursor.field)
    if (at >= 0 && at < cols.length - 1) {
      setCursor({ ...cursor, field: cols[at + 1] })
      return
    }
    if (!activeSet.done) complete(activeBlock, activeSet, activeIdx)
    const following = activeBlock.sets.slice(activeIdx + 1).find((s) => !s.done)
    if (following) setCursor({ block: activeBlock.key, set: following.key, field: cols[0] })
    else setCursor(null)
  }

  const groupLetter = (g: number | null) => {
    if (g === null) return null
    const groups = [...new Set(w.blocks.map((b) => b.superset_group).filter((x) => x !== null))]
    return SUPERSET_LETTERS[groups.indexOf(g)] ?? '•'
  }

  return (
    <div className={`workout${cursor ? ' with-pad' : ''}`}>
      <header className="wk-head">
        <button className="icon-btn" onClick={() => nav('/')} aria-label="بازگشت؛ تمرین ادامه دارد">
          <ChevronRight size={26} />
        </button>
        <div className="grow">
          <div className="wk-title ellipsis">{w.title}</div>
          <div className="small muted num">{clock((Date.now() - w.startedAt) / 1000)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setFinishing(true)}>
          پایان
        </button>
      </header>

      <div className="wk-stats">
        <div><span className="muted small">مدت</span><b className="num">{clock((Date.now() - w.startedAt) / 1000)}</b></div>
        <div><span className="muted small">حجم</span><b className="num">{fa(Math.round(volume))} <small>کیلو</small></b></div>
        <div><span className="muted small">ست‌ها</span><b className="num">{fa(doneSets)}</b></div>
      </div>

      <div className="wk-blocks">
        {w.blocks.length === 0 && (
          <div className="empty">
            <Plus size={32} />
            <p>اولین حرکت را اضافه کنید. با هر ست که تیک بزنید تایمر استراحت خودکار شروع می‌شود.</p>
          </div>
        )}
        {w.blocks.map((b, bi) => {
          const ex = bySlug.get(b.exercise_id)
          const cols = COLUMNS[ex?.tracking_type ?? 'weight_reps']
          const letter = groupLetter(b.superset_group)
          const linkedNext = b.superset_group !== null && w.blocks[bi + 1]?.superset_group === b.superset_group
          return (
            <section key={b.key} className={`wk-block${letter ? ' in-ss' : ''}${linkedNext ? ' ss-next' : ''}`}>
              <div className="wk-block-head">
                {letter && <span className="ss-tag" aria-label={`سوپرست ${letter}`}>{letter}</span>}
                {ex && <Thumb e={ex} />}
                <div className="grow">
                  <h3 className="ellipsis">{ex?.title_fa ?? b.exercise_id}</h3>
                  <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="row" style={{ gap: 4 }}><Timer size={14} /> <span className="num">{clock(b.rest_seconds)}</span></span>
                    {b.tempo && <span className="num">تمپو {fa(b.tempo)}</span>}
                    {b.target_rpe && <span className="num">RPE هدف {fa(b.target_rpe)}</span>}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setMenu(b.key)} aria-label="گزینه‌های حرکت">
                  <MoreVertical size={20} />
                </button>
              </div>
              {b.coach_note && (
                <p className="coach-note small">
                  <MessageSquareQuote size={16} /> {b.coach_note}
                </p>
              )}
              <textarea
                className="wk-note"
                rows={1}
                placeholder="یادداشت این حرکت…"
                value={b.notes}
                onChange={(e) => workout.setNotes(b.key, e.target.value)}
                onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` }}
              />

              <div className="set-grid" style={{ ['--cols' as string]: cols.length }}>
                <div className="set-hd">ست</div>
                <div className="set-hd">قبلی</div>
                {cols.map((c) => (
                  <div key={c} className="set-hd">{COLUMN_HEAD[ex?.tracking_type ?? 'weight_reps']?.[c] ?? FIELD_META[c].label}</div>
                ))}
                <div className="set-hd" aria-label="انجام شد"><Check size={16} /></div>

                {b.sets.map((s, i) => {
                  const p = prevFor(b, i)
                  const workingNo = b.sets.slice(0, i + 1).filter((x) => x.type !== 'warmup').length
                  const meta = SET_TYPE_META[s.type]
                  return (
                    <div key={s.key} className={`set-row${s.done ? ' done' : ''}`}>
                      <button className={`set-no ${s.type}`} onClick={() => setTypeFor({ block: b.key, set: s.key })} aria-label={`نوع ست: ${meta.label}`}>
                        {meta.short || fa(workingNo)}
                      </button>
                      <div className="set-prev num">{p ? cols.map((c) => formatField(c, (p[c] as number) ?? null) || '–').join(' × ') : '–'}</div>
                      {cols.map((c) => {
                        const on = cursor?.set === s.key && cursor.field === c
                        const val = s[c] as number | null
                        const placeholder = c === 'reps' && s.target ? fa(s.target) : formatField(c, (p?.[c] as number) ?? null)
                        return (
                          <button key={c} className={`set-cell num${on ? ' on' : ''}`} onClick={() => setCursor({ block: b.key, set: s.key, field: c })}>
                            {val !== null ? formatField(c, val) : <span className="ph">{placeholder || '–'}</span>}
                          </button>
                        )
                      })}
                      <button className={`set-check${s.done ? ' on' : ''}`} onClick={() => complete(b, s, i)} aria-pressed={s.done} aria-label="ثبت ست">
                        <Check size={20} strokeWidth={3} />
                      </button>
                      {s.rpe !== null && <span className="set-rpe num">RPE {fa(s.rpe)}</span>}
                    </div>
                  )
                })}
              </div>
              <button className="btn btn-ghost btn-block" onClick={() => workout.addSet(b.key)} style={{ marginTop: 8 }}>
                <Plus size={18} /> افزودن ست
              </button>
            </section>
          )
        })}

        <button className="btn btn-primary btn-lg btn-block" onClick={() => setPicker(true)}>
          <Plus size={20} /> افزودن حرکت
        </button>
        <button
          className="btn btn-danger btn-block"
          onClick={async () => {
            if (await confirm({ title: 'لغو تمرین؟', body: 'ست‌های ثبت‌شده ذخیره نمی‌شوند.', confirm: 'لغو تمرین', cancel: 'ادامه تمرین', danger: true })) {
              workout.discard()
              nav('/')
            }
          }}
        >
          لغو تمرین
        </button>
      </div>

      {w.rest && <RestTimer rest={w.rest} lifted={!!cursor} />}

      {cursor && activeBlock && activeSet && (
        <Numpad
          title={`${activeEx?.title_fa ?? ''}، ست ${fa(activeIdx + 1)}`}
          fields={fieldsOf(activeBlock)}
          field={cursor.field}
          value={activeSet[cursor.field] as number | null}
          previous={(prevFor(activeBlock, activeIdx)?.[cursor.field] as number | null | undefined) ?? null}
          onField={(f) => setCursor({ ...cursor, field: f })}
          onChange={(v) => workout.setField(activeBlock.key, activeSet.key, cursor.field, v)}
          onNext={next}
          nextLabel={
            COLUMNS[activeEx?.tracking_type ?? 'weight_reps'].indexOf(cursor.field) <
            COLUMNS[activeEx?.tracking_type ?? 'weight_reps'].length - 1
              ? 'بعدی'
              : 'ثبت ست'
          }
          onClose={() => setCursor(null)}
          onPlates={activeEx?.equipment === 'barbell' ? () => setPlates((activeSet.weight_kg as number) ?? 0) : undefined}
        />
      )}

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(s) => workout.addExercises(s)} />
      <ExercisePicker
        open={!!replacing}
        multi={false}
        onClose={() => setReplacing(null)}
        onPick={([slug]) => {
          if (replacing && slug) workout.replaceExercise(replacing, slug)
          setReplacing(null)
        }}
      />
      <PlateCalculator open={plates !== null} onClose={() => setPlates(null)} weight={plates ?? 0} />

      <BlockMenu
        block={w.blocks.find((b) => b.key === menu)}
        hasNext={!!w.blocks[w.blocks.findIndex((b) => b.key === menu) + 1]}
        exercise={menu ? bySlug.get(w.blocks.find((b) => b.key === menu)?.exercise_id ?? '') : undefined}
        onClose={() => setMenu(null)}
        onReplace={() => { setReplacing(menu); setMenu(null) }}
      />

      <Sheet open={!!typeFor} onClose={() => setTypeFor(null)} title="نوع ست">
        <div className="list" style={{ marginInline: -16 }}>
          {(Object.keys(SET_TYPE_META) as SetType[]).map((t) => (
            <button
              key={t}
              className="list-item"
              onClick={() => {
                workout.setType(typeFor!.block, typeFor!.set, t)
                setTypeFor(null)
              }}
            >
              <span className={`set-no ${t}`}>{SET_TYPE_META[t].short || 'N'}</span>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{SET_TYPE_META[t].label}</div>
                <div className="small muted">{SET_TYPE_META[t].hint}</div>
              </div>
            </button>
          ))}
          <button
            className="list-item"
            style={{ color: 'var(--failure)' }}
            onClick={() => {
              workout.removeSet(typeFor!.block, typeFor!.set)
              if (cursor?.set === typeFor!.set) setCursor(null)
              setTypeFor(null)
            }}
          >
            <Trash2 size={20} /> حذف این ست
          </button>
        </div>
      </Sheet>

      <Sheet open={finishing} onClose={() => setFinishing(false)} title="پایان تمرین">
        <div className="stack">
          {doneSets === 0 ? (
            <p className="muted">هنوز هیچ ستی تیک نخورده است. برای ذخیره، حداقل یک ست را ثبت کنید.</p>
          ) : (
            <p className="muted">
              {fa(doneSets)} ست ثبت‌شده با حجم {fa(Math.round(volume))} کیلو ذخیره می‌شود. ست‌های تیک‌نخورده کنار گذاشته می‌شوند.
            </p>
          )}
          <button className="btn btn-success btn-lg btn-block" disabled={doneSets === 0 || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره تمرین'}
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setFinishing(false)}>
            ادامه تمرین
          </button>
        </div>
      </Sheet>
    </div>
  )
}

const REST_CHOICES = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300]

function BlockMenu({ block, hasNext, exercise, onClose, onReplace }: { block?: LiveBlock; hasNext: boolean; exercise?: Exercise; onClose: () => void; onReplace: () => void }) {
  if (!block) return null
  const inSS = block.superset_group !== null
  return (
    <Sheet open onClose={onClose} title={exercise?.title_fa ?? 'حرکت'}>
      <div className="stack">
        <div>
          <div className="section-title">زمان استراحت این حرکت</div>
          <div className="chips">
            {REST_CHOICES.map((s) => (
              <button key={s} className="chip num" aria-pressed={block.rest_seconds === s} onClick={() => workout.setRestSeconds(block.key, s)}>
                {s === 0 ? 'خاموش' : clock(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="list panel" style={{ overflow: 'hidden' }}>
          <button className="list-item" onClick={onReplace}>
            <Repeat2 size={20} /> جایگزینی حرکت
          </button>
          {(inSS || hasNext) && (
            <button className="list-item" onClick={() => { workout.toggleSuperset(block.key); onClose() }}>
              {inSS ? <Unlink size={20} /> : <Link2 size={20} />}
              {inSS ? 'جدا کردن از سوپرست' : 'سوپرست با حرکت بعدی'}
            </button>
          )}
          <button className="list-item" onClick={() => { workout.moveBlock(block.key, -1); onClose() }}>
            <ArrowUp size={20} /> جابه‌جایی به بالا
          </button>
          <button className="list-item" onClick={() => { workout.moveBlock(block.key, 1); onClose() }}>
            <ArrowDown size={20} /> جابه‌جایی به پایین
          </button>
          <button className="list-item" style={{ color: 'var(--failure)' }} onClick={() => { workout.removeBlock(block.key); onClose() }}>
            <Trash2 size={20} /> حذف حرکت
          </button>
        </div>
      </div>
    </Sheet>
  )
}
