import { useEffect, useState } from 'react'

/** Keeps an element mounted for `ms` after `open` turns false, so it can play its exit animation. */
export function usePresence(open: boolean, ms = 200) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(t)
  }, [open, ms])
  return { mounted: open || mounted, closing: !open && mounted }
}
