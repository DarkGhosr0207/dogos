'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'

export type InsightsDogOption = {
  id: string
  name: string
}

type InsightsData = {
  overall_score: number
  overall_summary: string
  insights: Array<{
    category: string
    title: string
    finding: string
    recommendation: string
    priority: string
  }>
  vet_recommendation: string
  positive_highlights: string[]
}

const GREEN = '#2d7a4f'

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const subStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
}

function categoryBadgeStyle(category: string): CSSProperties {
  const base: CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '999px',
    textTransform: 'lowercase',
  }
  switch (category) {
    case 'weight':
      return { ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' }
    case 'activity':
      return { ...base, backgroundColor: '#dcfce7', color: '#166534' }
    case 'health':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    case 'nutrition':
      return { ...base, backgroundColor: '#ffedd5', color: '#c2410c' }
    default:
      return { ...base, backgroundColor: '#f3f4f6', color: '#374151' }
  }
}

function priorityBadgeStyle(priority: string): CSSProperties {
  const base: CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '999px',
    textTransform: 'capitalize',
  }
  switch (priority) {
    case 'high':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    case 'medium':
      return { ...base, backgroundColor: '#fef9c3', color: '#a16207' }
    default:
      return { ...base, backgroundColor: '#f3f4f6', color: '#6b7280' }
  }
}

type InsightsClientProps = {
  dogs: InsightsDogOption[]
}

export default function InsightsClient({ dogs }: InsightsClientProps) {
  const [dogId, setDogId] = useState(dogs[0]?.id ?? '')
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<InsightsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dogName = useMemo(
    () => dogs.find((d) => d.id === dogId)?.name ?? 'your dog',
    [dogs, dogId]
  )

  function generate() {
    setError(null)
    setData(null)
    startTransition(async () => {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dogId }),
      })
      const json = (await res.json().catch(() => null)) as
        | InsightsData
        | { error?: string; message?: string }
        | null

      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json
            ? String((json as { error: string }).error)
            : 'Request failed'
        setError(msg)
        return
      }
      setData(json as InsightsData)
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          👑 AI Health Insights
        </h1>
        <p className="mt-1 text-sm" style={subStyle}>
          Powered by Claude AI — updated on demand
        </p>
      </header>

      {dogs.length > 1 ? (
        <div className="mb-4">
          <label
            htmlFor="insights-dog"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#374151' }}
          >
            Dog
          </label>
          <select
            id="insights-dog"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            value={dogId}
            onChange={(e) => {
              setDogId(e.target.value)
              setData(null)
              setError(null)
            }}
          >
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {dogs.length === 0 ? (
        <p className="text-sm" style={subStyle}>
          Add a dog profile to generate insights.
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={pending || !dogId}
            onClick={generate}
            className="mb-6 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            {pending ? 'Generating…' : 'Generate Health Report'}
          </button>

          {pending ? (
            <div
              className="mb-6 flex flex-col items-center gap-3 rounded-2xl border p-8"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
            >
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-solid border-gray-200 border-t-[#2d7a4f]"
                aria-hidden
              />
              <p className="text-center text-sm font-medium" style={{ color: '#374151' }}>
                🤔 Claude is analyzing {dogName}&apos;s data...
              </p>
            </div>
          ) : null}

          {error ? (
            <div
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {data && !pending ? (
            <div className="flex flex-col gap-5">
              <section style={cardStyle}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
                  Overall score
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    {data.overall_score}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {data.overall_summary}
                  </p>
                </div>
              </section>

              {data.insights.map((ins, i) => (
                <section key={`${ins.title}-${i}`} style={cardStyle}>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span style={categoryBadgeStyle(ins.category)}>{ins.category}</span>
                    <span style={priorityBadgeStyle(ins.priority)}>{ins.priority}</span>
                  </div>
                  <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                    {ins.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={subStyle}>
                    {ins.finding}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-relaxed" style={{ color: GREEN }}>
                    → {ins.recommendation}
                  </p>
                </section>
              ))}

              <section
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: '#f0fdf4',
                  borderColor: '#bbf7d0',
                }}
              >
                <h3 className="mb-3 text-sm font-semibold" style={{ color: '#14532d' }}>
                  ✅ What&apos;s going well
                </h3>
                <ul className="list-inside list-disc space-y-1 text-sm" style={{ color: '#166534' }}>
                  {data.positive_highlights.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              </section>

              <section
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: '#fefce8',
                  borderColor: '#fde047',
                }}
              >
                <h3 className="mb-2 text-sm font-semibold" style={{ color: '#854d0e' }}>
                  🏥 Vet Visit Recommendation
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#713f12' }}>
                  {data.vet_recommendation}
                </p>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
