'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markAlertRead(alertId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase
    .from('health_alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/alerts')
  revalidatePath('/dashboard')
}

