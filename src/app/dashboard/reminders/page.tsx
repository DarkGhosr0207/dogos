import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RemindersClient, {
  type ReminderWithDog,
  type ReminderDogOption,
} from './RemindersClient'

export default async function RemindersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs: ReminderDogOption[] = (dogsData ?? []) as ReminderDogOption[]
  const dogNameById = new Map(dogs.map((d) => [d.id, d.name]))

  const { data: remindersData, error: remindersError } = await supabase
    .from('reminders')
    .select('id, dog_id, type, title, due_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('due_at', { ascending: true })

  const reminders: ReminderWithDog[] = (remindersData ?? []).map((row) => ({
    ...(row as Omit<ReminderWithDog, 'dog_name'>),
    dog_name: dogNameById.get(row.dog_id) ?? 'Dog',
  }))

  return (
    <>
      {dogsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {dogsError.message}
        </div>
      ) : null}
      {remindersError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load reminders: {remindersError.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <RemindersClient dogs={dogs} reminders={reminders} />
      </div>
    </>
  )
}
