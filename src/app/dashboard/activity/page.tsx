import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityClient, {
  type ActivityDogOption,
  type ActivityLogRow,
} from './ActivityClient'

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: ActivityDogOption[] = (dogsData ?? []) as ActivityDogOption[]
  const dogNameById = new Map(dogs.map((d) => [d.id, d.name]))

  const { data: logsData, error: logsError } = await supabase
    .from('activity_logs')
    .select(
      'id, dog_id, activity_type, duration_minutes, distance_km, intensity, notes, logged_at'
    )
    .eq('user_id', user.id)
    .gte('logged_at', thirtyDaysAgo.toISOString())
    .order('logged_at', { ascending: false })

  const activities: ActivityLogRow[] = (logsData ?? []).map((row) => ({
    ...(row as Omit<ActivityLogRow, 'dog_name'>),
    dog_name: dogNameById.get(row.dog_id) ?? 'Dog',
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
          Could not load activities: {logsError.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <ActivityClient dogs={dogs} activities={activities} />
      </div>
    </>
  )
}
