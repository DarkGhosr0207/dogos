import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/freemium'
import InsightsClient, { type InsightsDogOption } from './InsightsClient'
import InsightsUpgrade from './InsightsUpgrade'

export default async function InsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const plan = await getUserPlan(user.id)
  if (plan !== 'premium_plus') {
    return <InsightsUpgrade />
  }

  const { data: dogsData, error } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: InsightsDogOption[] = (dogsData ?? []) as InsightsDogOption[]

  return (
    <>
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <InsightsClient dogs={dogs} />
      </div>
    </>
  )
}
