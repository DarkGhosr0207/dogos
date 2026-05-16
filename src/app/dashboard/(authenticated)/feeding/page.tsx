import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/freemium'
import FeedingClient, { type FeedingLog } from './FeedingClient'

export default async function FeedingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const plan = await getUserPlan(user.id, supabase)
  if (plan !== 'premium_plus') {
    redirect('/dashboard/upgrade')
  }

  const { data: dog } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()

  const dogId = (dog as { id?: string } | null)?.id ?? null
  const dogName = (dog as { name?: string } | null)?.name ?? 'Your dog'

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  let initialLogs: FeedingLog[] = []

  if (dogId) {
    const { data: logsData } = await supabase
      .from('feeding_logs')
      .select('id, dog_id, user_id, food_name, grams, fed_at, notes')
      .eq('dog_id', dogId)
      .gte('fed_at', startOfDay.toISOString())
      .order('fed_at', { ascending: false })

    const rows = (logsData ?? []) as Array<{
      id: string
      dog_id: string
      user_id: string
      food_name: string | null
      grams: number | null
      fed_at: string
      notes: string | null
    }>

    const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
    let nameMap: Record<string, string> = {}

    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users_profile')
        .select('id, full_name')
        .in('id', uniqueUserIds)
      for (const p of (profiles as { id: string; full_name: string | null }[] | null) ?? []) {
        nameMap[p.id] = p.full_name?.trim() || 'Someone'
      }
    }

    initialLogs = rows.map((r) => ({
      ...r,
      feederName: nameMap[r.user_id] ?? 'Someone',
    }))
  }

  return (
    <FeedingClient
      dogId={dogId}
      dogName={dogName}
      userId={user.id}
      initialLogs={initialLogs}
    />
  )
}
