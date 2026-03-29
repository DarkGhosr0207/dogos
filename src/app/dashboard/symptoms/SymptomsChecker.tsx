'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { inputClass } from '@/lib/ui'

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

function triageIcon(level: TriageLevel): string {
  switch (level) {
    case 'emergency':
      return '🚨'
    case 'vet_asap':
      return '⚠️'
    case 'monitor':
      return '👁️'
    case 'ok':
      return '✅'
    default:
      return '•'
  }
}

function triageShellClass(level: TriageLevel): string {
  switch (level) {
    case 'emergency':
      return 'border border-red-200 bg-red-50 rounded-2xl p-5'
    case 'vet_asap':
      return 'border border-amber-200 bg-amber-50 rounded-2xl p-5'
    case 'monitor':
      return 'border border-blue-200 bg-blue-50 rounded-2xl p-5'
    case 'ok':
      return 'border border-[#b8ddc8] bg-[#e8f5ed] rounded-2xl p-5'
    default:
      return 'border border-gray-200 bg-white rounded-2xl p-5'
  }
}

function triageTitleClass(level: TriageLevel): string {
  switch (level) {
    case 'emergency':
      return 'font-bold text-lg text-red-600'
    case 'vet_asap':
      return 'font-bold text-lg text-amber-700'
    case 'monitor':
      return 'font-bold text-lg text-blue-700'
    case 'ok':
      return 'font-bold text-lg text-[#2d7a4f]'
    default:
      return 'font-bold text-lg text-gray-900'
  }
}

type SymptomsCheckerProps = {
  dogs: SymptomDogOption[]
}

const fieldLabelStyle: CSSProperties = {
  color: '#374151',
  fontWeight: 500,
  fontSize: '14px',
  display: 'block',
}

const tagDefaultStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '20px',
  padding: '6px 14px',
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  color: '#374151',
}

const tagSelectedStyle: CSSProperties = {
  border: '1px solid #2d7a4f',
  borderRadius: '20px',
  padding: '6px 14px',
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#dcfce7',
  color: '#166534',
}

const analyzeBtnStyle: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  fontSize: '15px',
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
    <div style={{ color: '#111827' }}>
      <h1
        style={{
          color: '#111827',
          fontSize: '24px',
          fontWeight: 700,
        }}
      >
        AI Symptom Checker
      </h1>
      <p className="mt-1 max-w-2xl" style={{ color: '#6b7280', fontSize: '14px' }}>
        Describe what you&apos;re seeing. This tool suggests how urgently to
        seek care—it does not replace a vet.
      </p>

      <div className="mt-8 max-w-2xl space-y-6">
        <div>
          <label style={fieldLabelStyle} htmlFor="symptom-dog">
            Dog
          </label>
          {dogs.length === 0 ? (
            <p className="mt-2 text-sm text-amber-700">
              No dogs yet. Add a dog under My Dogs first.
            </p>
          ) : (
            <select
              id="symptom-dog"
              value={dogId}
              onChange={(e) => setDogId(e.target.value)}
              className={`mt-2 ${inputClass}`}
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
          <p style={fieldLabelStyle}>Symptoms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = selectedTags.has(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={on ? tagSelectedStyle : tagDefaultStyle}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label style={fieldLabelStyle} htmlFor="symptom-notes">
            Additional description
          </label>
          <textarea
            id="symptom-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Anything else? (behavior, appetite, recent changes…)"
            className={`mt-2 resize-y ${inputClass}`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label style={fieldLabelStyle} htmlFor="symptom-duration">
              Duration
            </label>
            <select
              id="symptom-duration"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value as (typeof DURATION_OPTIONS)[number])
              }
              className={`mt-2 ${inputClass}`}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle} htmlFor="symptom-severity">
              Severity
            </label>
            <select
              id="symptom-severity"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as (typeof SEVERITY_OPTIONS)[number])
              }
              className={`mt-2 ${inputClass}`}
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
          <p className="text-sm text-red-500" role="alert">
            {analyzeError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void analyze()}
          disabled={analyzeLoading || dogs.length === 0 || !dogId}
          className="mt-4 disabled:opacity-50"
          style={analyzeBtnStyle}
        >
          {analyzeLoading ? 'Analyzing…' : 'Analyze'}
        </button>

        {analyzeLoading ? (
          <p className="flex items-center gap-2 text-sm text-[#2d7a4f]">
            <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-[#2d7a4f]/40" />
            Working…
          </p>
        ) : null}
      </div>

      {result ? (
        <div className={`mt-10 max-w-2xl ${triageShellClass(result.triage_level)}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden>
              {triageIcon(result.triage_level)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {result.triage_level.replace('_', ' ')}
              </p>
              <h2 className={`mt-1 leading-snug ${triageTitleClass(result.triage_level)}`}>
                {result.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {result.explanation}
              </p>
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                {result.actions.map((item) => (
                  <p key={item}>→ {item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-10 max-w-2xl text-xs text-gray-400">
        This is not a veterinary diagnosis. Always consult a licensed vet.
      </p>
    </div>
  )
}
