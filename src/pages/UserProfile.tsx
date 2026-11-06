import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { fa } from '../lib/fa'
import type { FeedCard, PublicUser } from '../lib/types'
import { WorkoutCard } from '../components/WorkoutCard'
import { FollowButton } from './Feed'

interface Profile extends PublicUser {
  is_private: boolean
  followers: number
  following: number
  workouts: number
  is_following: boolean
  recent: FeedCard[]
}

export default function UserProfile() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['user', Number(id)], queryFn: () => api<Profile>(`/users/${id}/`) })
  const u = q.data
  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="بازگشت"><ChevronRight size={26} /></button>
        <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{u?.name ?? ''}</h1>
      </div>
      {q.isLoading && <div className="skeleton" style={{ height: 160 }} />}
      {q.isError && <p className="muted">این کاربر پیدا نشد.</p>}
      {u && (
        <>
          <section className="panel panel-pad stack">
            <div className="row">
              <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>{u.name.slice(0, 1)}</div>
              <div className="grow">
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{u.name}</div>
                {u.is_coach && <span className="badge blue">مربی</span>}
              </div>
              {!u.is_me && <FollowButton id={u.id} following={u.is_following} />}
            </div>
            <div className="profile-counts">
              <div><b className="num">{fa(u.workouts)}</b><span className="small muted">تمرین</span></div>
              <div><b className="num">{fa(u.followers)}</b><span className="small muted">دنبال‌کننده</span></div>
              <div><b className="num">{fa(u.following)}</b><span className="small muted">دنبال‌شونده</span></div>
            </div>
          </section>
          {u.is_private && !u.is_me ? (
            <div className="panel empty"><Lock size={28} /><p>تمرین‌های این کاربر خصوصی است.</p></div>
          ) : u.recent.length === 0 ? (
            <div className="panel empty"><p>هنوز تمرینی ثبت نشده است.</p></div>
          ) : (
            <div className="feed-list">{u.recent.map((w) => <WorkoutCard key={w.id} w={w} />)}</div>
          )}
        </>
      )}
    </div>
  )
}
