'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const REMINDER_TYPES = ['vaccine', 'medication', 'vet_visit', 'other'] as const

export type CreateReminderFieldErrors = Partial<
  Record<'dog_id' | 'type' | 'title' | 'due_at', string>
>

export type CreateReminderResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: CreateReminderFieldErrors }

export async function createReminder(
  formData: FormData
): Promise<CreateReminderResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const dogId = formData.get('dog_id')?.toString().trim() ?? ''
  const typeRaw = formData.get('type')?.toString().trim() ?? ''
  const title = formData.get('title')?.toString().trim() ?? ''
  const dueAtRaw = formData.get('due_at')?.toString().trim() ?? ''

  const fieldErrors: CreateReminderFieldErrors = {}

  if (!dogId) {
    fieldErrors.dog_id = 'Select a dog.'
  }

  if (!REMINDER_TYPES.includes(typeRaw as (typeof REMINDER_TYPES)[number])) {
    fieldErrors.type = 'Select a valid reminder type.'
  }

  if (!title) {
    fieldErrors.title = 'Title is required.'
  }

  let dueAt: string | null = null
  if (!dueAtRaw) {
    fieldErrors.due_at = 'Due date is required.'
  } else {
    const parsed = new Date(dueAtRaw)
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.due_at = 'Enter a valid date and time.'
    } else {
      dueAt = parsed.toISOString()
    }
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

  const type = typeRaw as (typeof REMINDER_TYPES)[number]

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    dog_id: dogId,
    type,
    title,
    due_at: dueAt!,
    is_active: true,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/reminders')
  return { ok: true }
}

export type DeleteReminderResult = { ok: true } | { ok: false; error: string }

export async function deleteReminder(id: string): Promise<DeleteReminderResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  if (!id) {
    return { ok: false, error: 'Missing reminder id.' }
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/reminders')
  return { ok: true }
}
