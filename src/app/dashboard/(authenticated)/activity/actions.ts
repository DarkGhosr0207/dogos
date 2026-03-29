'use server'

/*
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  activity_type text not null,
  duration_minutes integer not null,
  distance_km numeric(5,2),
  intensity text default 'moderate',
  notes text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table activity_logs enable row level security;
create policy "Users can manage own activity logs"
  on activity_logs for all using (auth.uid() = user_id);
*/

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ACTIVITY_TYPES = [
  'walk',
  'run',
  'fetch_play',
  'swimming',
  'training',
  'indoor_play',
] as const

const INTENSITIES = ['easy', 'moderate', 'intense'] as const

export type LogActivityFieldErrors = Partial<
  Record<'dog_id' | 'activity_type' | 'duration_minutes' | 'intensity', string>
>

export type LogActivityResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: LogActivityFieldErrors }

export async function logActivity(formData: FormData): Promise<LogActivityResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const dogId = formData.get('dog_id')?.toString().trim() ?? ''
  const activityTypeRaw = formData.get('activity_type')?.toString().trim() ?? ''
  const durationRaw = formData.get('duration_minutes')?.toString().trim() ?? ''
  const intensityRaw = formData.get('intensity')?.toString().trim() ?? 'moderate'
  const notesRaw = formData.get('notes')?.toString().trim() ?? ''
  const distanceRaw = formData.get('distance_km')?.toString().trim() ?? ''

  const fieldErrors: LogActivityFieldErrors = {}

  if (!dogId) {
    fieldErrors.dog_id = 'Select a dog.'
  }

  if (!ACTIVITY_TYPES.includes(activityTypeRaw as (typeof ACTIVITY_TYPES)[number])) {
    fieldErrors.activity_type = 'Select a valid activity type.'
  }

  let durationMinutes = 0
  if (!durationRaw) {
    fieldErrors.duration_minutes = 'Duration is required.'
  } else {
    const n = Number.parseInt(durationRaw, 10)
    if (!Number.isFinite(n) || n < 1) {
      fieldErrors.duration_minutes = 'Enter a positive number of minutes.'
    } else {
      durationMinutes = n
    }
  }

  if (!INTENSITIES.includes(intensityRaw as (typeof INTENSITIES)[number])) {
    fieldErrors.intensity = 'Select a valid intensity.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select('id')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (dogErr) {
    return { ok: false, error: dogErr.message }
  }
  if (!dog) {
    return { ok: false, error: 'Dog not found or not yours.' }
  }

  let distanceKm: number | null = null
  if (distanceRaw) {
    const d = Number.parseFloat(distanceRaw)
    if (!Number.isFinite(d) || d < 0) {
      return { ok: false, error: 'Distance must be a non-negative number.' }
    }
    distanceKm = d
  }

  const activity_type = activityTypeRaw as (typeof ACTIVITY_TYPES)[number]
  const intensity = intensityRaw as (typeof INTENSITIES)[number]

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    dog_id: dogId,
    activity_type,
    duration_minutes: durationMinutes,
    distance_km: distanceKm,
    intensity,
    notes: notesRaw || null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/activity')
  return { ok: true }
}

export type DeleteActivityResult = { ok: true } | { ok: false; error: string }

export async function deleteActivity(id: string): Promise<DeleteActivityResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  if (!id) {
    return { ok: false, error: 'Missing activity id.' }
  }

  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/activity')
  return { ok: true }
}
