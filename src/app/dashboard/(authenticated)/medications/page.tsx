import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MedicationsClient, { type MedicationRow, type DogOption } from './MedicationsClient'

export default async function MedicationsPage() {
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

  const { data: medsData, error } = dogIds.length
    ? await supabase
        .from('medications')
        .select('id, dog_id, name, dosage, frequency, start_date, end_date, notes, is_active')
        .in('dog_id', dogIds)
        .order('created_at', { ascending: false })
    : { data: [] as any[], error: null }

  const medications: MedicationRow[] = (medsData ?? []).map((r: any) => ({
    id: String(r.id),
    dog_id: String(r.dog_id),
    name: String(r.name),
    dosage: r.dosage ? String(r.dosage) : null,
    frequency: r.frequency ? String(r.frequency) : null,
    start_date: r.start_date ? String(r.start_date) : null,
    end_date: r.end_date ? String(r.end_date) : null,
    notes: r.notes ? String(r.notes) : null,
    is_active: r.is_active !== false,
  }))

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not load medications: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <MedicationsClient dogs={dogs} initialMedications={medications} />
      </div>
    </>
  )
}
