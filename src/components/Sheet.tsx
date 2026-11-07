import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePresence } from '../lib/usePresence'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  tall?: boolean
}

/** Bottom sheet: thumb-reachable on phones, dismiss by backdrop, Esc or close button. */
export function Sheet({ open, onClose, title, actions, children, tall }: Props) {
  const { mounted, closing } = usePresence(open, 220)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!mounted) return null
  return createPortal(
    <div className="sheet-layer" data-closing={closing || undefined}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" style={tall ? { height: '88dvh' } : undefined}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <div className="row" style={{ gap: 4 }}>
            {actions}
            <button className="icon-btn" onClick={onClose} aria-label="بستن">
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
