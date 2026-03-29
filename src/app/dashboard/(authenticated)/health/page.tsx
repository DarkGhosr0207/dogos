import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HealthLogClient, { type HealthDogOption, type HealthLogRow } from './HealthLogClient'

export default async function HealthPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const y = thirtyDaysAgo.getFullYear()
  const m = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')
  const day = String(thirtyDaysAgo.getDate()).padStart(2, '0')
  const startStr = `${y}-${m}-${day}`

  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: HealthDogOption[] = (dogsData ?? []) as HealthDogOption[]

  const { data: logsData, error: logsError } = await supabase
    .from('health_logs')
    .select('id, dog_id, log_date, mood, appetite, energy, stool, notes')
    .eq('user_id', user.id)
    .gte('log_date', startStr)
    .order('log_date', { ascending: false })

  const healthLogs: HealthLogRow[] = (logsData ?? []) as HealthLogRow[]

  return (
    <>
      {dogsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {dogsError.message}
        </div>
      ) : null}
      {logsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load health logs: {logsError.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <HealthLogClient dogs={dogs} healthLogs={healthLogs} />
      </div>
    </>
  )
}
