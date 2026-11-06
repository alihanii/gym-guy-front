import { useSyncExternalStore } from 'react'
import type { PerformedBlock, PerformedSet, Routine, SetType } from './types'

/**
 * The workout in progress lives outside React and is mirrored to
 * localStorage on every change, so a locked phone, a refresh or a crashed
 * tab in the middle of a gym session never loses logged sets.
 */

export interface LiveSet extends PerformedSet {
  key: string
  target: string // planned reps such as "8-12"; shown as a placeholder
}

export interface LiveBlock extends Omit<PerformedBlock, 'sets'> {
  key: string
  tempo: string
  target_rpe: number | null
  coach_note: string
  sets: LiveSet[]
}

export interface Rest { endsAt: number; duration: number }

export interface ActiveWorkout {
  title: string
  routineId: number | null
  programId: number | null
  startedAt: number
  blocks: LiveBlock[]
  rest: Rest | null
}

const KEY = 'gg.active-workout'
let state: ActiveWorkout | null = load()
const listeners = new Set<() => void>()

function load(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null
  } catch {
    return null
  }
}

function commit(next: ActiveWorkout | null) {
  state = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode: keep in memory only */
  }
  listeners.forEach((l) => l())
}

function update(fn: (w: ActiveWorkout) => ActiveWorkout) {
  if (state) commit(fn(state))
}

const uid = () => Math.random().toString(36).slice(2, 10)

function blankSet(type: SetType = 'normal', target = '', weight: number | null = null): LiveSet {
  return { key: uid(), type, target, weight_kg: weight, reps: null, duration_s: null, distance_m: null, rpe: null, done: false }
}

function mapBlock(key: string, fn: (b: LiveBlock) => LiveBlock) {
  update((w) => ({ ...w, blocks: w.blocks.map((b) => (b.key === key ? fn(b) : b)) }))
}

function mapSet(blockKey: string, setKey: string, fn: (s: LiveSet) => LiveSet) {
  mapBlock(blockKey, (b) => ({ ...b, sets: b.sets.map((s) => (s.key === setKey ? fn(s) : s)) }))
}

