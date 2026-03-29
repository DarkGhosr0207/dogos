import { createClient } from '@/lib/supabase/server'
import LegalHubClient, { type LegalArticle } from './LegalHubClient'
import { getUserPlan } from '@/lib/freemium'

export default async function LegalHubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const plan = user ? await getUserPlan(user.id) : 'free'
  const isPremium = plan === 'premium'

  const { data: articlesData, error } = await supabase
    .from('legal_articles')
    .select(
      'id, country, category, title, content, law_reference, is_published, created_at'
    )
    .eq('is_published', true)
    .order('country', { ascending: true })
    .order('category', { ascending: true })

  const articles: LegalArticle[] = (articlesData ?? []) as LegalArticle[]

  return (
    <>
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load articles: {error.message}
        </div>
      ) : null}
      <div className="dashboard-content" style={{ color: '#111827' }}>
        <LegalHubClient articles={articles} isPremium={isPremium} />
      </div>
    </>
  )
}
