import { useNavigate } from 'react-router-dom'
import { useConfirm } from '../components/Confirm'
import type { Routine } from './types'
import { useActiveWorkout, workout } from './workout'

/** Start a routine (or an empty workout), asking first if another session is still running. */
export function useStartWorkout() {
  const active = useActiveWorkout()
  const confirm = useConfirm()
  const nav = useNavigate()
  return async (r?: Routine) => {
    if (active && !(await confirm({
      title: 'یک تمرین در جریان است',
      body: 'تمرین فعلی کنار گذاشته می‌شود و تمرین تازه شروع می‌شود.',
      confirm: 'شروع تمرین تازه',
      danger: true,
    }))) return
    if (r) workout.startRoutine(r)
    else workout.startEmpty()
    nav('/workout')
  }
}
