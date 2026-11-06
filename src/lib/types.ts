export type Role = 'athlete' | 'coach' | 'both'
export type SetType = 'warmup' | 'normal' | 'dropset' | 'failure'
export type TrackingType =
  | 'weight_reps' | 'bodyweight_reps' | 'assisted_bodyweight' | 'duration'
  | 'duration_weight' | 'distance_duration' | 'weight_distance' | 'reps_only'

export interface User {
  id: number
  phone: string
  name: string
  role: Role
  is_coach: boolean
  unit: 'kg' | 'lb'
  is_private: boolean
}

export interface Exercise {
  id: number
  slug: string
  title_en: string
  title_fa: string
  persian_aliases: string[]
  equipment: string
  tracking_type: TrackingType
  primary_muscle: string
  secondary_muscles: string[]
  injury_warnings: string[]
  thumbnail_url: string | null
  image_end_url: string | null
  instructions: string[]
  level: string
  source: string
  is_custom: boolean
  /** false: kept for old workouts but hidden from the bank and the picker */
  listed: boolean
}

export interface Option { value: string; label: string }
export interface Taxonomy {
  equipment: Option[]
  muscles: Option[]
  tracking_types: Option[]
  injury_tags: Option[]
}

/** A planned exercise inside a routine or a coach's program day. */
export interface TemplateSet { type: SetType; reps: string; weight_kg?: number | null; duration_s?: number | null }
export interface TemplateBlock {
  exercise_id: string
  superset_group: number | null
  rest_seconds: number
  tempo: string
  target_rpe: number | null
  notes: string
  sets: TemplateSet[]
}
export interface ProgramDay { title: string; exercises: TemplateBlock[] }

export interface Routine {
  id: number
  title: string
  folder: string
  exercises: TemplateBlock[]
  program: number | null
  program_title: string | null
  coach_name: string | null
  day_index: number
  updated_at: string
}

export interface PerformedSet {
  type: SetType
  weight_kg: number | null
  reps: number | null
  duration_s: number | null
  distance_m: number | null
  rpe: number | null
  done: boolean
}
export interface PerformedBlock {
  exercise_id: string
  superset_group: number | null
  rest_seconds: number
  notes: string
  sets: PerformedSet[]
}

export interface RecordHit { exercise_id: string; kind: 'est_1rm' | 'max_weight' | 'max_volume' | 'max_reps'; value: number; previous: number }

export interface WorkoutLog {
  id: number
  title: string
  program: number | null
  routine: number | null
  started_at: string
  duration_seconds: number
  exercises: PerformedBlock[]
  actual_heatmap: Record<string, number>
  total_volume_kg: number
  total_sets: number
  records: RecordHit[]
  notes: string
  coach_feedback: string
  completed_at: string
}

export interface Client {
  id: number
  name: string
  age: number | null
  height_cm: number | null
  weight_kg: string | null
  experience_months: number | null
  goal: 'fat_loss' | 'hypertrophy' | 'strength' | 'fitness'
  days_per_week: number
  injury_tags: string[]
  notes: string
  athlete: number | null
  athlete_name: string | null
  active_program: { id: number; title: string; status: ProgramStatus; invite_code: string | null } | null
  created_at: string
}

export type ProgramStatus = 'draft' | 'pending_invite' | 'active' | 'archived'

export interface Program {
  id: number
  title: string
  client: number | null
  client_name: string | null
  athlete_name: string | null
  status: ProgramStatus
  invite_code: string | null
  invite_link: string | null
  injury_tags: string[]
  workouts: { days: ProgramDay[] }
  planned_heatmap: Record<string, number>
  injury_conflicts: { day: number; index: number; exercise_id: string; title_fa: string; tags: string[] }[]
  updated_at: string
}

export interface PublicUser { id: number; name: string; is_coach: boolean; is_me: boolean }
export interface FeedCard {
  id: number
  title: string
  notes: string
  started_at: string
  duration_seconds: number
  total_volume_kg: number
  total_sets: number
  records: number
  exercises: { exercise_id: string; sets: number; best: { weight_kg: number | null; reps: number | null; duration_s: number | null; distance_m: number | null } }[]
  user: PublicUser
  like_count: number
  liked: boolean
  comment_count: number
}
export interface FeedPage { results: FeedCard[]; next: number | null }
export interface SocialComment { id: number; text: string; created_at: string; user: PublicUser; can_delete: boolean }
