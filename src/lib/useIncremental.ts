import { useEffect, useRef, useState } from 'react'

/**
 * Render a long list in pages: the first `step` items, then another page
 * whenever the sentinel scrolls into view. Resets when the list changes.
 */
export function useIncremental<T>(items: T[], step = 60) {
  const [count, setCount] = useState(step)
  const sentinel = useRef<HTMLDivElement | null>(null)

  useEffect(() => setCount(step), [items, step])

  useEffect(() => {
    const el = sentinel.current
    if (!el || count >= items.length) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setCount((c) => c + step)
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [count, items.length, step])

  return { visible: items.slice(0, count), sentinel, more: count < items.length }
}
