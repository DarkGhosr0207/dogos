import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VetVisitsClient, { type VetVisitRow, type DogOption } from './VetVisitsClient'

export default async function VetVisitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: dogsData } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: DogOption[] = (dogsData ?? []).map((d) => ({
    id: String(d.id),
    name: String((d as any).name),
  }))
  const dogIds = dogs.map((d) => d.id)

  const { data: visitsData, error } = dogIds.length
    ? await supabase
        .from('vet_visits')
        .select('id, dog_id, visit_date, clinic_name, reason, notes, next_visit_date')
        .in('dog_id', dogIds)
        .order('visit_date', { ascending: false })
    : { data: [] as any[], error: null }

  const visits: VetVisitRow[] = (visitsData ?? []).map((r: any) => ({
    id: String(r.id),
    dog_id: String(r.dog_id),
    visit_date: r.visit_date ? String(r.visit_date) : null,
    clinic_name: r.clinic_name ? String(r.clinic_name) : null,
    reason: r.reason ? String(r.reason) : null,
    notes: r.notes ? String(r.notes) : null,
    next_visit_date: r.next_visit_date ? String(r.next_visit_date) : null,
  }))

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not load visits: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <VetVisitsClient dogs={dogs} initialVisits={visits} />
      </div>
    </>
  )
}
