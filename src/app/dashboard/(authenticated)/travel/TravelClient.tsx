'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'

export type TravelDogOption = {
  id: string
  name: string
}

type TravelPlannerData = {
  summary: string
  health_status_for_travel: string
  urgency_warning: string | null
  required_documents: Array<{
    document: string
    description: string
    timing: string
    mandatory: boolean
    already_have: boolean | null
  }>
  vaccinations: Array<{
    vaccine: string
    required: boolean
    timing: string
    notes: string
    status: 'found_in_records' | 'not_found' | 'unknown'
  }>
  timeline: Array<{
    weeks_before: number
    action: string
    critical: boolean
  }>
  breed_specific: string | null
  estimated_cost: string
  official_resources: string[]
}

const GREEN = '#2d7a4f'

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const POPULAR_DESTINATIONS = ['UK', 'USA', 'France', 'Spain', 'Japan', 'Australia'] as const

function resourceHref(url: string): string {
  const t = url.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `https://${t}`
}

function VaccinationRecordBadge({ status }: { status: string }) {
  if (status === 'found_in_records') {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: '#dcfce7', color: '#166534' }}
      >
        ✅ In your records
      </span>
    )
  }
  if (status === 'not_found') {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
      >
        ⚠️ Not found
      </span>
    )
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
    >
      Unknown
    </span>
  )
}

type TravelClientProps = {
  dogs: TravelDogOption[]
}

export default function TravelClient({ dogs }: TravelClientProps) {
  const [dogId, setDogId] = useState(dogs[0]?.id ?? '')
  const [originCountry, setOriginCountry] = useState('Germany')
  const [destinationCountry, setDestinationCountry] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<TravelPlannerData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const destLabel = destinationCountry.trim() || 'your destination'

  const sortedTimeline = useMemo(() => {
    if (!data?.timeline) return []
    return [...data.timeline].sort((a, b) => b.weeks_before - a.weeks_before)
  }, [data?.timeline])

  function generate() {
    setError(null)
    setData(null)
    const dest = destinationCountry.trim()
    if (!dogId || !dest || !travelDate || !originCountry.trim()) {
      setError('Please fill in dog, origin, destination, and travel date.')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/travel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dogId,
          originCountry: originCountry.trim(),
          destinationCountry: dest,
          travelDate,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | TravelPlannerData
        | { error?: string; message?: string }
        | null

      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'message' in json && json.message
            ? String((json as { message: string }).message)
            : json && typeof json === 'object' && 'error' in json
              ? String((json as { error: string }).error)
              : 'Request failed'
        setError(msg)
        return
      }
      setData(json as TravelPlannerData)
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
        ✈️ Travel Planner
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
        International travel checklist powered by Claude
      </p>

      <div className="mt-6" style={cardStyle}>
        <label className="block text-sm font-medium" style={{ color: '#374151' }}>
          Dog
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={dogId}
          onChange={(e) => setDogId(e.target.value)}
          disabled={dogs.length === 0}
        >
          {dogs.length === 0 ? (
            <option value="">No dogs yet — add a dog first</option>
          ) : (
            dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))
          )}
        </select>

        <label className="mt-4 block text-sm font-medium" style={{ color: '#374151' }}>
          Origin country
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={originCountry}
          onChange={(e) => setOriginCountry(e.target.value)}
          placeholder="Germany"
        />

        <label className="mt-4 block text-sm font-medium" style={{ color: '#374151' }}>
          Destination country
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={destinationCountry}
          onChange={(e) => setDestinationCountry(e.target.value)}
          placeholder="e.g. UK"
          list="travel-destination-suggestions"
        />
        <datalist id="travel-destination-suggestions">
          {POPULAR_DESTINATIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <label className="mt-4 block text-sm font-medium" style={{ color: '#374151' }}>
          Travel date
        </label>
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
        />

        <button
          type="button"
          className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
          disabled={pending || dogs.length === 0}
          onClick={generate}
        >
          Generate Travel Checklist
        </button>
      </div>

      {pending ? (
        <p className="mt-8 text-center text-sm font-medium" style={{ color: '#374151' }}>
          ✈️ Checking travel requirements for {destLabel}...
        </p>
      ) : null}

      {error ? (
        <div
          className="mt-6 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b' }}
        >
          {error}
        </div>
      ) : null}

      {data && !pending ? (
        <div className="mt-8 space-y-6">
          <div
            className="rounded-2xl border border-green-100 p-5"
            style={{ backgroundColor: '#f0fdf4' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#166534' }}>
              {data.summary}
            </p>
            {data.urgency_warning ? (
              <p className="mt-3 text-sm font-medium" style={{ color: '#b91c1c' }}>
                {data.urgency_warning}
              </p>
            ) : null}
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>
              🏃 Travel Fitness Assessment
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#1e40af' }}>
              {data.health_status_for_travel}
            </p>
          </div>

          <div style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
              📋 Required Documents
            </h2>
            <ul className="mt-4 space-y-4">
              {data.required_documents.map((doc, i) => (
                <li key={`${doc.document}-${i}`} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.already_have === true ? (
                      <span className="text-base" aria-label="In your records" title="In your records">
                        ✅
                      </span>
                    ) : null}
                    {doc.already_have === false ? (
                      <span className="text-base" aria-label="Missing" title="Missing">
                        ❌
                      </span>
                    ) : null}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={
                        doc.mandatory
                          ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                          : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      {doc.mandatory ? 'Required' : 'Recommended'}
                    </span>
                    <span className="font-semibold" style={{ color: '#111827' }}>
                      {doc.document}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                    {doc.description}
                  </p>
                  <span
                    className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: '#dcfce7', color: GREEN }}
                  >
                    {doc.timing}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
              💉 Vaccinations
            </h2>
            <ul className="mt-4 space-y-4">
              {data.vaccinations.map((v, i) => (
                <li key={`${v.vaccine}-${i}`} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={
                        v.required
                          ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                          : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      {v.required ? 'Required' : 'Optional'}
                    </span>
                    <span className="font-semibold" style={{ color: '#111827' }}>
                      {v.vaccine}
                    </span>
                    <VaccinationRecordBadge status={v.status} />
                  </div>
                  <p className="mt-1 text-sm" style={{ color: '#374151' }}>
                    {v.timing}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                    {v.notes}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
              📅 Preparation Timeline
            </h2>
            <ul className="mt-4 space-y-4">
              {sortedTimeline.map((t, i) => (
                <li key={`${t.weeks_before}-${i}`} className="flex gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    {t.weeks_before}w
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm" style={{ color: '#111827' }}>
                        {t.action}
                      </p>
                      {t.critical ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                        >
                          Critical
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {data.breed_specific ? (
            <div
              className="rounded-2xl border border-amber-100 p-5"
              style={{ backgroundColor: '#fefce8' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: '#854d0e' }}>
                🐕 Breed-Specific Notes
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: '#713f12' }}>
                {data.breed_specific}
              </p>
            </div>
          ) : null}

          <div style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>
              Estimated cost:{' '}
              <span className="font-normal" style={{ color: '#374151' }}>
                {data.estimated_cost}
              </span>
            </p>
            <h3 className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>
              Official resources
            </h3>
            <ul className="mt-2 space-y-2">
              {data.official_resources.map((url, i) => (
                <li key={`${url}-${i}`}>
                  <a
                    href={resourceHref(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                    style={{ color: GREEN }}
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
