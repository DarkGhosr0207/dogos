'use client'

import { useMemo, useState } from 'react'

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

type LegalHubClientProps = {
  articles: LegalArticle[]
}

export default function LegalHubClient({ articles }: LegalHubClientProps) {
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
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            setAiQuestion('')
            setAiAnswer(null)
            setAiError(null)
          }}
          className="mb-6 text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Back to articles
        </button>

        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-neutral-800/80 px-2.5 py-0.5 text-xs font-medium text-neutral-200">
              {selected.country}
            </span>
            <span className="rounded-full border border-white/15 bg-neutral-800/80 px-2.5 py-0.5 text-xs font-medium text-neutral-300">
              {categoryLabel(selected.category)}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {selected.title}
          </h1>
          <div className="max-w-none text-sm leading-relaxed text-neutral-300">
            {selected.content.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-4 last:mb-0">
                {para}
              </p>
            ))}
          </div>
          {selected.law_reference ? (
            <p className="text-xs text-neutral-500">
              <span className="font-medium text-neutral-400">Reference: </span>
              {selected.law_reference}
            </p>
          ) : null}

          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/50 p-5">
            <h2 className="text-sm font-semibold text-white">Ask AI about this article</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Answers are based on this article only. Not legal advice.
            </p>
            <textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. Does this apply if I move to another Bundesland?"
              className="mt-3 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {aiError ? (
              <p className="mt-2 text-sm text-red-400" role="alert">
                {aiError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void askAi()}
              disabled={aiLoading}
              className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
            >
              {aiLoading ? 'Thinking…' : 'Ask AI'}
            </button>
            {aiAnswer ? (
              <div className="mt-4 rounded-lg border border-white/10 bg-neutral-950/40 p-4 text-sm text-neutral-200">
                {aiAnswer}
              </div>
            ) : null}
            <p className="mt-4 text-xs text-neutral-500">
              This is not legal advice. Consult a qualified lawyer for your situation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Legal Hub</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-400">
        Country guides and obligations for dog owners—always verify with a lawyer.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Country
        </span>
        {COUNTRIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCountryFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              countryFilter === c
                ? 'border-white/25 bg-white/15 text-white'
                : 'border-white/10 bg-neutral-950/40 text-neutral-400 hover:border-white/15 hover:text-neutral-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Category
        </span>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategoryFilter(c.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === c.value
                ? 'border-white/25 bg-white/15 text-white'
                : 'border-white/10 bg-neutral-950/40 text-neutral-400 hover:border-white/15 hover:text-neutral-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-white/15 bg-neutral-900/40 px-6 py-16 text-center text-neutral-400">
          No articles match your filters.
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelected(a)}
                className="flex h-full w-full flex-col rounded-xl border border-white/10 bg-neutral-900/50 p-5 text-left transition-colors hover:border-white/20 hover:bg-neutral-900/80"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-neutral-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300">
                    {a.country}
                  </span>
                  <span className="rounded-full border border-white/10 bg-neutral-950/40 px-2 py-0.5 text-[10px] text-neutral-400">
                    {categoryLabel(a.category)}
                  </span>
                </div>
                <h2 className="mt-3 text-base font-semibold text-neutral-50">
                  {a.title}
                </h2>
                <p className="mt-2 line-clamp-4 flex-1 text-sm text-neutral-400">
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
