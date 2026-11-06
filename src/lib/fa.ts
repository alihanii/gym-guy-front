const FA = '۰۱۲۳۴۵۶۷۸۹'

/** Render Latin digits as Persian digits (and "." as the Persian decimal sign). */
export function fa(value: number | string | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || value === '') return ''
  let s = typeof value === 'number' ? (decimals !== undefined ? value.toFixed(decimals) : String(+value.toFixed(2))) : value
  s = s.replace(/\B(?=(?:\d{3})+(?!\d))/g, (m, offset: number, str: string) => {
    // add thousands separators only in the integer part
    const dot = str.indexOf('.')
    return dot === -1 || offset < dot ? '٬' + m : m
  })
  const out = s.replace(/\d/g, (d) => FA[+d]).replace('.', '٫')
  // Ranges and tempos ("8-12", "3-1-1-0") must keep left-to-right order inside RTL text.
  return /\d-\d/.test(s) ? `\u2066${out}\u2069` : out
}

export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return fa(h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`)
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
}

export function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'امروز'
  if (days === 1) return 'دیروز'
  return `${fa(days)} روز پیش`
}
