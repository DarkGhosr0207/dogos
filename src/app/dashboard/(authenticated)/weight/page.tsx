import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WeightClient, { type WeightDogOption, type WeightLogRow } from './WeightClient'

export default async function WeightPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const y = ninetyDaysAgo.getFullYear()
  const m = String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')
  const day = String(ninetyDaysAgo.getDate()).padStart(2, '0')
  const startStr = `${y}-${m}-${day}`

  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: WeightDogOption[] = (dogsData ?? []) as WeightDogOption[]

  const { data: logsData, error: logsError } = await supabase
    .from('weight_logs')
    .select('id, dog_id, weight_kg, logged_at, notes')
    .eq('user_id', user.id)
    .gte('logged_at', startStr)
    .order('logged_at', { ascending: true })

  const weightLogs: WeightLogRow[] = (logsData ?? []).map((row) => ({
    id: row.id,
    dog_id: row.dog_id,
    weight_kg: Number(row.weight_kg),
    logged_at: row.logged_at as string,
    notes: row.notes as string | null,
  }))

  return (
    <>
      {dogsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {dogsError.message}
        </div>
      ) : null}
      {logsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load weight logs: {logsError.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <WeightClient dogs={dogs} weightLogs={weightLogs} />
      </div>
    </>
  )
}