export const workout = {
  get: () => state,

  startEmpty() {
    commit({ title: 'تمرین آزاد', routineId: null, programId: null, startedAt: Date.now(), blocks: [], rest: null })
  },

  startRoutine(r: Routine) {
    commit({
      title: r.title,
      routineId: r.id,
      programId: r.program,
      startedAt: Date.now(),
      rest: null,
      blocks: r.exercises.map((ex) => ({
        key: uid(),
        exercise_id: ex.exercise_id,
        superset_group: ex.superset_group,
        rest_seconds: ex.rest_seconds ?? 90,
        notes: '',
        coach_note: ex.notes ?? '',
        tempo: ex.tempo ?? '',
        target_rpe: ex.target_rpe ?? null,
        sets: ex.sets.map((s) => blankSet(s.type, s.reps, s.weight_kg ?? null)),
      })),
    })
  },

  discard: () => commit(null),
  rename: (title: string) => update((w) => ({ ...w, title })),

  addExercises(slugs: string[]) {
    update((w) => ({
      ...w,
      blocks: [
        ...w.blocks,
        ...slugs.map((slug) => ({
          key: uid(), exercise_id: slug, superset_group: null, rest_seconds: 90, notes: '',
          coach_note: '', tempo: '', target_rpe: null, sets: [blankSet()],
        })),
      ],
    }))
  },

  removeBlock: (key: string) => update((w) => ({ ...w, blocks: w.blocks.filter((b) => b.key !== key) })),

  moveBlock(key: string, dir: -1 | 1) {
    update((w) => {
      const i = w.blocks.findIndex((b) => b.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= w.blocks.length) return w
      const blocks = [...w.blocks]
      ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
      return { ...w, blocks }
    })
  },

  setRestSeconds: (key: string, seconds: number) => mapBlock(key, (b) => ({ ...b, rest_seconds: seconds })),
  setNotes: (key: string, notes: string) => mapBlock(key, (b) => ({ ...b, notes })),

  /** Swap the movement but keep the set structure (count, types, rep targets). */
  replaceExercise: (key: string, slug: string) =>
    mapBlock(key, (b) => ({
      ...b,
      exercise_id: slug,
      sets: b.sets.map((s) => ({ ...blankSet(s.type, s.target), key: s.key })),
    })),

  /** Link this exercise with the next one (or unlink it). */
  toggleSuperset(key: string) {
    update((w) => {
      const i = w.blocks.findIndex((b) => b.key === key)
      const cur = w.blocks[i]
      const next = w.blocks[i + 1]
      if (!cur) return w
      const blocks = [...w.blocks]
      if (cur.superset_group !== null) {
        const g = cur.superset_group
        const members = blocks.filter((b) => b.superset_group === g)
        blocks[i] = { ...cur, superset_group: null }
        // a "group" of one is not a superset
        if (members.length <= 2) return { ...w, blocks: blocks.map((b) => (b.superset_group === g ? { ...b, superset_group: null } : b)) }
        return { ...w, blocks }
      }
      if (!next) return w
      const group = next.superset_group ?? Math.max(0, ...blocks.map((b) => b.superset_group ?? 0)) + 1
      blocks[i] = { ...cur, superset_group: group }
      blocks[i + 1] = { ...next, superset_group: group }
      return { ...w, blocks }
    })
  },

  addSet(blockKey: string) {
    mapBlock(blockKey, (b) => {
      const last = b.sets[b.sets.length - 1]
      const s = blankSet(last?.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'), last?.target ?? '', last?.weight_kg ?? null)
      return { ...b, sets: [...b.sets, s] }
    })
  },

  removeSet: (blockKey: string, setKey: string) =>
    mapBlock(blockKey, (b) => ({ ...b, sets: b.sets.filter((s) => s.key !== setKey) })),

  setType: (blockKey: string, setKey: string, type: SetType) => mapSet(blockKey, setKey, (s) => ({ ...s, type })),

  setField(blockKey: string, setKey: string, field: keyof PerformedSet, value: number | null) {
    mapSet(blockKey, setKey, (s) => ({ ...s, [field]: value }))
  },

  /** Returns true when the set became done (so callers can start the rest timer). */
  toggleDone(blockKey: string, setKey: string): boolean {
    let nowDone = false
    mapSet(blockKey, setKey, (s) => {
      nowDone = !s.done
      return { ...s, done: nowDone }
    })
    return nowDone
  },

  startRest(seconds: number) {
    if (seconds <= 0) return
    update((w) => ({ ...w, rest: { endsAt: Date.now() + seconds * 1000, duration: seconds } }))
  },
  adjustRest(delta: number) {
    update((w) =>
      w.rest ? { ...w, rest: { endsAt: w.rest.endsAt + delta * 1000, duration: Math.max(1, w.rest.duration + delta) } } : w,
    )
  },
  clearRest: () => update((w) => ({ ...w, rest: null })),
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useActiveWorkout() {
  return useSyncExternalStore(subscribe, () => state)
}

/** Payload for POST /workouts/. */
export function toPayload(w: ActiveWorkout) {
  return {
    title: w.title,
    routine: w.routineId,
    program: w.programId,
    started_at: new Date(w.startedAt).toISOString(),
    duration_seconds: Math.round((Date.now() - w.startedAt) / 1000),
    exercises: w.blocks.map((b) => ({
      exercise_id: b.exercise_id,
      superset_group: b.superset_group,
      rest_seconds: b.rest_seconds,
      notes: b.notes,
      sets: b.sets.map(({ type, weight_kg, reps, duration_s, distance_m, rpe, done }) => ({
        type, weight_kg, reps, duration_s, distance_m, rpe, done,
      })),
    })),
  }
}

export const SUPERSET_LETTERS = 'ABCDEFGH'
