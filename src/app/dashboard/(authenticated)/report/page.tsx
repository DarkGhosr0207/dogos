import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/freemium'
import ReportClient, { type ReportDogOption } from './ReportClient'
import ReportUpgrade from './ReportUpgrade'

export default async function ReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const plan = await getUserPlan(user.id)
  if (plan !== 'premium_plus') {
    return <ReportUpgrade />
  }

  const { data: dogsData, error } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: ReportDogOption[] = (dogsData ?? []) as ReportDogOption[]

  return (
    <>
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <ReportClient dogs={dogs} />
      </div>
    </>
  )
}
