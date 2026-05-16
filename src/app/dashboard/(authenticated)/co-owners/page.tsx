import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/freemium'
import CoOwnersClient, { type CoOwner } from './CoOwnersClient'

export default async function CoOwnersPage() {
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

  let initialMembers: CoOwner[] = []

  if (dogId) {
    const { data: membersData } = await supabase
      .from('dog_members')
      .select('id, invite_email, role, accepted_at, user_id')
      .eq('dog_id', dogId)
      .order('accepted_at', { ascending: true, nullsFirst: false })

    const rows = (membersData ?? []) as Array<{
      id: string
      invite_email: string
      role: string
      accepted_at: string | null
      user_id: string | null
    }>

    const acceptedIds = rows.map((r) => r.user_id).filter((id): id is string => id !== null)
    let nameMap: Record<string, string> = {}

    if (acceptedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users_profile')
        .select('id, full_name')
        .in('id', acceptedIds)
      for (const p of (profiles as { id: string; full_name: string | null }[] | null) ?? []) {
        nameMap[p.id] = p.full_name?.trim() || p.id
      }
    }

    initialMembers = rows.map((r) => ({
      ...r,
      displayName: r.user_id ? (nameMap[r.user_id] ?? r.invite_email) : r.invite_email,
    }))
  }

  return (
    <CoOwnersClient
      dogId={dogId}
      dogName={dogName}
      initialMembers={initialMembers}
    />
  )
}
