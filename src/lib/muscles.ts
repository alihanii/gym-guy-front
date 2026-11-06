/** Weekly working-set bands per muscle, used to colour the balance bars. */
export const LOW_SETS = 6
export const HIGH_SETS = 20

export type Load = 'none' | 'low' | 'ok' | 'high'

export function loadOf(sets: number, scale = 1): Load {
  if (sets <= 0) return 'none'
  if (sets < LOW_SETS * scale) return 'low'
  if (sets > HIGH_SETS * scale) return 'high'
  return 'ok'
}

export const MUSCLE_ORDER = [
  'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abdominals',
  'lats', 'upper_back', 'traps', 'lower_back', 'neck',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors_adductors', 'cardio',
]

import type { Exercise, TemplateBlock } from './types'

/** Same rule as the backend: primary 1.0, secondary 0.5 per working set. */
export function heatmapOf(blocks: TemplateBlock[], bySlug: Map<string, Exercise>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const b of blocks) {
    const ex = bySlug.get(b.exercise_id)
    if (!ex) continue
    const n = b.sets.filter((s) => s.type !== 'warmup').length
    out[ex.primary_muscle] = (out[ex.primary_muscle] ?? 0) + n
    for (const m of ex.secondary_muscles) out[m] = (out[m] ?? 0) + n * 0.5
  }
  return out
}
