import { Logo } from '../components/Logo'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { toLatinDigits } from '../lib/fa'

export default function AuthPage() {
  const { login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const p = toLatinDigits(phone)
      if (mode === 'login') await login(p, password)
      else await register({ phone: p, name, password, role })
      const back = (loc.state as { from?: string } | null)?.from
      nav(back ?? (role === 'coach' && mode === 'register' ? '/coach' : '/'), { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <Logo size={44} />
        <h1>جیم‌گای</h1>
        <p className="muted">ست‌هایت را سریع ثبت کن، برنامه مربی‌ات را همین‌جا اجرا کن.</p>
      </div>

      <form className="panel panel-pad stack" onSubmit={submit} style={{ gap: 16 }}>
        <div className="segmented">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>ورود</button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>ساخت حساب</button>
        </div>

        {mode === 'register' && (
          <>
            <label className="field">
              <span>نام</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
            <div className="field">
              <span>از اپ چطور استفاده می‌کنید؟</span>
              <div className="segmented">
                <button type="button" aria-pressed={role === 'athlete'} onClick={() => setRole('athlete')}>ورزشکارم</button>
                <button type="button" aria-pressed={role === 'coach'} onClick={() => setRole('coach')}>مربی‌ام</button>
              </div>
            </div>
          </>
        )}
        <label className="field">
          <span>شماره موبایل</span>
          <input className="input num" dir="ltr" inputMode="tel" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
        </label>
        <label className="field">
          <span>رمز عبور</span>
          <input className="input" type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ساخت حساب'}
        </button>
      </form>
    </div>
  )
}
