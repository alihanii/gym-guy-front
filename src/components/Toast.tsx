import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

type Tone = 'success' | 'error'
type Item = { id: number; text: string; tone: Tone; leaving: boolean }
type Show = (text: string, tone?: Tone) => void

const Ctx = createContext<Show>(() => {})
const SHOW_MS = 2800
const LEAVE_MS = 180

/** Small non-blocking messages at the top of the screen. Errors read as errors, the rest as success. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)

  const show = useCallback<Show>((text, tone) => {
    const id = ++seq.current
    const t: Tone = tone ?? (/خطا|نشد|نمی‌|error|failed/i.test(text) ? 'error' : 'success')
    setItems((xs) => [...xs.slice(-2), { id, text, tone: t, leaving: false }])
    window.setTimeout(() => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x))), SHOW_MS)
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), SHOW_MS + LEAVE_MS)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className={`toast ${x.tone}`} data-leaving={x.leaving || undefined}>
            {x.tone === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
            <span>{x.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
