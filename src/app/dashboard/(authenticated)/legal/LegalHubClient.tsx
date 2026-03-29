'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { inputClass } from '@/lib/ui'

export type LegalArticle = {
  id: string
  country: string
  category: string
  title: string
  content: string
  law_reference: string | null
  is_published: boolean
  created_at: string
}

const COUNTRIES = ['All', 'DE', 'ES', 'UK', 'EU'] as const
const CATEGORIES = [
  { value: 'All', label: 'All' },
  { value: 'travel', label: 'Travel' },
  { value: 'rental', label: 'Rental' },
  { value: 'liability', label: 'Liability' },
  { value: 'breed_laws', label: 'Breed laws' },
  { value: 'tax', label: 'Tax' },
] as const

function categoryLabel(category: string): string {
  const row = CATEGORIES.find((c) => c.value === category && c.value !== 'All')
  return row?.label ?? category
}

function excerpt(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function countryBadgeClass(country: string): string {
  switch (country) {
    case 'DE':
      return 'rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs text-yellow-700'
    case 'ES':
      return 'rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs text-red-600'
    case 'UK':
      return 'rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600'
    case 'EU':
      return 'rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs text-purple-600'
    default:
      return 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'
  }
}

const categoryPillClass =
  'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600'

const filterPillDefault =
  'cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 transition-colors hover:border-[#2d7a4f] hover:text-[#2d7a4f]'
const filterPillActive =
  'cursor-pointer rounded-full border border-[#2d7a4f] bg-[#e8f5ed] px-3 py-1.5 text-sm font-medium text-[#2d7a4f]'

const primaryBtn =
  'rounded-xl bg-[#2d7a4f] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#236040] disabled:opacity-50'

const articleCardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
  cursor: 'pointer',
}

const articleTitleStyle: CSSProperties = {
  color: '#111827',
  fontWeight: 600,
  fontSize: '15px',
}

const articlePreviewStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  marginTop: '8px',
}

const filterLabelStyle: CSSProperties = {
  color: '#374151',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const pageTitleStyle: CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 700,
}

const pageSubtitleStyle: CSSProperties = {
  color: '#6b7280',
}

type LegalHubClientProps = {
  articles: LegalArticle[]
  isPremium: boolean
}

const upgradeCardStyle: CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '16px',
  padding: '24px',
  textAlign: 'center',
  marginTop: '16px',
}

const upgradeTitleStyle: CSSProperties = {
  color: '#166534',
  fontWeight: 700,
  fontSize: '18px',
}

const upgradeSubStyle: CSSProperties = {
  color: '#15803d',
  marginTop: '8px',
}

const upgradeBtnStyle: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  marginTop: '14px',
}

