import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddDogTrigger from './add-dog-trigger'
import DogCard from './dog-card'
import { ageLabelFromDateOfBirth } from './dog-age'

export type DogRow = {
  id: string
  name: string
  breed: string | null
  date_of_birth: string | null
}

export default async function DogsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: dogs, error } = await supabase
    .from('dogs')
    .select('id, name, breed, date_of_birth')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const list: DogRow[] = dogs ?? []

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
            My Dogs
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
            Your dogs and basic profile details.
          </p>
        </div>
        <AddDogTrigger />
      </div>

      {error ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not load dogs: {error.message}
        </p>
      ) : list.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-gray-500">No dogs yet. Add your first dog!</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              ageLabel={ageLabelFromDateOfBirth(dog.date_of_birth)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
