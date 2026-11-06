import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { CustomExerciseSheet } from '../components/CustomExerciseSheet'
import { useIncremental } from '../lib/useIncremental'
import { useExercises, useTaxonomy } from '../lib/data'
import type { Exercise } from '../lib/types'

const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\-_]/g, ' ').replace(/آ/g, 'ا').toLowerCase().trim()

export default function ExercisesPage() {
  const { list, isLoading } = useExercises()
  const tax = useTaxonomy()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [eq, setEq] = useState<string | null>(null)
  const dq = useDeferredValue(norm(q))
  const results = useMemo(
    () =>
      list.filter(
        (e) =>
          e.listed !== false &&
          (!eq || e.equipment === eq) &&
          (!dq || [e.title_fa, e.title_en, ...e.persian_aliases].some((n) => dq.split(' ').every((w) => norm(n).includes(w)))),
      ),
    [list, dq, eq],
  )
  const { visible, sentinel, more } = useIncremental(results)

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">بانک حرکات</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}><Plus size={16} /> حرکت شخصی</button>
      </div>
      {creating && <CustomExerciseSheet open initialName={q} onClose={() => setCreating(false)} />}
      <label className="row input" style={{ gap: 8 }}>
        <Search size={18} color="var(--text-3)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم حرکت یا اصطلاح باشگاهی…" style={{ all: 'unset', flex: 1 }} aria-label="جستجو" />
      </label>
      <div className="chip-scroll">
        <button className="chip" aria-pressed={!eq} onClick={() => setEq(null)}>همه وسایل</button>
        {tax.data?.equipment.map((o) => (
          <button key={o.value} className="chip" aria-pressed={eq === o.value} onClick={() => setEq(o.value)}>{o.label}</button>
        ))}
      </div>
      {isLoading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : (
        <div className="panel list" style={{ overflow: 'hidden' }}>
          {visible.map((e) => (
            <Link key={e.slug} className="list-item" to={`/exercises/${e.slug}`}>
              <Thumb e={e} />
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{e.title_fa}</div>
                <div className="small faint ellipsis"><bdi>{e.title_en}</bdi></div>
              </div>
              <span className="badge">{tax.label(e.primary_muscle)}</span>
            </Link>
          ))}
          {more && <div ref={sentinel} className="list-more">در حال بارگذاری…</div>}
          {results.length === 0 && (
            <div className="empty">
              <p>{q || eq ? 'حرکتی پیدا نشد.' : 'هنوز حرکتی اضافه نشده.'}</p>
              <button className="btn btn-ghost" onClick={() => setCreating(true)}><Plus size={18} /> {q.trim() ? `ساخت «${q.trim()}»` : 'ساخت حرکت جدید'}</button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export function Thumb({ e }: { e: Exercise }) {
  return e.thumbnail_url ? (
    <img className="avatar ex-thumb" src={e.thumbnail_url} alt="" loading="lazy" />
  ) : (
    <div className="avatar">{e.title_fa.slice(0, 1)}</div>
  )
}