export default function LegalHubClient({
  articles,
  isPremium,
}: LegalHubClientProps) {
  const [countryFilter, setCountryFilter] =
    useState<(typeof COUNTRIES)[number]>('All')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [selected, setSelected] = useState<LegalArticle | null>(null)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (countryFilter !== 'All' && a.country !== countryFilter) return false
      if (categoryFilter !== 'All' && a.category !== categoryFilter)
        return false
      return true
    })
  }, [articles, countryFilter, categoryFilter])

  async function askAi() {
    if (!selected) return
    const q = aiQuestion.trim()
    if (!q) {
      setAiError('Enter a question.')
      return
    }
    setAiError(null)
    setAiAnswer(null)
    setAiLoading(true)
    try {
      const res = await fetch('/api/legal/ask', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          country: selected.country,
          articleContent: selected.content,
        }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `Request failed (${res.status})`
        setAiError(msg)
        return
      }
      if (
        data &&
        typeof data === 'object' &&
        'answer' in data &&
        typeof (data as { answer: unknown }).answer === 'string'
      ) {
        setAiAnswer((data as { answer: string }).answer)
      } else {
        setAiError('Unexpected response.')
      }
    } catch {
      setAiError('Network error. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if (selected) {
    const preview = selected.content.slice(0, 150)
    return (
      <div style={{ color: '#111827' }}>
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            setAiQuestion('')
            setAiAnswer(null)
            setAiError(null)
          }}
          className="mb-6 flex items-center gap-1 text-sm text-[#2d7a4f] transition-colors hover:text-[#236040]"
        >
          ← Back to articles
        </button>

        <div className="max-w-3xl space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className={countryBadgeClass(selected.country)}>
              {selected.country}
            </span>
            <span className={categoryPillClass}>
              {categoryLabel(selected.category)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {selected.title}
          </h1>
          {!isPremium ? (
            <div className="relative">
              <div className="max-w-none text-base leading-relaxed text-gray-600">
                <p className="mb-5 last:mb-0">{preview}…</p>
              </div>
              <div
                className="absolute inset-0"
                style={{
                  backdropFilter: 'blur(6px)',
                  background:
                    'linear-gradient(to bottom, rgba(247,249,247,0) 0%, rgba(247,249,247,0.9) 45%, rgba(247,249,247,1) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                }}
              >
                <div style={upgradeCardStyle}>
                  <p style={upgradeTitleStyle}>Premium feature</p>
                  <p style={upgradeSubStyle}>
                    Full Legal Hub articles and AI Q&amp;A are available on
                    Premium.
                  </p>
                  <button type="button" style={upgradeBtnStyle}>
                    Upgrade to Premium →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-none text-base leading-relaxed text-gray-600">
              {selected.content.split(/\n\n+/).map((para, i) => (
                <p key={i} className="mb-5 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          )}
          {selected.law_reference ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Law reference
              </p>
              <code className="inline-block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
                {selected.law_reference}
              </code>
            </div>
          ) : null}

          {isPremium ? (
            <div className="mt-6 rounded-2xl border border-[#e8ede8] bg-[#f7f9f7] p-5">
              <h2 className="text-sm font-semibold text-gray-900">
                Ask AI about this article
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Answers are based on this article only. Not legal advice.
              </p>
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                rows={3}
                placeholder="e.g. Does this apply if I move to another Bundesland?"
                className={`mt-4 ${inputClass}`}
              />
              {aiError ? (
                <p className="mt-2 text-sm text-red-500" role="alert">
                  {aiError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void askAi()}
                disabled={aiLoading}
                className={`mt-4 ${primaryBtn}`}
              >
                {aiLoading ? 'Thinking…' : 'Ask AI'}
              </button>
              {aiAnswer ? (
                <div className="mt-3 rounded-xl border border-[#e8ede8] bg-white p-4 text-sm text-gray-700">
                  {aiAnswer}
                </div>
              ) : null}
              <p className="mt-4 text-xs text-gray-400">
                This is not legal advice. Consult a qualified lawyer for your
                situation.
              </p>
            </div>
          ) : (
            <div style={upgradeCardStyle}>
              <p style={upgradeTitleStyle}>Premium feature</p>
              <p style={upgradeSubStyle}>
                Upgrade to Premium to unlock AI Q&amp;A for Legal Hub.
              </p>
              <button type="button" style={upgradeBtnStyle}>
                Upgrade to Premium →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ color: '#111827' }}>
      <h1 style={pageTitleStyle}>Legal Hub</h1>
      <p className="mt-1 max-w-2xl text-sm" style={pageSubtitleStyle}>
        Country guides and obligations for dog owners—always verify with a
        lawyer.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1" style={filterLabelStyle}>
          Country
        </span>
        {COUNTRIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCountryFilter(c)}
            className={
              countryFilter === c ? filterPillActive : filterPillDefault
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1" style={filterLabelStyle}>
          Category
        </span>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategoryFilter(c.value)}
            className={
              categoryFilter === c.value ? filterPillActive : filterPillDefault
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500 shadow-sm">
          No articles match your filters.
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelected(a)}
                className="flex h-full w-full flex-col text-left shadow-sm transition-all hover:opacity-95"
                style={articleCardStyle}
              >
                <div className="flex flex-wrap gap-2">
                  <span className={countryBadgeClass(a.country)}>
                    {a.country}
                  </span>
                  <span className={categoryPillClass}>
                    {categoryLabel(a.category)}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-3" style={articleTitleStyle}>
                  {a.title}
                </h2>
                <p className="line-clamp-4 flex-1" style={articlePreviewStyle}>
                  {excerpt(a.content, 100)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
