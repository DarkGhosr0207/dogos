import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { ageLabelFromDateOfBirth } from '@/app/dashboard/dogs/dog-age'

const GREEN = '#2d7a4f'
const BG = '#f7f9f7'

type PageProps = {
  params: Promise<{ dogId: string }>
}

export default async function PublicDogProfilePage({ params }: PageProps) {
  const { dogId } = await params
  const admin = createServiceClient()

  if (!admin) {
    return (
      <div
        className="min-h-screen px-4 py-10"
        style={{ backgroundColor: BG, color: '#111827' }}
      >
        <p className="mx-auto max-w-sm text-center text-sm" style={{ color: '#6b7280' }}>
          Public profiles are not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.
        </p>
      </div>
    )
  }

  const { data: dog, error: dogError } = await admin
    .from('dogs')
    .select('id, name, breed, date_of_birth, photo_url, owner_id')
    .eq('id', dogId)
    .maybeSingle()

  if (dogError || !dog) {
    notFound()
  }

  const { data: profile } = await admin
    .from('users_profile')
    .select('phone')
    .eq('id', dog.owner_id as string)
    .maybeSingle()

  const phone = (profile as { phone?: string | null } | null)?.phone?.trim() || null
  const name = dog.name as string
  const breed = (dog.breed && String(dog.breed).trim()) || 'Breed unknown'
  const ageLabel = ageLabelFromDateOfBirth(dog.date_of_birth ?? null)
  const photoUrl = dog.photo_url as string | null
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ backgroundColor: BG, color: '#111827' }}
    >
      <div
        className="mx-auto max-w-sm rounded-2xl px-6 py-8 shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <div className="flex flex-col items-center text-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              width={120}
              height={120}
              className="h-[120px] w-[120px] rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-[120px] w-[120px] items-center justify-center rounded-full text-4xl font-bold text-white"
              style={{ backgroundColor: GREEN }}
              aria-hidden
            >
              {initial}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold" style={{ color: '#111827' }}>
            {name}
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            {breed} · {ageLabel}
          </p>
        </div>

        <p
          className="mt-6 text-center text-sm leading-relaxed"
          style={{ color: '#374151' }}
        >
          If found, please contact the owner.
        </p>

        <div
          className="mt-6 rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: GREEN }}>
            Owner contact
          </p>
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="mt-2 block text-lg font-semibold"
              style={{ color: '#14532d' }}
            >
              {phone}
            </a>
          ) : (
            <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
              No phone number on file.
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
          This dog may have medical records in DogOS
        </p>

        <p
          className="mt-6 text-center text-xs font-medium"
          style={{ color: '#9ca3af' }}
        >
          Profile powered by{' '}
          <span style={{ color: GREEN }}>DogOS</span>
        </p>
      </div>
    </div>
  )
}
