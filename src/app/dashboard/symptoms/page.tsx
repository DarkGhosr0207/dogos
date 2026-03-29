import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SymptomsChecker, { type SymptomDogOption } from './SymptomsChecker'
import { checkSymptomLimit, getUserPlan } from '@/lib/freemium'

export default async function SymptomsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: dogsData, error } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: SymptomDogOption[] = (dogsData ?? []) as SymptomDogOption[]

  const [plan, limitInfo] = await Promise.all([
    getUserPlan(user.id),
    checkSymptomLimit(user.id),
  ])
  const isPremium = plan === 'premium'
  const limit = isPremium ? 999 : 1
  const used = isPremium ? 0 : limitInfo.used

  return (
    <>
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <SymptomsChecker
          dogs={dogs}
          initialUsed={used}
          limit={limit}
          isPremium={isPremium}
        />
      </div>
    </>
  )
}
