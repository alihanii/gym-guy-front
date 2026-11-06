import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Newspaper, Dumbbell, History, BookOpen, Ruler, Users, UserRound, Timer, type LucideIcon } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useActiveWorkout } from '../lib/workout'
import { useEffect, useState } from 'react'
import { clock } from '../lib/fa'
import { Logo } from './Logo'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean }

export function Layout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const wide = pathname.startsWith('/coach/programs')
  const items: Item[] = [
    { to: '/feed', label: 'فید', icon: Newspaper },
    { to: '/', label: 'تمرین', icon: Dumbbell, end: true },
    { to: '/history', label: 'تاریخچه', icon: History },
    { to: '/exercises', label: 'حرکات', icon: BookOpen },
    ...(user?.is_coach ? [{ to: '/coach', label: 'شاگردها', icon: Users }] : []),
    { to: '/profile', label: 'پروفایل', icon: UserRound },
  ]
  return (
    <div className={`app${wide ? ' wide' : ''}`}>
      <aside className="side" aria-label="ناوبری اصلی">
        <div className="side-brand">
          <Logo size={30} />
          <b>جیم‌گای</b>
        </div>
        <nav className="side-nav">
          {[...items.slice(0, 4), { to: '/stats', label: 'آمار', icon: BarChart3 }, { to: '/measurements', label: 'اندازه‌های بدن', icon: Ruler }, ...items.slice(4)].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <ResumeBar variant="side" />
        {user && (
          <div className="side-user">
            <div className="avatar">{user.name?.[0] ?? '؟'}</div>
            <div className="grow">
              <div className="ellipsis" style={{ fontWeight: 700 }}>{user.name}</div>
              <div className="small faint">{user.is_coach ? 'مربی' : 'ورزشکار'}</div>
            </div>
          </div>
        )}
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <ResumeBar variant="float" />
      <nav className="nav" aria-label="ناوبری اصلی">
        <div className="nav-inner">
          {items.filter((i) => i.to !== '/history').map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/** "Back to your workout" while a session runs: floating bar on phones, a card in the desktop sidebar. */
function ResumeBar({ variant }: { variant: 'float' | 'side' }) {
  const w = useActiveWorkout()
  const nav = useNavigate()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!w) return
    const id = window.setInterval(() => tick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [w])
  if (!w) return null
  return (
    <div className={variant === 'side' ? 'resume-side' : 'resume-bar'}>
      <Timer size={20} color="var(--success)" />
      <div className="grow">
        <div className="ellipsis" style={{ fontWeight: 700 }}>{w.title}</div>
        <div className="small muted num">{clock((Date.now() - w.startedAt) / 1000)}</div>
      </div>
      <button className="btn btn-primary" onClick={() => nav('/workout')}>
        ادامه
      </button>
    </div>
  )
}
