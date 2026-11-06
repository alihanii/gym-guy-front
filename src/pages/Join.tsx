import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { fa, toLatinDigits } from '../lib/fa'
import { haptic } from '../lib/haptics'

interface Preview { title: string; coach_name: string; days: string[]; already_linked: boolean }

/** Six boxes, digits only, paste-friendly. */
export function CodeEntry({ initial = '', onDone }: { initial?: string; onDone?: () => void }) {
  const [code, setCode] = useState(initial)
  const nav = useNavigate()
  const qc = useQueryClient()
  const ready = code.length === 6
  const preview = useQuery({
    queryKey: ['invite', code],
    queryFn: () => api<Preview>(`/invites/${code}/`),
    enabled: ready,
    retry: false,
  })
  const redeem = useMutation({
    mutationFn: () => api<{ title: string; routines: number }>(`/invites/${code}/`, { method: 'POST' }),
    onSuccess: () => {
      haptic.success()
      qc.invalidateQueries({ queryKey: ['routines'] })
      onDone?.()
      nav('/', { replace: true })
    },
  })

  return (
    <div className="stack" style={{ gap: 16 }}>
      <label className="code-input">
        <span className="muted small">کد ۶ رقمی که مربی برایتان فرستاده</span>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, '').slice(-6))}
          aria-label="کد دعوت"
        />
        <div className="code-boxes num" dir="ltr" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i === code.length ? 'caret' : ''}>{code[i] ? fa(code[i]) : ''}</span>
          ))}
        </div>
      </label>

      {preview.isError && <p className="form-error">این کد معتبر نیست یا منقضی شده. دوباره از مربی بپرسید.</p>}
      {preview.data && (
        <div className="panel panel-pad stack" style={{ gap: 8 }}>
          <div className="small muted">مربی: {preview.data.coach_name}</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{preview.data.title}</div>
          <div className="chips">
            {preview.data.days.map((d, i) => <span key={i} className="badge">{d || `روز ${fa(i + 1)}`}</span>)}
          </div>
        </div>
      )}
      {redeem.isError && <p className="form-error">{(redeem.error as Error).message}</p>}
      <button
        className="btn btn-primary btn-lg btn-block"
        disabled={!preview.data || redeem.isPending}
        onClick={() => redeem.mutate()}
      >
        {preview.data?.already_linked ? (
          <><CheckCircle2 size={18} /> قبلاً وصل شده‌اید؛ به‌روزرسانی</>
        ) : redeem.isPending ? 'در حال اتصال…' : 'اتصال به مربی و دریافت برنامه'}
      </button>
    </div>
  )
}

export default function JoinPage() {
  const { code = '' } = useParams()
  return (
    <div className="page">
      <h1 className="page-title">پیوستن به برنامه مربی</h1>
      <CodeEntry initial={toLatinDigits(code).replace(/\D/g, '').slice(-6)} />
    </div>
  )
}
