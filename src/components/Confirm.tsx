import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePresence } from '../lib/usePresence'

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirm?: string
  cancel?: string
  danger?: boolean
}
type Ask = (o: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<Ask>(async () => false)

/** Replaces window.confirm with a dialog that matches the app. `await confirm({...})` resolves true or false. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})
  const { mounted, closing } = usePresence(!!opts, 160)
  const last = useRef<ConfirmOptions | null>(null)
  if (opts) last.current = opts

  const ask = useCallback<Ask>((o) => {
    setOpts(o)
    return new Promise<boolean>((res) => { resolver.current = res })
  }, [])
  const done = useCallback((v: boolean) => {
    resolver.current(v)
    setOpts(null)
  }, [])

  const okRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!opts) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && done(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opts, done])

  const o = opts ?? last.current
  return (
    <Ctx.Provider value={ask}>
      {children}
      {mounted && o && createPortal(
        <div className="dialog-layer" data-closing={closing || undefined}>
          <div className="dialog-backdrop" onClick={() => done(false)} />
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
            <h2 id="dlg-title">{o.title}</h2>
            {o.body && <div className="muted">{o.body}</div>}
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => done(false)}>{o.cancel ?? 'انصراف'}</button>
              <button ref={okRef} className={`btn ${o.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => done(true)}>
                {o.confirm ?? 'تأیید'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export const useConfirm = () => useContext(Ctx)
