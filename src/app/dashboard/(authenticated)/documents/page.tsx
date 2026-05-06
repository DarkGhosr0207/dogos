import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentsClient, { type DogDocData } from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: dog, error } = await supabase
    .from('dogs')
    .select('id, name, microchip_id, passport_number, insurance_provider, insurance_policy_number')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const docData: DogDocData | null = dog
    ? {
        id: String((dog as any).id),
        name: String((dog as any).name),
        microchip_id: (dog as any).microchip_id ? String((dog as any).microchip_id) : null,
        passport_number: (dog as any).passport_number ? String((dog as any).passport_number) : null,
        insurance_provider: (dog as any).insurance_provider
          ? String((dog as any).insurance_provider)
          : null,
        insurance_policy_number: (dog as any).insurance_policy_number
          ? String((dog as any).insurance_policy_number)
          : null,
      }
    : null

  return (
    <div className="dashboard-content" style={{ color: '#111827' }}>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not load documents: {error.message}
        </div>
      ) : null}
      <DocumentsClient initialData={docData} />
    </div>
  )
}
