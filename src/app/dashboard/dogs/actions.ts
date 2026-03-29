'use server'

/*
SQL (Supabase Storage bucket, public):
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-photos', 'dog-photos', true);
*/

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CreateDogFieldErrors = Partial<
  Record<'name' | 'breed' | 'date_of_birth' | 'sex' | 'weight_kg' | 'microchip_id', string>
>

export type CreateDogResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: CreateDogFieldErrors }

export async function createDog(formData: FormData): Promise<CreateDogResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const name = formData.get('name')?.toString().trim() ?? ''
  const breed = formData.get('breed')?.toString().trim() ?? ''
  const dateOfBirth = formData.get('date_of_birth')?.toString().trim() ?? ''
  const sexRaw = formData.get('sex')?.toString() ?? ''
  const weightRaw = formData.get('weight_kg')?.toString().trim() ?? ''
  const microchipId = formData.get('microchip_id')?.toString().trim() ?? ''

  const fieldErrors: CreateDogFieldErrors = {}

  if (!name) {
    fieldErrors.name = 'Name is required.'
  }

  let sex: string | null = null
  if (sexRaw === 'male' || sexRaw === 'female') {
    sex = sexRaw
  } else if (sexRaw !== '') {
    fieldErrors.sex = 'Select male or female.'
  }

  let weightKg: number | null = null
  if (weightRaw) {
    const n = Number(weightRaw)
    if (Number.isNaN(n) || n < 0) {
      fieldErrors.weight_kg = 'Enter a valid weight in kg.'
    } else {
      weightKg = n
    }
  }

  let dob: string | null = null
  if (dateOfBirth) {
    const parsed = new Date(`${dateOfBirth}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.date_of_birth = 'Enter a valid date.'
    } else {
      dob = dateOfBirth
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  const { error } = await supabase.from('dogs').insert({
    owner_id: user.id,
    name,
    breed: breed || null,
    date_of_birth: dob,
    sex,
    weight_kg: weightKg,
    microchip_id: microchipId || null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/dogs')
  return { ok: true }
}

export type DeleteDogResult = { ok: true } | { ok: false; error: string }

export async function deleteDog(id: string): Promise<DeleteDogResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  if (!id) {
    return { ok: false, error: 'Missing dog id.' }
  }

  const { error } = await supabase
    .from('dogs')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/dogs')
  return { ok: true }
}

export type UploadDogPhotoResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function uploadDogPhoto(
  dogId: string,
  file: File
): Promise<UploadDogPhotoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const id = dogId.trim()
  if (!id) {
    return { success: false, error: 'Missing dog id.' }
  }

  if (!file) {
    return { success: false, error: 'Missing file.' }
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'File must be an image.' }
  }

  // Ensure the dog belongs to the user before allowing upload.
  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (dogErr) {
    return { success: false, error: dogErr.message }
  }
  if (!dog) {
    return { success: false, error: 'Dog not found or not yours.' }
  }

  const path = `${user.id}/${id}.jpg`

  const { error: uploadErr } = await supabase.storage
    .from('dog-photos')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })

  if (uploadErr) {
    return { success: false, error: uploadErr.message }
  }

  const { data: publicUrl } = supabase.storage
    .from('dog-photos')
    .getPublicUrl(path)

  const url = publicUrl.publicUrl

  const { error: updateErr } = await supabase
    .from('dogs')
    .update({ photo_url: url })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/dashboard/dogs')
  return { success: true, url }
}
