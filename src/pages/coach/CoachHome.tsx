import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { api } from '../../lib/api'
import type { Client } from '../../lib/types'
import { fa } from '../../lib/fa'

export function statusBadge(c: Client) {
  if (c.athlete) return <span className="badge green">وصل شده</span>
  if (c.active_program?.status === 'pending_invite') return <span className="badge amber num">کد {fa(c.active_program.invite_code ?? '')}</span>
  if (c.active_program) return <span className="badge">پیش‌نویس برنامه</span>
  return <span className="badge">بدون برنامه</span>
}

export default function CoachHome() {
  const q = useQuery({ queryKey: ['clients'], queryFn: () => api<Client[]>('/coach/clients/') })
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">شاگردها</h1>
        <Link to="/coach/clients/new" className="btn btn-primary">
          <UserPlus size={18} /> شاگرد جدید
        </Link>
      </div>
      {q.isLoading && <div className="skeleton" style={{ height: 180 }} />}
      {q.data?.length === 0 && (
        <div className="panel empty">
          <Users size={32} />
          <p>اولین شاگردتان را اضافه کنید، برایش برنامه بنویسید و کد ۶ رقمی را برایش بفرستید.</p>
          <Link to="/coach/clients/new" className="btn btn-primary">افزودن شاگرد</Link>
        </div>
      )}
      {!!q.data?.length && (
        <div className="panel list" style={{ overflow: 'hidden' }}>
          {q.data.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.id}`} className="list-item">
              <div className="avatar">{c.name.slice(0, 1)}</div>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="small muted ellipsis">{c.active_program?.title ?? 'هنوز برنامه‌ای ندارد'}</div>
              </div>
              {statusBadge(c)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
