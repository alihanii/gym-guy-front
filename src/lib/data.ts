import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Exercise, Taxonomy } from './types'

export function useExercises() {
  const q = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api<Exercise[]>('/exercises/'),
    staleTime: 10 * 60_000,
  })
  const bySlug = useMemo(() => new Map((q.data ?? []).map((e) => [e.slug, e])), [q.data])
  return { ...q, list: q.data ?? [], bySlug }
}

export function useTaxonomy() {
  const q = useQuery({
    queryKey: ['taxonomy'],
    queryFn: () => api<Taxonomy>('/exercises/taxonomy/'),
    staleTime: Infinity,
  })
  // Muscle and injury slugs overlap ("lower_back", "neck"), so injuries get their own map.
  const { labels, injuries } = useMemo(() => {
    const d = q.data
    const labels = new Map<string, string>()
    for (const group of [d?.equipment, d?.muscles, d?.tracking_types]) for (const o of group ?? []) labels.set(o.value, o.label)
    return { labels, injuries: new Map((d?.injury_tags ?? []).map((o) => [o.value, o.label])) }
  }, [q.data])
  return { ...q, label: (v: string) => labels.get(v) ?? v, injury: (v: string) => injuries.get(v) ?? v }
}
