import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SymptomsChecker, { type SymptomDogOption } from './SymptomsChecker'

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

  return (
    <>
      {error ? (
        <div className="border-b border-red-500/20 bg-red-950/30 px-6 py-3 text-sm text-red-300">
          Could not load dogs: {error.message}
        </div>
      ) : null}
      <SymptomsChecker dogs={dogs} />
    </>
  )
}
