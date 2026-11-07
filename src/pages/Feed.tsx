import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, Users } from 'lucide-react'
import { api } from '../lib/api'
import { fa } from '../lib/fa'
import type { FeedPage, PublicUser } from '../lib/types'
import { Sheet } from '../components/Sheet'
import { WorkoutCard } from '../components/WorkoutCard'

type Found = PublicUser & { followers: number; is_following: boolean }

export function FollowButton({ id, following, onChange }: { id: number; following: boolean; onChange?: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [on, setOn] = useState(following)
  const m = useMutation({
    mutationFn: (v: boolean) => api(`/users/${id}/follow/`, { method: v ? 'POST' : 'DELETE' }),
    onMutate: (v) => { setOn(v); onChange?.(v) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['user', id] }) },
  })
  return (
    <button className={`btn btn-sm ${on ? 'btn-ghost' : 'btn-primary'}`} onClick={() => m.mutate(!on)}>
      {on ? 'دنبال می‌کنید' : <><UserPlus size={16} /> دنبال کردن</>}
    </button>
  )
}

function useFeed(kind: 'following' | 'discover') {
  return useInfiniteQuery({
    queryKey: ['feed', kind],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => api<FeedPage>(`/feed/${kind === 'discover' ? 'discover/' : ''}${pageParam ? `?before=${pageParam}` : ''}`),
    getNextPageParam: (p) => p.next,
  })
}

/** Workouts from people you follow, or everyone's public ones. Lives on the home page. */
export function FeedSection() {
  const [tab, setTab] = useState<'following' | 'discover'>('following')
  const [people, setPeople] = useState(false)
  const feed = useFeed(tab)
  const cards = feed.data?.pages.flatMap((p) => p.results) ?? []
  return (
    <section className="stack" style={{ gap: 14 }}>
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 'inherit' }}>فید</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setPeople(true)}><Search size={16} /> پیدا کردن ورزشکار</button>
      </div>
      <div className="segmented">
        <button aria-pressed={tab === 'following'} onClick={() => setTab('following')}>دنبال‌شده‌ها</button>
        <button aria-pressed={tab === 'discover'} onClick={() => setTab('discover')}>کشف</button>
      </div>
      {feed.isLoading && <div className="feed-list"><div className="skeleton" style={{ height: 260 }} /><div className="skeleton" style={{ height: 260 }} /></div>}
      {!feed.isLoading && cards.length === 0 && (
        <div className="panel empty">
          <Users size={32} />
          {tab === 'following' ? (
            <>
              <p>هنوز کسی را دنبال نمی‌کنید. ورزشکارها را پیدا کنید تا تمرین‌هایشان اینجا بیاید.</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => setPeople(true)}>پیدا کردن ورزشکار</button>
                <button className="btn btn-ghost" onClick={() => setTab('discover')}>دیدن تمرین‌های عمومی</button>
              </div>
            </>
          ) : (
            <p>هنوز تمرین عمومی‌ای ثبت نشده است.</p>
          )}
        </div>
      )}
      <div className="feed-list">
        {cards.map((w) => <WorkoutCard key={w.id} w={w} />)}
      </div>
      {feed.hasNextPage && (
        <button className="btn btn-ghost btn-block" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
          {feed.isFetchingNextPage ? 'در حال بارگذاری…' : 'تمرین‌های قدیمی‌تر'}
        </button>
      )}
      {people && <PeopleSheet onClose={() => setPeople(false)} />}
    </section>
  )
}

function PeopleSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const r = useQuery({ queryKey: ['users', q], queryFn: () => api<Found[]>(`/users/?q=${encodeURIComponent(q)}`) })
  return (
    <Sheet open onClose={onClose} title="پیدا کردن ورزشکار" tall>
      <div className="stack">
        <label className="row input" style={{ gap: 8 }}>
          <Search size={18} color="var(--text-3)" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم ورزشکار یا مربی" style={{ all: 'unset', flex: 1 }} aria-label="جستجوی کاربر" />
        </label>
        <div className="list" style={{ marginInline: -16 }}>
          {r.data?.map((u) => (
            <div key={u.id} className="list-item" style={{ cursor: 'default' }}>
              <Link to={`/u/${u.id}`} onClick={onClose} className="avatar">{u.name.slice(0, 1)}</Link>
              <Link to={`/u/${u.id}`} onClick={onClose} className="grow">
                <div style={{ fontWeight: 700 }}>{u.name} {u.is_coach && <span className="badge blue">مربی</span>}</div>
                <div className="small faint">{fa(u.followers)} دنبال‌کننده</div>
              </Link>
              <FollowButton id={u.id} following={u.is_following} />
            </div>
          ))}
          {r.data?.length === 0 && <p className="muted small" style={{ padding: 16 }}>کسی با این اسم پیدا نشد.</p>}
        </div>
      </div>
    </Sheet>
  )
}
