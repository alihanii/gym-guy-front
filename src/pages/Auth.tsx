import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { toLatinDigits } from '../lib/fa'

type Mode = 'login' | 'register'

/** Full-screen sign in / sign up. Coaches turn on coach mode later from the profile. */
export default function AuthPage() {
  const { login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<Mode>('login')
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
      else await register({ phone: p, name, password, role: 'athlete' })
      nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  return (
    <main className="auth">
      <div className="auth-inner">
        <div className="auth-brand">
          <Logo size={48} />
          <h1>{mode === 'login' ? 'خوش برگشتی' : 'ساخت حساب'}</h1>
          <p className="muted">ست‌هایت را سریع ثبت کن و برنامه‌ی مربی‌ات را همین‌جا اجرا کن.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label className="field reveal">
              <span>نام</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>شماره موبایل</span>
            <input className="input num" dir="ltr" inputMode="tel" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
          </label>
          <label className="field">
            <span>رمز عبور</span>
            <input className="input" type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="form-error reveal" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ساخت حساب'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>حساب نداری؟<button type="button" onClick={() => switchTo('register')}>ثبت‌نام</button></>
          ) : (
            <>حساب داری؟<button type="button" onClick={() => switchTo('login')}>ورود</button></>
          )}
        </p>
      </div>
    </main>
  )
}
