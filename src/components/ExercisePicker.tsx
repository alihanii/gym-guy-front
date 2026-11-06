import { useDeferredValue, useMemo, useState } from 'react'
import { Check, Plus, Search, TriangleAlert } from 'lucide-react'
import { Sheet } from './Sheet'
import { CustomExerciseSheet } from './CustomExerciseSheet'
import { useIncremental } from '../lib/useIncremental'
import { useExercises, useTaxonomy } from '../lib/data'
import type { Exercise } from '../lib/types'
import { fa } from '../lib/fa'
import { Thumb } from '../pages/Exercises'

const norm = (s: string) =>
  s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\-_]/g, ' ').replace(/آ/g, 'ا').toLowerCase().trim()

function score(e: Exercise, q: string): number {
  const names = [e.title_fa, e.title_en, ...e.persian_aliases].map(norm)
  if (names.some((n) => n === q)) return 100
  if (names.some((n) => n.startsWith(q))) return 70
  if (names.some((n) => n.includes(q))) return 50
  const words = q.split(/\s+/)
  return names.some((n) => words.every((w) => n.includes(w))) ? 30 : 0
}

interface Props {
  open: boolean
  onClose: () => void
  onPick: (slugs: string[]) => void
  multi?: boolean
  injuryTags?: string[]
}

export function ExercisePicker({ open, onClose, onPick, multi = true, injuryTags = [] }: Props) {
  const { list, isLoading } = useExercises()
  const tax = useTaxonomy()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const dq = useDeferredValue(norm(q))

  const results = useMemo(() => {
    let r = list.filter((e) => e.listed !== false)
    if (muscle) r = r.filter((e) => e.primary_muscle === muscle)
    if (!dq) return r
    return r
      .map((e) => [e, score(e, dq)] as const)
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([e]) => e)
  }, [list, dq, muscle])
  const { visible, sentinel, more } = useIncremental(results)

  const close = () => {
    setPicked([])
    setQ('')
    onClose()
  }

  const toggle = (slug: string) => {
    if (!multi) {
      onPick([slug])
      close()
      return
    }
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]))
  }

  return (
    <Sheet open={open} onClose={close} title="افزودن حرکت" tall>
      <div className="stack" style={{ position: 'sticky', top: 0, background: 'var(--surface)', paddingBottom: 10, zIndex: 1 }}>
        <label className="row input" style={{ gap: 8 }}>
          <Search size={18} color="var(--text-3)" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو: «لت دست باز»، «قایقی»، squat…"
            style={{ all: 'unset', flex: 1, minWidth: 0 }}
            aria-label="جستجوی حرکت"
          />
        </label>
        <div className="chip-scroll">
          <button className="chip" aria-pressed={muscle === null} onClick={() => setMuscle(null)}>
            همه
          </button>
          {tax.data?.muscles.map((m) => (
            <button key={m.value} className="chip" aria-pressed={muscle === m.value} onClick={() => setMuscle(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="stack">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
      ) : results.length === 0 ? (
        <div className="empty">
          <Search size={32} />
          <p>{q.trim() ? `حرکتی با «${q.trim()}» پیدا نشد. اسم دیگری را امتحان کنید، یا خودتان بسازیدش.` : 'هنوز حرکتی در بانک نیست. اولین حرکت را بسازید.'}</p>
          <button className="btn btn-ghost" onClick={() => setCreating(true)}><Plus size={18} /> {q.trim() ? `ساخت «${q.trim()}»` : 'ساخت حرکت جدید'}</button>
        </div>
      ) : (
        <div className="list" style={{ marginInline: -16 }}>
          {visible.map((e) => {
            const on = picked.includes(e.slug)
            const risky = e.injury_warnings.filter((t) => injuryTags.includes(t))
            return (
              <button key={e.slug} className="list-item" onClick={() => toggle(e.slug)} aria-pressed={on}>
                {on ? (
                  <div className="avatar" style={{ background: 'var(--primary)', color: '#fff' }}><Check size={20} /></div>
                ) : (
                  <Thumb e={e} />
                )}
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{e.title_fa}</div>
                  <div className="small faint ellipsis">
                    {tax.label(e.primary_muscle)}، {tax.label(e.equipment)}، <span dir="ltr">{e.title_en}</span>
                  </div>
                </div>
                {risky.length > 0 && (
                  <span className="badge amber" title={risky.map(tax.injury).join('، ')}>
                    <TriangleAlert size={14} /> آسیب
                  </span>
                )}
              </button>
            )
          })}
          {more && <div ref={sentinel} className="list-more">در حال بارگذاری…</div>}
        </div>
      )}

      {multi && picked.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, paddingTop: 12, background: 'var(--surface)' }}>
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={() => {
              onPick(picked)
              close()
            }}
          >
            افزودن {fa(picked.length)} حرکت
          </button>
        </div>
      )}
      {creating && (
        <CustomExerciseSheet
          open
          initialName={q}
          onClose={() => setCreating(false)}
          onCreated={(e) => { setQ(''); toggle(e.slug) }}
        />
      )}
    </Sheet>
  )
}
