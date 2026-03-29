'use server'

/*
create table health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  log_date date not null default current_date,
  mood text,
  appetite text,
  energy text,
  stool text,
  notes text,
  created_at timestamptz default now(),
  unique(dog_id, log_date)
);
alter table health_logs enable row level security;
create policy "Users can manage own health logs"
  on health_logs for all using (auth.uid() = user_id);
*/

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MOODS = ['happy', 'neutral', 'sad', 'tired'] as const
const APPETITES = ['great', 'normal', 'less', 'none'] as const
const ENERGIES = ['high', 'normal', 'low', 'very_low'] as const
const STOOLS = ['normal', 'soft', 'diarrhea', 'none'] as const

function parseOptionalEnum<T extends readonly string[]>(
  raw: string,
  allowed: T
): T[number] | null {
  const t = raw.trim()
  if (!t) return null
  return (allowed as readonly string[]).includes(t) ? (t as T[number]) : null
}

export type SaveHealthLogResult =
  | { ok: true }
  | { ok: false; error: string }

export async function saveHealthLog(formData: FormData): Promise<SaveHealthLogResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const dogId = formData.get('dog_id')?.toString().trim() ?? ''
  const logDateRaw = formData.get('log_date')?.toString().trim() ?? ''
  const moodRaw = formData.get('mood')?.toString() ?? ''
  const appetiteRaw = formData.get('appetite')?.toString() ?? ''
  const energyRaw = formData.get('energy')?.toString() ?? ''
  const stoolRaw = formData.get('stool')?.toString() ?? ''
  const notesRaw = formData.get('notes')?.toString().trim() ?? ''

  if (!dogId) {
    return { ok: false, error: 'Select a dog.' }
  }

  let logDate: string
  if (logDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDateRaw)) {
      return { ok: false, error: 'Invalid date.' }
    }
    logDate = logDateRaw
  } else {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    logDate = `${y}-${m}-${day}`
  }

  const mood = parseOptionalEnum(moodRaw, MOODS)
  const appetite = parseOptionalEnum(appetiteRaw, APPETITES)
  const energy = parseOptionalEnum(energyRaw, ENERGIES)
  const stool = parseOptionalEnum(stoolRaw, STOOLS)

  if (moodRaw.trim() && mood === null) {
    return { ok: false, error: 'Invalid mood value.' }
  }
  if (appetiteRaw.trim() && appetite === null) {
    return { ok: false, error: 'Invalid appetite value.' }
  }
  if (energyRaw.trim() && energy === null) {
    return { ok: false, error: 'Invalid energy value.' }
  }
  if (stoolRaw.trim() && stool === null) {
    return { ok: false, error: 'Invalid stool value.' }
  }

  if (!mood && !appetite && !energy && !stool && !notesRaw) {
    return { ok: false, error: 'Add at least one check-in detail or a note.' }
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

  const { error } = await supabase.from('health_logs').upsert(
    {
      user_id: user.id,
      dog_id: dogId,
      log_date: logDate,
      mood,
      appetite,
      energy,
      stool,
      notes: notesRaw || null,
    },
    { onConflict: 'dog_id,log_date' }
  )

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/health')
  revalidatePath('/dashboard')
  return { ok: true }
}

export type HealthLogRow = {
  id: string
  dog_id: string
  log_date: string
  mood: string | null
  appetite: string | null
  energy: string | null
  stool: string | null
  notes: string | null
}

export type GetHealthLogsResult =
  | { ok: true; logs: HealthLogRow[] }
  | { ok: false; error: string }

export async function getHealthLogs(dogId: string): Promise<GetHealthLogsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  if (!dogId) {
    return { ok: false, error: 'Missing dog id.' }
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

  const start = new Date()
  start.setDate(start.getDate() - 30)
  const y = start.getFullYear()
  const m = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  const startStr = `${y}-${m}-${day}`

  const { data, error } = await supabase
    .from('health_logs')
    .select('id, dog_id, log_date, mood, appetite, energy, stool, notes')
    .eq('dog_id', dogId)
    .eq('user_id', user.id)
    .gte('log_date', startStr)
    .order('log_date', { ascending: false })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, logs: (data ?? []) as HealthLogRow[] }
}
