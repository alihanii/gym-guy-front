import { useEffect, useState } from 'react'
import { ChevronDown, Delete, History, Minus, Plus, CornerDownLeft, Disc3 } from 'lucide-react'
import { fa } from '../lib/fa'
import { haptic } from '../lib/haptics'

export type NumField = 'weight_kg' | 'reps' | 'rpe' | 'duration_s' | 'distance_m'

export const FIELD_META: Record<NumField, { label: string; unit: string; step: number; decimals: boolean }> = {
  weight_kg: { label: 'وزنه', unit: 'کیلو', step: 2.5, decimals: true },
  reps: { label: 'تکرار', unit: 'بار', step: 1, decimals: false },
  rpe: { label: 'RPE', unit: '', step: 0.5, decimals: true },
  duration_s: { label: 'زمان', unit: '', step: 15, decimals: false },
  distance_m: { label: 'مسافت', unit: 'کیلومتر', step: 0.5, decimals: true },
}

/** Numbers as shown/typed on the pad. Distance is typed in km, stored in metres. */
function toDisplay(field: NumField, v: number | null): string {
  if (v === null) return ''
  if (field === 'distance_m') return String(+(v / 1000).toFixed(2))
  if (field === 'duration_s') {
    const m = Math.floor(v / 60)
    const s = v % 60
    return `${m}${String(s).padStart(2, '0')}`
  }
  return String(v)
}

function fromBuffer(field: NumField, buf: string): number | null {
  if (buf === '' || buf === '.') return null
  if (field === 'duration_s') {
    const digits = buf.padStart(3, '0')
    return Number(digits.slice(0, -2)) * 60 + Number(digits.slice(-2))
  }
  const n = Number(buf)
  if (!Number.isFinite(n)) return null
  if (field === 'distance_m') return Math.round(n * 1000)
  if (field === 'rpe') return Math.min(10, n)
  return n
}

export function formatField(field: NumField, v: number | null): string {
  if (v === null) return ''
  if (field === 'duration_s') {
    const m = Math.floor(v / 60)
    return fa(`${m}:${String(v % 60).padStart(2, '0')}`)
  }
  if (field === 'distance_m') return fa(+(v / 1000).toFixed(2))
  return fa(v)
}

interface Props {
  title: string
  fields: NumField[]
  field: NumField
  value: number | null
  previous: number | null
  onField: (f: NumField) => void
  onChange: (v: number | null) => void
  onNext: () => void
  onClose: () => void
  onPlates?: () => void
  nextLabel: string
}

export function Numpad({ title, fields, field, value, previous, onField, onChange, onNext, onClose, onPlates, nextLabel }: Props) {
  const meta = FIELD_META[field]
  // First key after focusing a cell replaces its value, like a calculator.
  const [fresh, setFresh] = useState(true)
  useEffect(() => setFresh(true), [field, title])

  const [pending, setPending] = useState<string | null>(null)
  useEffect(() => setPending(null), [field, title])

  const press = (key: string) => {
    haptic.tap()
    const base = fresh ? '' : (pending ?? toDisplay(field, value))
    let buf = base
    if (key === 'back') buf = base.slice(0, -1)
    else if (key === '.') {
      if (!meta.decimals || base.includes('.')) return
      buf = (base || '0') + '.'
    } else {
      if (buf.replace('.', '').length >= 6) return
      buf = base + key
    }
    setFresh(false)
    // keep "82." / "82.0" visible while typing; store the parsed number
    setPending(buf.includes('.') ? buf : null)
    onChange(fromBuffer(field, buf.endsWith('.') ? buf.slice(0, -1) : buf))
  }

  const bump = (dir: 1 | -1) => {
    haptic.tap()
    setFresh(false)
    setPending(null)
    const raw = field === 'distance_m' ? meta.step * 1000 : meta.step
    const next = Math.max(0, (value ?? 0) + dir * raw)
    onChange(field === 'rpe' ? Math.min(10, Math.max(1, next)) : +next.toFixed(2))
  }

  const shown = pending ? fa(pending) : formatField(field, value)
  const stepLabel = field === 'distance_m' ? fa(meta.step) : field === 'duration_s' ? `${fa(15)}ث` : fa(meta.step)

  return (
    <div className="numpad" role="group" aria-label="صفحه‌کلید عددی">
      <div className="numpad-head">
        <div className="grow">
          <div className="small muted ellipsis">{title}</div>
          <div className="numpad-value num" aria-live="polite">
            {shown || <span className="faint">—</span>}
            {meta.unit && <small>{meta.unit}</small>}
          </div>
        </div>
        {onPlates && field === 'weight_kg' && (
          <button className="icon-btn" onClick={onPlates} aria-label="ماشین‌حساب صفحه هالتر">
            <Disc3 size={22} />
          </button>
        )}
        <button className="icon-btn" onClick={onClose} aria-label="بستن صفحه‌کلید">
          <ChevronDown size={24} />
        </button>
      </div>
      {fields.length > 1 && (
        <div className="segmented" style={{ margin: '0 12px 8px' }}>
          {fields.map((f) => (
            <button key={f} aria-pressed={f === field} onClick={() => onField(f)}>
              {FIELD_META[f].label}
            </button>
          ))}
        </div>
      )}
      <div className="numpad-keys" dir="ltr">
        {['1', '2', '3'].map((k) => <Key key={k} k={k} onPress={press} />)}
        <button className="nk nk-side" onClick={() => bump(1)} aria-label={`افزایش ${meta.step}`}>
          <Plus size={18} /> <span className="num">{stepLabel}</span>
        </button>
        {['4', '5', '6'].map((k) => <Key key={k} k={k} onPress={press} />)}
        <button className="nk nk-side" onClick={() => bump(-1)} aria-label={`کاهش ${meta.step}`}>
          <Minus size={18} /> <span className="num">{stepLabel}</span>
        </button>
        {['7', '8', '9'].map((k) => <Key key={k} k={k} onPress={press} />)}
        <button
          className="nk nk-side"
          disabled={previous === null}
          onClick={() => {
            haptic.tap()
            setPending(null)
            setFresh(false)
            onChange(previous)
          }}
        >
          <History size={18} /> <span>قبلی</span>
        </button>
        <button className="nk" onClick={() => press('.')} disabled={!meta.decimals} aria-label="ممیز">
          ٫
        </button>
        <Key k="0" onPress={press} />
        <button className="nk" onClick={() => press('back')} aria-label="پاک کردن">
          <Delete size={22} />
        </button>
        <button className="nk nk-next" onClick={onNext}>
          <CornerDownLeft size={18} /> {nextLabel}
        </button>
      </div>
    </div>
  )
}

function Key({ k, onPress }: { k: string; onPress: (k: string) => void }) {
  return (
    <button className="nk num" onClick={() => onPress(k)}>
      {fa(k)}
    </button>
  )
}
