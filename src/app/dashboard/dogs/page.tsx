import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddDogTrigger from './add-dog-trigger'
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
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Dogs</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Your dogs and basic profile details.
          </p>
        </div>
        <AddDogTrigger />
      </div>

      {error ? (
        <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Could not load dogs: {error.message}
        </p>
      ) : list.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-white/15 bg-neutral-900/40 px-6 py-16 text-center">
          <p className="text-neutral-400">No dogs yet. Add your first dog!</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((dog) => (
            <li
              key={dog.id}
              className="rounded-xl border border-white/10 bg-neutral-900/50 p-5"
            >
              <h2 className="text-lg font-semibold text-white">{dog.name}</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Breed</dt>
                  <dd className="text-neutral-200 text-right">
                    {dog.breed?.trim() ? dog.breed : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Age</dt>
                  <dd className="text-neutral-200 text-right">
                    {ageLabelFromDateOfBirth(dog.date_of_birth)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
