'use client'

import { useMemo, useState } from 'react'

const TAGS = [
  'Vomiting',
  'Not eating',
  'Lethargy',
  'Limping',
  'Coughing',
  'Diarrhea',
  'Scratching',
] as const

const DURATION_OPTIONS = ['Today', '1-3 days', '1 week+'] as const
const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'] as const

type TriageLevel = 'emergency' | 'vet_asap' | 'monitor' | 'ok'

type TriageResult = {
  triage_level: TriageLevel
  title: string
  explanation: string
  actions: string[]
}

export type SymptomDogOption = {
  id: string
  name: string
}

function triageCardClasses(level: TriageLevel): string {
  switch (level) {
    case 'emergency':
      return 'border-red-500/40 bg-red-950/70 text-red-50'
    case 'vet_asap':
      return 'border-amber-500/40 bg-amber-950/60 text-amber-50'
    case 'monitor':
      return 'border-yellow-500/35 bg-yellow-950/50 text-yellow-50'
    case 'ok':
      return 'border-emerald-500/35 bg-emerald-950/55 text-emerald-50'
    default:
      return 'border-white/10 bg-neutral-900/60'
  }
}

type SymptomsCheckerProps = {
  dogs: SymptomDogOption[]
}

export default function SymptomsChecker({ dogs }: SymptomsCheckerProps) {
  const [dogId, setDogId] = useState(() => dogs[0]?.id ?? '')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set()
  )
  const [notes, setNotes] = useState('')
  const [duration, setDuration] =
    useState<(typeof DURATION_OPTIONS)[number]>('Today')
  const [severity, setSeverity] =
    useState<(typeof SEVERITY_OPTIONS)[number]>('Mild')

  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [result, setResult] = useState<TriageResult | null>(null)

  const symptomsText = useMemo(() => {
    const parts: string[] = TAGS.filter((t) => selectedTags.has(t))
    const extra = notes.trim()
    if (extra) parts.push(extra)
    return parts.join(', ')
  }, [notes, selectedTags])

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  async function analyze() {
    setAnalyzeError(null)
    setResult(null)

    if (!dogId) {
      setAnalyzeError('Select a dog.')
      return
    }
    if (!symptomsText.trim()) {
      setAnalyzeError('Select at least one symptom or add a description.')
      return
    }

    setAnalyzeLoading(true)
    try {
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dogId,
          symptoms: symptomsText,
          duration,
          severity,
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
        setAnalyzeError(msg)
        return
      }

      if (
        data &&
        typeof data === 'object' &&
        'triage_level' in data &&
        'title' in data &&
        'explanation' in data &&
        'actions' in data
      ) {
        setResult(data as TriageResult)
      } else {
        setAnalyzeError('Unexpected response from server.')
      }
    } catch {
      setAnalyzeError('Network error. Try again.')
    } finally {
      setAnalyzeLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        AI Symptom Checker
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-400">
        Describe what you&apos;re seeing. This tool suggests how urgently to
        seek care—it does not replace a vet.
      </p>

      <div className="mt-8 max-w-2xl space-y-6">
        <div>
          <label
            htmlFor="symptom-dog"
            className="block text-sm font-medium text-neutral-300"
          >
            Dog
          </label>
          {dogs.length === 0 ? (
            <p className="mt-2 text-sm text-amber-300/90">
              No dogs yet. Add a dog under My Dogs first.
            </p>
          ) : (
            <select
              id="symptom-dog"
              value={dogId}
              onChange={(e) => setDogId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-300">Symptoms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = selectedTags.has(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? 'border-white/25 bg-white/15 text-white'
                      : 'border-white/10 bg-neutral-950/40 text-neutral-400 hover:border-white/15 hover:text-neutral-200'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="symptom-notes"
            className="block text-sm font-medium text-neutral-300"
          >
            Additional description
          </label>
          <textarea
            id="symptom-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Anything else? (behavior, appetite, recent changes…)"
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="symptom-duration"
              className="block text-sm font-medium text-neutral-300"
            >
              Duration
            </label>
            <select
              id="symptom-duration"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value as (typeof DURATION_OPTIONS)[number])
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="symptom-severity"
              className="block text-sm font-medium text-neutral-300"
            >
              Severity
            </label>
            <select
              id="symptom-severity"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as (typeof SEVERITY_OPTIONS)[number])
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {analyzeError ? (
          <p className="text-sm text-red-400" role="alert">
            {analyzeError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void analyze()}
          disabled={analyzeLoading || dogs.length === 0 || !dogId}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
        >
          {analyzeLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {result ? (
        <div
          className={`mt-10 max-w-2xl rounded-xl border p-5 ${triageCardClasses(result.triage_level)}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {result.triage_level.replace('_', ' ')}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{result.title}</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-95">
            {result.explanation}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm opacity-95">
            {result.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-10 max-w-2xl text-xs text-neutral-500">
        This is not a veterinary diagnosis. Always consult a licensed vet.
      </p>
    </div>
  )
}
