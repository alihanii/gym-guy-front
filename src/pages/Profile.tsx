import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, ChevronLeft, History, Lock, LogOut, Ruler, UserRound } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fa } from '../lib/fa'
import type { User } from '../lib/types'

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth()
  const coaches = useQuery({ queryKey: ['my-coaches'], queryFn: () => api<{ program_id: number; title: string; coach_name: string; days: number }[]>('/me/coaches/') })
  const setRole = useMutation({
    mutationFn: (role: string) => api<User>('/auth/me/', { method: 'PATCH', json: { role } }),
    onSuccess: setUser,
  })
  const setPrivacy = useMutation({
    mutationFn: (is_private: boolean) => api<User>('/auth/me/', { method: 'PATCH', json: { is_private } }),
    onSuccess: setUser,
  })
  if (!user) return null
  return (
    <div className="page">
      <h1 className="page-title">پروفایل</h1>
      <div className="panel panel-pad row">
        <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.3rem' }}>{user.name.slice(0, 1)}</div>
        <div className="grow">
          <div style={{ fontWeight: 800 }}>{user.name}</div>
          <div className="small muted num" dir="ltr" style={{ textAlign: 'right' }}>{fa(user.phone).replace(/٬/g, '')}</div>
        </div>
      </div>

      <div className="panel list" style={{ overflow: 'hidden' }}>
        <Link to={`/u/${user.id}`} className="list-item"><UserRound size={20} color="var(--primary)" /><span className="grow" style={{ fontWeight: 700 }}>پروفایل عمومی من</span><ChevronLeft size={18} className="faint" /></Link>
        <Link to="/history" className="list-item"><History size={20} color="var(--primary)" /><span className="grow" style={{ fontWeight: 700 }}>تاریخچه تمرین‌ها</span><ChevronLeft size={18} className="faint" /></Link>
        <Link to="/stats" className="list-item"><BarChart3 size={20} color="var(--primary)" /><span className="grow" style={{ fontWeight: 700 }}>آمار و تقویم</span><ChevronLeft size={18} className="faint" /></Link>
        <Link to="/measurements" className="list-item"><Ruler size={20} color="var(--primary)" /><span className="grow" style={{ fontWeight: 700 }}>اندازه‌های بدن</span><ChevronLeft size={18} className="faint" /></Link>
      </div>

      <label className="panel panel-pad row" style={{ cursor: 'pointer' }}>
        <Lock size={20} color="var(--text-2)" />
        <div className="grow">
          <div style={{ fontWeight: 700 }}>حساب خصوصی</div>
          <div className="small muted">تمرین‌هایتان در فید عمومی و پروفایلتان به دیگران نشان داده نمی‌شود.</div>
        </div>
        <input type="checkbox" className="switch" checked={user.is_private} onChange={(e) => setPrivacy.mutate(e.target.checked)} />
      </label>

      <div className="field">
        <span>نقش</span>
        <div className="segmented">
          {([['athlete', 'ورزشکار'], ['coach', 'مربی'], ['both', 'هر دو']] as const).map(([v, l]) => (
            <button key={v} aria-pressed={user.role === v} onClick={() => setRole.mutate(v)}>{l}</button>
          ))}
        </div>
        <p className="small muted">مربی‌ها هم می‌توانند تمرین خودشان را ثبت کنند. «هر دو» هر دو بخش را باز می‌کند.</p>
      </div>

      <section>
        <div className="section-title">مربی‌های من</div>
        {coaches.data?.length ? (
          <div className="panel list" style={{ overflow: 'hidden' }}>
            {coaches.data.map((c) => (
              <div key={c.program_id} className="list-item" style={{ cursor: 'default' }}>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{c.coach_name}</div>
                  <div className="small muted">{c.title}، {fa(c.days)} روز</div>
                </div>
                <span className="badge green">فعال</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="small muted">به هیچ مربی‌ای وصل نیستید.</p>
        )}
      </section>

      <button className="btn btn-danger btn-block" onClick={logout}>
        <LogOut size={18} /> خروج از حساب
      </button>
    </div>
  )
}
