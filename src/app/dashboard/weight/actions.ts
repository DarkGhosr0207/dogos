'use server'

/*
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  logged_at date not null default current_date,
  notes text,
  created_at timestamptz default now()
);
alter table weight_logs enable row level security;
create policy "Users can manage own weight logs"
  on weight_logs for all using (auth.uid() = user_id);
*/

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type LogWeightResult = { ok: true } | { ok: false; error: string }

export async function logWeight(formData: FormData): Promise<LogWeightResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const dogId = formData.get('dog_id')?.toString().trim() ?? ''
  const weightRaw = formData.get('weight_kg')?.toString().trim() ?? ''
  const loggedAtRaw = formData.get('logged_at')?.toString().trim() ?? ''
  const notesRaw = formData.get('notes')?.toString().trim() ?? ''

  if (!dogId) {
    return { ok: false, error: 'Select a dog.' }
  }

  const w = Number.parseFloat(weightRaw)
  if (!Number.isFinite(w) || w <= 0 || w > 999.99) {
    return { ok: false, error: 'Enter a valid weight in kg (0.1–999.99).' }
  }

  let loggedAt: string
  if (loggedAtRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loggedAtRaw)) {
      return { ok: false, error: 'Invalid date.' }
    }
    loggedAt = loggedAtRaw
  } else {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    loggedAt = `${y}-${m}-${day}`
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

  const { error } = await supabase.from('weight_logs').insert({
    user_id: user.id,
    dog_id: dogId,
    weight_kg: Math.round(w * 100) / 100,
    logged_at: loggedAt,
    notes: notesRaw || null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/weight')
  return { ok: true }
}

export type DeleteWeightResult = { ok: true } | { ok: false; error: string }

export async function deleteWeight(id: string): Promise<DeleteWeightResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  if (!id) {
    return { ok: false, error: 'Missing entry id.' }
  }

  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/weight')
  return { ok: true }
}
